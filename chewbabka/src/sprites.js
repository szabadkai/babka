// Sprites: betölti a chew-babka.com grafikáit, és kész, rajzolható képeket ad.
// Interfész: Sprites.load(done) után Sprites.get(név), .raisin, .ring, .falcon, .heart
const Sprites = (() => {
  const FILES = ['player', 'armchair', 'csoki', 'dio', 'makos', 'pisztacia', 'logo', 'falcon', 'heart'];
  const imgs = {};
  const api = { load, get: (n) => imgs[n] };

  function load(done) {
    let left = FILES.length;
    for (const name of FILES) {
      const im = new Image();
      im.onload = im.onerror = () => { if (--left === 0) { bake(); done(); } };
      im.src = 'assets/' + name + '.png';
      imgs[name] = im;
    }
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // A krémszínű rajzok (sólyom, szív) átszínezése csokibarnára.
  function tint(img, w, h) {
    const c = canvas(w, h), ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = CFG.INK;
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  // Mazsola: ráncos, morcos kis gonosz — kézzel rajzolva, a firka-stílusban.
  function makeRaisin() {
    const S = 72, c = canvas(S, S), ctx = c.getContext('2d');
    const cx = S / 2, cy = S / 2 + 2, bumps = 11;
    ctx.fillStyle = CFG.INK;
    ctx.beginPath();
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * Math.PI * 2;
      const wob = 1 + 0.16 * Math.sin(i * 2.7 + 1) + 0.07 * Math.sin(i * 5.1);
      const x = cx + Math.cos(a) * 24 * wob;
      const y = cy + Math.sin(a) * 19 * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // ráncok
    ctx.strokeStyle = CFG.CREAM;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[14, 44, 22, 50], [50, 46, 58, 40], [30, 54, 40, 55]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, y2 + 3, x2, y2); ctx.stroke();
    }
    // morcos szemöldök-szemek és lebiggyedt száj
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(22, 26); ctx.lineTo(31, 31); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, 26); ctx.lineTo(41, 31); ctx.stroke();
    ctx.beginPath(); ctx.arc(36, 46, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    return c;
  }

  // Girbegurba firka-karika a hulló korongok köré, pár morzsával.
  function makeRing() {
    const S = 84, c = canvas(S, S), ctx = c.getContext('2d');
    const cx = S / 2, cy = S / 2, segs = 28;
    ctx.strokeStyle = CFG.INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const r = 33 + 1.6 * Math.sin(i * 1.9) + 1.1 * Math.sin(i * 3.7 + 2);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = CFG.INK;
    for (const [x, y, r] of [[8, 18, 2], [76, 30, 1.6], [14, 66, 1.8], [70, 70, 2.2]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return c;
  }

  function bake() {
    api.raisin = makeRaisin();
    api.ring = makeRing();
    api.falcon = tint(imgs.falcon, 346, 73);
    api.heart = tint(imgs.heart, 42, 33);
  }

  return api;
})();
