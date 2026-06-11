import { CFG } from './config.js';
import { TAU, clamp, rand, wrapAngle } from './util.js';

// The competitive layer on top of car physics. RaceManager turns driving into
// a race: ordered checkpoints make laps cheat-proof, arc-length progress makes
// live standings, finish times make results. AIController makes the rival
// cars drive the same physics toward the same checkpoints, each with its own
// personality and a quiet rubber-band that keeps races close.

export class RaceManager {
  constructor(track, cars) {
    this.track = track;
    this.cars = cars;
    this.time = 0;
    this.entries = cars.map((car, i) => ({
      car,
      lap: 1,
      nextCp: 1, // checkpoint 0 is the start line; it only counts after 1..7
      lapStart: 0,
      lapTimes: [],
      bestLap: null,
      progress: 0,
      finished: false,
      finishTime: null,
      rank: i + 1,
    }));
    this.byCar = new Map(this.entries.map((e) => [e.car, e]));
    this.standings = [...this.entries];
  }

  update(dt) {
    this.time += dt;
    for (const e of this.entries) this.updateEntry(e);
    this.standings = [...this.entries].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return b.progress - a.progress;
    });
    this.standings.forEach((e, i) => (e.rank = i + 1));
  }

  updateEntry(e) {
    const { track } = this;
    const near = track.nearest(e.car.x, e.car.y, e.car.trackIndex);
    e.car.trackIndex = near.index;

    if (!e.finished) {
      const cp = track.checkpoints[e.nextCp];
      const onOrNearRoad = near.dist < track.width * 1.5; // infield shortcuts don't count
      if (track.indexGap(near.index, cp) <= CFG.CHECKPOINT_WINDOW && onOrNearRoad) {
        if (e.nextCp === 0) this.completeLap(e);
        e.nextCp = (e.nextCp + 1) % track.checkpoints.length;
      }
    }

    // Progress for ranking. Cars behind the line that haven't taken
    // checkpoint 1 yet (grid start, or backing up) count as negative.
    let lapDist = track.progressAt(near.index);
    if (e.nextCp === 1 && lapDist > track.total * 0.5) lapDist -= track.total;
    e.progress = (e.lap - 1) * track.total + lapDist;
  }

  completeLap(e) {
    const t = this.time - e.lapStart;
    e.lapTimes.push(t);
    e.bestLap = e.bestLap === null ? t : Math.min(e.bestLap, t);
    e.lapStart = this.time;
    if (e.lap >= this.track.laps) {
      e.finished = true;
      e.finishTime = this.time;
    } else {
      e.lap++;
    }
  }

  playerEntry() {
    return this.entries.find((e) => e.car.isPlayer);
  }
}

export class AIController {
  constructor(car, track) {
    this.car = car;
    this.track = track;
    this.skill = rand(0.88, 1.0);
    this.lookAhead = Math.round(rand(14, 22));
    this.line = rand(-0.3, 0.3); // preferred offset from the centerline
    this.wobbleFreq = rand(0.04, 0.1) * TAU;
    this.wobblePhase = rand(0, TAU);
    this.t = rand(0, 100);
    this.stuckFor = 0;
    this.reverseFor = 0;
    this.reverseSteer = 1;
  }

  update(dt, entry, playerProgress, allCars) {
    const { car, track } = this;
    this.t += dt;

    if (this.reverseFor > 0) {
      this.reverseFor -= dt;
      car.throttle = -1;
      car.steer = this.reverseSteer;
      return;
    }
    if (car.speed < 30) {
      this.stuckFor += dt;
      if (this.stuckFor > 1.5) {
        this.reverseFor = 0.9;
        this.reverseSteer = Math.random() < 0.5 ? -1 : 1;
        this.stuckFor = 0;
      }
    } else {
      this.stuckFor = 0;
    }

    // Aim at a point ahead on the centerline, offset by a personal, slowly
    // wandering racing line, nudged away from any car just ahead.
    let lateral =
      (this.line + 0.25 * Math.sin(this.t * this.wobbleFreq + this.wobblePhase)) *
      track.width * 0.3;
    const fx = Math.cos(car.heading);
    const fy = Math.sin(car.heading);
    for (const other of allCars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const d = Math.hypot(dx, dy);
      if (d > 80 || d === 0 || (dx * fx + dy * fy) / d < 0.5) continue;
      lateral -= (Math.sign(dx * -fy + dy * fx) || 1) * 30;
    }

    const aimIndex = car.trackIndex + this.lookAhead;
    const p = track.point(aimIndex);
    const r = track.rightAt(aimIndex);
    const err = wrapAngle(
      Math.atan2(p.y + r.y * lateral - car.y, p.x + r.x * lateral - car.x) - car.heading,
    );
    car.steer = clamp(err * CFG.AI_STEER_GAIN, -1, 1);

    const rubber = clamp(
      1 + (playerProgress - entry.progress) * CFG.AI_RUBBER_GAIN,
      CFG.AI_RUBBER_MIN,
      CFG.AI_RUBBER_MAX,
    );
    const want =
      track.targetSpeedAt(car.trackIndex + 6) * this.skill * (entry.finished ? 0.6 : rubber);
    car.throttle = clamp((want - car.forwardSpeed()) / 80, -1, 1);
  }
}
