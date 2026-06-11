// All gameplay tuning lives here — the entire feel of the game is a pass over
// this file. Units: px, seconds, radians. "Per step" factors assume the fixed
// 60 Hz physics step.
export const CFG = {
  VIEW_W: 960,
  VIEW_H: 600,
  STEP: 1 / 60,

  // Car handling
  ACCEL: 480,
  BRAKE_DECEL: 760,
  REVERSE_ACCEL: 300,
  MAX_SPEED: 560,
  MAX_REVERSE: 170,
  DRAG: 0.995,             // forward velocity kept per step
  STEER_RATE: 3.2,         // rad/s at full lock
  STEER_SPEED_REF: 130,    // speed at which steering reaches full authority
  GRIP_ROAD: 0.86,         // lateral velocity kept per step (higher = driftier)
  GRIP_GRASS: 0.95,
  GRASS_MAX_FACTOR: 0.45,  // grass top speed as a fraction of MAX_SPEED
  GRASS_SLOW: 0.96,        // per-step decel while above grass top speed
  DRIFT_LAT: 90,           // |lateral speed| that counts as drifting
  DRIFT_MIN_SPEED: 150,
  CAR_RADIUS: 16,
  BUMP_ELASTICITY: 0.5,

  // Track geometry
  SAMPLE_SPACING: 12,      // px between centerline samples
  EDGE_TOLERANCE: 9,       // rumble strips still count as road
  CHECKPOINTS: 8,
  CHECKPOINT_WINDOW: 6,    // samples of slack when passing a checkpoint

  // AI drivers
  AI_COUNT: 4,
  AI_STEER_GAIN: 2.6,
  AI_CORNER_ACCEL: 850,    // comfortable lateral accel -> corner target speeds
  AI_MIN_CORNER_SPEED: 150,
  AI_BRAKE_REACH: 600,     // decel assumed when smoothing target speeds backward
  AI_RUBBER_GAIN: 0.00004, // speed factor per px of gap to the player
  AI_RUBBER_MIN: 0.92,
  AI_RUBBER_MAX: 1.12,

  // Camera & juice
  CAM_SMOOTH: 0.92,        // per-step retention toward the follow target
  CAM_LOOKAHEAD: 0.35,     // seconds of velocity to look ahead
  CAM_LOOKAHEAD_MAX: 150,
  SHAKE_DECAY: 0.88,

  COUNTDOWN: 3.5,
  LAPS: 3,
};

export const PLAYER = { name: 'You', color: '#ff5252' };

export const RIVALS = [
  { name: 'Bolt', color: '#448aff' },
  { name: 'Ziggy', color: '#ffd740' },
  { name: 'Nori', color: '#b388ff' },
  { name: 'Pip', color: '#69f0ae' },
];
