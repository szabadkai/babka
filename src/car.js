import { CFG } from './config.js';
import { TAU, clamp, rand } from './util.js';

// A car is a point with a heading, but its velocity is tracked in car space:
// forward speed obeys throttle/drag, lateral speed decays by a grip factor.
// How loosely heading and travel direction couple IS the drift model — one
// constant (GRIP_*) sets the whole feel.
export class Car {
  constructor({ x, y, heading, name, color, isPlayer = false }) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.vx = 0;
    this.vy = 0;
    this.throttle = 0;
    this.steer = 0;
    this.latSpeed = 0;
    this.onRoad = true;
    this.drifting = false;
    this.trackIndex = 0; // warm hint for Track.nearest, maintained by the race
    this.name = name;
    this.color = color;
    this.isPlayer = isPlayer;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  forwardSpeed() {
    return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading);
  }

  update(dt, onRoad) {
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    let vF = this.vx * cos + this.vy * sin;
    let vLat = -this.vx * sin + this.vy * cos;

    if (this.throttle > 0) {
      vF += this.throttle * CFG.ACCEL * dt;
    } else if (this.throttle < 0) {
      const decel = vF > 0 ? CFG.BRAKE_DECEL : CFG.REVERSE_ACCEL;
      vF = Math.max(vF + this.throttle * decel * dt, -CFG.MAX_REVERSE);
    }

    // No steering when stopped, full authority by low-mid speed, flipped in reverse.
    const authority = clamp(Math.abs(vF) / CFG.STEER_SPEED_REF, 0, 1) * Math.sign(vF);
    this.heading += this.steer * CFG.STEER_RATE * authority * dt;

    vLat *= onRoad ? CFG.GRIP_ROAD : CFG.GRIP_GRASS;
    vF *= CFG.DRAG;
    if (onRoad) vF = Math.min(vF, CFG.MAX_SPEED);
    else if (Math.abs(vF) > CFG.MAX_SPEED * CFG.GRASS_MAX_FACTOR) vF *= CFG.GRASS_SLOW;

    this.vx = vF * cos - vLat * sin;
    this.vy = vF * sin + vLat * cos;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.latSpeed = vLat;
    this.onRoad = onRoad;
    this.drifting = Math.abs(vLat) > CFG.DRIFT_LAT && this.speed > CFG.DRIFT_MIN_SPEED;
  }

  rearWheels() {
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    return [[-13, -9], [-13, 9]].map(([lx, ly]) => ({
      x: this.x + lx * cos - ly * sin,
      y: this.y + lx * sin + ly * cos,
    }));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 21, 14, this.heading, 0, TAU);
    ctx.fill();
    ctx.rotate(this.heading);
    ctx.fillStyle = '#26262c';
    for (const tx of [-15, 8]) {
      ctx.fillRect(tx, -13, 7, 5);
      ctx.fillRect(tx, 8, 7, 5);
    }
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-20, -11, 40, 22, 7);
    ctx.fill();
    if (this.isPlayer) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
    }
    ctx.fillStyle = shade(this.color, -0.35);
    ctx.beginPath();
    ctx.roundRect(-10, -7, 15, 14, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(4, -6, 3, 12);
    ctx.restore();
  }
}

// Equal-mass circle collision: separate the pair and trade a damped impulse.
// Returns the closing speed (0 when not colliding) so the caller can decide
// on shake/sparks/thuds.
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const minD = CFG.CAR_RADIUS * 2;
  if (d >= minD || d === 0) return 0;

  const nx = dx / d;
  const ny = dy / d;
  const push = (minD - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;

  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (closing <= 0) return 0;
  const impulse = (closing * (1 + CFG.BUMP_ELASTICITY)) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
  a.heading += rand(-0.04, 0.04);
  b.heading += rand(-0.04, 0.04);
  return closing;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => {
    const c = (n >> shift) & 0xff;
    return Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
