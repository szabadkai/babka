import { CFG } from './config.js';
import { TAU, clamp, lerp, wrapAngle, rand } from './util.js';

// A track is a closed centerline resampled at even spacing. That one array of
// samples answers every question the game asks: where the road is (distance
// to the nearest sample), how far around a car has driven (arc length), where
// the AI should aim (samples ahead) and how fast it dares go there
// (precomputed corner speeds), and which checkpoints order a lap. The visual
// is pre-rendered once to an offscreen canvas and blitted per frame.
export class Track {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.width = def.width;
    this.laps = def.laps ?? CFG.LAPS;
    this.samples = buildSamples(def.points);
    this.total = this.samples.length * CFG.SAMPLE_SPACING;
    computeTargetSpeeds(this.samples);
    const n = this.samples.length;
    this.checkpoints = Array.from(
      { length: CFG.CHECKPOINTS },
      (_, i) => Math.round((i * n) / CFG.CHECKPOINTS),
    );
    this.world = computeBounds(this.samples, def.width);
    this.image = prerender(this);
  }

  // Nearest centerline sample. With a hint (a car's last index) only a small
  // window is scanned, which is both fast and keeps cars "attached" to their
  // own leg of the road where two legs run close together.
  nearest(x, y, hint = null) {
    const m = this.samples.length;
    let best = 0;
    let bestD2 = Infinity;
    const scan = (i) => {
      const s = this.samples[i];
      const d2 = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    };
    if (hint === null) for (let i = 0; i < m; i++) scan(i);
    else for (let di = -15; di <= 15; di++) scan(((hint + di) % m + m) % m);
    return { index: best, dist: Math.sqrt(bestD2) };
  }

  isOnRoad(distToCenter) {
    return distToCenter <= this.width / 2 + CFG.EDGE_TOLERANCE;
  }

  point(i) {
    const m = this.samples.length;
    return this.samples[((i % m) + m) % m];
  }

  rightAt(i) {
    const h = this.point(i).heading;
    return { x: -Math.sin(h), y: Math.cos(h) };
  }

  targetSpeedAt(i) {
    return this.point(i).targetSpeed;
  }

  progressAt(i) {
    return this.point(i).dist;
  }

  // Circular distance between two sample indices.
  indexGap(a, b) {
    const m = this.samples.length;
    const d = Math.abs(a - b) % m;
    return Math.min(d, m - d);
  }

  // Two-wide grid behind the start line, slot 0 at pole.
  startingGrid(count) {
    const m = this.samples.length;
    const out = [];
    for (let k = 0; k < count; k++) {
      const back = 50 + Math.floor(k / 2) * 55;
      const side = (k % 2 === 0 ? -1 : 1) * this.width * 0.22;
      const i = (m - Math.round(back / CFG.SAMPLE_SPACING)) % m;
      const s = this.samples[i];
      const r = this.rightAt(i);
      out.push({ x: s.x + r.x * side, y: s.y + r.y * side, heading: s.heading, index: i });
    }
    return out;
  }

  draw(ctx) {
    ctx.drawImage(this.image, this.world.x, this.world.y);
  }

  drawMinimap(ctx, x, y, w, h, cars = []) {
    const sc = Math.min(w / this.world.w, h / this.world.h);
    const ox = x + (w - this.world.w * sc) / 2 - this.world.x * sc;
    const oy = y + (h - this.world.h * sc) / 2 - this.world.y * sc;
    ctx.save();
    ctx.beginPath();
    this.samples.forEach((s, i) => ctx[i ? 'lineTo' : 'moveTo'](ox + s.x * sc, oy + s.y * sc));
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    for (const car of cars) {
      ctx.beginPath();
      ctx.arc(ox + car.x * sc, oy + car.y * sc, car.isPlayer ? 4.5 : 3, 0, TAU);
      ctx.fillStyle = car.color;
      ctx.fill();
      if (car.isPlayer) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const at = (a, b, c, d) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
  return [at(p0[0], p1[0], p2[0], p3[0]), at(p0[1], p1[1], p2[1], p3[1])];
}

// Control points -> dense closed spline -> samples at even arc-length spacing,
// annotated with heading, smoothed curvature, and cumulative distance.
function buildSamples(points) {
  const n = points.length;
  const dense = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map((o) => points[(i + o + n) % n]);
    for (let s = 0; s < 24; s++) dense.push(catmullRom(p0, p1, p2, p3, s / 24));
  }

  const pts = [{ x: dense[0][0], y: dense[0][1] }];
  let acc = 0;
  let prev = dense[0];
  for (let i = 1; i <= dense.length; i++) {
    const cur = dense[i % dense.length];
    let segLen = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    while (acc + segLen >= CFG.SAMPLE_SPACING) {
      const t = (CFG.SAMPLE_SPACING - acc) / segLen;
      const x = lerp(prev[0], cur[0], t);
      const y = lerp(prev[1], cur[1], t);
      pts.push({ x, y });
      prev = [x, y];
      segLen = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      acc = 0;
    }
    acc += segLen;
    prev = cur;
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - first.x, last.y - first.y) < CFG.SAMPLE_SPACING * 0.5) pts.pop();

  const m = pts.length;
  for (let i = 0; i < m; i++) {
    const before = pts[(i + m - 1) % m];
    const after = pts[(i + 1) % m];
    pts[i].heading = Math.atan2(after.y - before.y, after.x - before.x);
    pts[i].dist = i * CFG.SAMPLE_SPACING;
  }
  for (let i = 0; i < m; i++) {
    const after = pts[(i + 1) % m];
    pts[i].rawCurv = Math.abs(wrapAngle(after.heading - pts[i].heading)) / CFG.SAMPLE_SPACING;
  }
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let o = -2; o <= 2; o++) sum += pts[(i + o + m) % m].rawCurv;
    pts[i].curvature = sum / 5;
  }
  return pts;
}

