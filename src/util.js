export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export const lerp = (a, b, t) => a + (b - a) * t;

export const rand = (a, b) => a + Math.random() * (b - a);

export function wrapAngle(a) {
  return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

// Seconds -> "1:23.45"
export function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
}

export function ordinal(n) {
  const suffix = n % 100 >= 11 && n % 100 <= 13
    ? 'th'
    : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}
