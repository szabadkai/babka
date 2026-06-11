// UI: a három játék közös vászon-, hang-, részecske- és firka-elemei.
// Interfész: canvas/view, paper, text, blink, beep/toggleMute, burst/particles,
// wobblyRect, logo, overScreen — minden márkastílus-rajzolás egy helyen.
const UI = (() => {
  const { W, H, INK, CREAM } = CFG;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let ctx, view = 1;

  function canvas(cv) {
    ctx = cv.getContext('2d');
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      view = Math.min(innerWidth / W, innerHeight / H);
      cv.width = Math.round(W * view * dpr);
      cv.height = Math.round(H * view * dpr);
      cv.style.width = W * view + 'px';
      cv.style.height = H * view + 'px';
      ctx.setTransform(view * dpr, 0, 0, view * dpr, 0, 0);
    };
    fit();
    addEventListener('resize', fit);
    return ctx;
  }

  let ac, muted = false;
  function beep(freq, dur, type, vol = 0.12) {
    if (muted) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  }

  // krémszín háttér elszórt pöttyökkel
  const specks = Array.from({ length: 55 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(1, 2.4) }));
  function paper() {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.07;
    for (const s of specks) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, px, align = 'center', alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = INK;
    ctx.font = `${px}px 'Patrick Hand', cursive`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1;
  }

  const blink = (now) => 0.5 + 0.5 * Math.abs(Math.sin(now * 2.2));

  // morzsa-részecskék
  const parts = [];
  function burst(x, y, n) {
    for (let i = 0; i < n; i++)
      parts.push({ x, y, vx: rnd(-130, 130), vy: rnd(-220, -40), r: rnd(1.5, 3.4), life: rnd(0.4, 0.8) });
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 550 * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
  function drawParts() {
    ctx.fillStyle = INK;
    for (const p of parts) {
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // girbegurba keret (tábla, fal)
  function wobblyRect(x0, y0, bw, bh) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const per = 2 * (bw + bh);
    for (let i = 0; i <= 120; i++) {
      const d = (i / 120) * per;
      let x, y;
      if (d < bw) { x = x0 + d; y = y0; }
      else if (d < bw + bh) { x = x0 + bw; y = y0 + d - bw; }
      else if (d < 2 * bw + bh) { x = x0 + 2 * bw + bh - d; y = y0 + bh; }
      else { x = x0; y = y0 + per - d; }
      ctx.lineTo(x + Math.sin(d * 0.08) * 1.8, y + Math.cos(d * 0.06) * 1.8);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function logo(y = 30, w = 430) {
    const img = Sprites.get('logo');
    ctx.drawImage(img, W / 2 - w / 2, y, w, w * (img.height / img.width));
  }

  // közös "vége" képernyő: fotelos babka + cím a pontszám alapján
  function overScreen(now, sub, stats, score) {
    const arm = Sprites.get('armchair');
    ctx.drawImage(arm, W / 2 - 85, 96, 170, 170 * (arm.height / arm.width));
    text(sub, W / 2, 410, 30, 'center', 0.75);
    text('te vagy:', W / 2, 466, 24);
    text(CFG.TITLES.find(([min]) => score >= min)[1], W / 2, 516, 52);
    text(stats, W / 2, 570, 24, 'center', 0.8);
    text('SPACE vagy katt — újra!', W / 2, 660, 28, 'center', blink(now));
  }

  return {
    canvas, view: () => view, rnd, beep,
    toggleMute: () => (muted = !muted), isMuted: () => muted,
    paper, text, blink, burst, updateParts, drawParts, wobblyRect, logo, overScreen,
  };
})();
