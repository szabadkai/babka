// Keyboard -> game controls. Held keys make the analog-ish driving controls;
// one-shot presses drive menus and state changes. setOverride lets the debug
// hooks steer the car programmatically.
const held = new Set();
const pressed = new Set();
let override = null;
let firstGesture = null;

const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

export function initInput(onFirstGesture) {
  firstGesture = onFirstGesture;
  window.addEventListener('keydown', (e) => {
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
    if (firstGesture) {
      firstGesture();
      firstGesture = null;
    }
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
}

const any = (...codes) => codes.some((c) => held.has(c));

export function getControls() {
  if (override) return { ...override };
  return {
    throttle: (any('ArrowUp', 'KeyW') ? 1 : 0) - (any('ArrowDown', 'KeyS') ? 1 : 0),
    steer: (any('ArrowRight', 'KeyD') ? 1 : 0) - (any('ArrowLeft', 'KeyA') ? 1 : 0),
  };
}

// True once per physical key press; consuming clears it.
export function wasPressed(...codes) {
  const hit = codes.some((c) => pressed.has(c));
  if (hit) codes.forEach((c) => pressed.delete(c));
  return hit;
}

// Called once per frame after the update steps so unconsumed presses
// don't leak into later states.
export function endFrame() {
  pressed.clear();
}

export function setOverride(throttle, steer) {
  override = { throttle, steer };
}

export function clearOverride() {
  override = null;
}