// Corner speed from curvature (v = sqrt(a/k)), then swept backward so the AI
// starts braking before a corner rather than inside it.
function computeTargetSpeeds(samples) {
  const m = samples.length;
  for (const s of samples) {
    s.targetSpeed = clamp(
      Math.sqrt(CFG.AI_CORNER_ACCEL / Math.max(s.curvature, 1e-5)),
      CFG.AI_MIN_CORNER_SPEED,
      CFG.MAX_SPEED,
    );
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = m - 1; i >= 0; i--) {
      const next = samples[(i + 1) % m];
      const reachable = Math.sqrt(next.targetSpeed ** 2 + 2 * CFG.AI_BRAKE_REACH * CFG.SAMPLE_SPACING);
      samples[i].targetSpeed = Math.min(samples[i].targetSpeed, reachable);
    }
  }
}

function computeBounds(samples, width) {
  const margin = width + 260;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of samples) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }
  return {
    x: Math.floor(minX - margin),
    y: Math.floor(minY - margin),
    w: Math.ceil(maxX - minX + margin * 2),
    h: Math.ceil(maxY - minY + margin * 2),
  };
}

function prerender(track) {
  const { world, def } = track;
  const canvas = document.createElement('canvas');
  canvas.width = world.w;
  canvas.height = world.h;
  const g = canvas.getContext('2d');
  g.translate(-world.x, -world.y);

  g.fillStyle = def.colors.grass;
  g.fillRect(world.x, world.y, world.w, world.h);
  for (let i = (world.w * world.h) / 2600; i > 0; i--) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect(world.x + Math.random() * world.w, world.y + Math.random() * world.h, 3, 3);
  }

  const path = new Path2D();
  track.samples.forEach((s, i) => (i ? path.lineTo(s.x, s.y) : path.moveTo(s.x, s.y)));
  path.closePath();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = track.width + 16;
  g.strokeStyle = '#f2f2f2';
  g.stroke(path);
  g.setLineDash([26, 26]);
  g.strokeStyle = '#e84545';
  g.stroke(path);
  g.setLineDash([]);
  g.lineWidth = track.width;
  g.strokeStyle = def.colors.road;
  g.stroke(path);
  g.setLineDash([26, 38]);
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.stroke(path);
  g.setLineDash([]);

  drawStartLine(g, track);
  drawTrees(g, track);
  return canvas;
}

function drawStartLine(g, track) {
  const s0 = track.samples[0];
  g.save();
  g.translate(s0.x, s0.y);
  g.rotate(s0.heading);
  const cell = track.width / 8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 2; col++) {
      g.fillStyle = (row + col) % 2 ? '#16161a' : '#f5f5f5';
      g.fillRect(-9 + col * 9, -track.width / 2 + row * cell, 9, cell);
    }
  }
  g.restore();
}

function drawTrees(g, track) {
  const { world } = track;
  let placed = 0;
  for (let tries = 0; placed < 42 && tries < 4000; tries++) {
    const x = rand(world.x + 40, world.x + world.w - 40);
    const y = rand(world.y + 40, world.y + world.h - 40);
    if (track.nearest(x, y).dist < track.width / 2 + 70) continue;
    const r = rand(14, 26);
    const dot = (cx, cy, cr, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(cx, cy, cr, 0, TAU);
      g.fill();
    };
    dot(x + 5, y + 6, r, 'rgba(0,0,0,0.18)');
    dot(x, y, r, '#2c7a36');
    dot(x - r * 0.25, y - r * 0.25, r * 0.62, '#3c9a46');
    placed++;
  }
}
