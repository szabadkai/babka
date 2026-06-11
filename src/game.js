// Töltelékzápor: a teljes játékmenet — állapotgép (cím / játék / vége), bemenet, fizika.
(() => {
  const ctx = UI.canvas(document.getElementById('game'));
  const { W, H, INK, COPY } = CFG;
  const { rnd, text, beep } = UI;

  // ---- állapot ----
  let mode = 'title', paused = false;
  let score, lives, combo, elapsed, spawnIn, falconIn, falcon, shake, flash;
  let items = [];
  let best = +(localStorage.getItem('chewbabka-best') || 0);
  const player = { x: W / 2, tx: W / 2, face: 1, step: 0 };

  const ramp = ([a, b]) => a + (b - a) * Math.min(1, elapsed / CFG.RAMP_S);
  const mult = () => Math.min(CFG.COMBO_MAX, 1 + Math.floor(combo / CFG.COMBO_STEP));

  function reset() {
    score = 0; lives = CFG.LIVES; combo = 0; elapsed = 0;
    spawnIn = 0.7; falcon = null; falconIn = rnd(...CFG.FALCON_S);
    items = []; shake = 0; flash = 0;
    player.x = player.tx = W / 2;
  }

  // ---- bemenet ----
  const keys = {};
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') { e.preventDefault(); action(); }
    if (e.code === 'KeyM') UI.toggleMute();
    if (e.code === 'KeyP' && mode === 'play') paused = !paused;
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  const cv = document.getElementById('game');
  cv.addEventListener('pointermove', (e) => {
    player.tx = (e.clientX - cv.getBoundingClientRect().left) / UI.view();
  });
  cv.addEventListener('pointerdown', (e) => {
    player.tx = (e.clientX - cv.getBoundingClientRect().left) / UI.view();
    if (mode !== 'play') action();
  });
  function action() {
    if (mode === 'play') return;
    reset();
    mode = 'play';
    beep(523, 0.1, 'triangle');
  }

  // ---- játéklogika ----
  function spawn(x, forceKey) {
    let pick = CFG.ITEMS.find((i) => i.key === forceKey);
    if (!pick) {
      let t = Math.random() * CFG.ITEMS.reduce((s, i) => s + i.weight, 0);
      pick = CFG.ITEMS.find((i) => (t -= i.weight) <= 0) || CFG.ITEMS[0];
    }
    items.push({
      def: pick, x: x ?? rnd(36, W - 36), y: -40,
      vy: ramp(CFG.FALL) * rnd(0.85, 1.15), seed: rnd(0, 7), t: 0,
    });
  }

  function onCatch(it) {
    if (it.def.bad) {
      lives--; combo = 0; shake = 9; flash = 0.25;
      beep(110, 0.3, 'sawtooth', 0.18);
      UI.burst(it.x, it.y, 10);
      if (lives <= 0) {
        mode = 'over';
        items = [];
        best = Math.max(best, score);
        localStorage.setItem('chewbabka-best', best);
        beep(196, 0.5, 'sawtooth', 0.1);
      }
    } else {
      combo++;
      score += it.def.pts * mult();
      beep(440 + Math.min(combo, 12) * 40, 0.08, 'triangle');
      UI.burst(it.x, it.y, 8);
    }
  }

  function update(dt) {
    shake = Math.max(0, shake - 40 * dt);
    flash = Math.max(0, flash - dt);
    if (mode !== 'play' || paused) return;
    elapsed += dt;

    // játékos
    const sp = CFG.PLAYER.speed * dt;
    if (keys.ArrowLeft || keys.KeyA) player.tx -= sp;
    if (keys.ArrowRight || keys.KeyD) player.tx += sp;
    player.tx = Math.max(40, Math.min(W - 40, player.tx));
    const dx = (player.tx - player.x) * Math.min(1, CFG.PLAYER.lerp * dt);
    player.x += dx;
    if (Math.abs(dx) > 0.15) player.face = dx > 0 ? 1 : -1;
    player.step += Math.abs(dx);

    // dobálás
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = (ramp(CFG.SPAWN_MS) / 1000) * rnd(0.75, 1.25); }

    // sólyom: átrepül és pisztáciát pottyant
    if (falcon) {
      falcon.x -= 170 * dt;
      if (!falcon.dropped && falcon.x < falcon.dropAt) { spawn(falcon.x, 'pisztacia'); falcon.dropped = true; }
      if (falcon.x < -360) { falcon = null; falconIn = rnd(...CFG.FALCON_S); }
    } else if ((falconIn -= dt) <= 0) {
      falcon = { x: W + 60, y: rnd(70, 130), dropAt: rnd(W * 0.25, W * 0.75), dropped: false };
    }

    // hulló töltelékek
    const top = CFG.GROUND_Y - CFG.PLAYER.h;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      it.y += it.vy * dt;
      it.x += Math.sin(it.t * 2 + it.seed) * 14 * dt;
      const caught = it.y + it.def.r > top && it.y < CFG.GROUND_Y - 20 &&
        Math.abs(it.x - player.x) < CFG.PLAYER.w * 0.45 + it.def.r * 0.6;
      if (caught) { onCatch(it); items.splice(i, 1); }
      else if (it.y - it.def.r > CFG.GROUND_Y) {
        if (!it.def.bad) { combo = 0; UI.burst(it.x, CFG.GROUND_Y, 5); }
        items.splice(i, 1);
      }
    }
  }

  // ---- rajzolás ----
  function drawScene(t) {
    UI.paper();

    // girbegurba talajvonal morzsákkal
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 14; x <= W - 14; x += 12) {
      const y = CFG.GROUND_Y + 4 + Math.sin(x * 0.13) * 2.2;
      x === 14 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = INK;
    for (let x = 30; x < W; x += 47) {
      ctx.beginPath(); ctx.arc(x + Math.sin(x) * 8, CFG.GROUND_Y + 16 + Math.cos(x * 3) * 5, 1.8, 0, 7); ctx.fill();
    }

    if (falcon) ctx.drawImage(Sprites.falcon, falcon.x, falcon.y + Math.sin(t * 4) * 6);

    for (const it of items) {
      const { r, bad } = it.def;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.t * (bad ? 3 : 2.4) + it.seed) * (bad ? 0.5 : 0.16));
      if (bad) ctx.drawImage(Sprites.raisin, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
      else {
        ctx.drawImage(Sprites.get(it.def.key), -r, -r, r * 2, r * 2);
        ctx.drawImage(Sprites.ring, -r - 9, -r - 9, r * 2 + 18, r * 2 + 18);
      }
      ctx.restore();
    }

    UI.drawParts();

    // játékos: árnyék + ugráló babka (a címképernyőn a saját példánya szerepel)
    if (mode !== 'play') return;
    const { w, h } = CFG.PLAYER;
    const bob = Math.sin(player.step * 0.09) * 3;
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.ellipse(player.x, CFG.GROUND_Y + 2, w * 0.42, 7, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(player.x, CFG.GROUND_Y + bob);
    ctx.scale(player.face, 1);
    ctx.drawImage(Sprites.get('player'), -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawHud() {
    text(score + ' pont', 16, 40, 30, 'left');
    if (combo >= CFG.COMBO_STEP) text('x' + mult() + ' sorozat!', 16, 66, 21, 'left', 0.8);
    if (best > 0) text('rekord: ' + best, W / 2, 32, 18, 'center', 0.55);
    for (let i = 0; i < CFG.LIVES; i++) {
      ctx.globalAlpha = i < lives ? 1 : 0.15;
      ctx.drawImage(Sprites.heart, W - 22 - (i + 1) * 36, 18, 30, 24);
    }
    ctx.globalAlpha = 1;
    if (UI.isMuted()) text('némítva', W - 16, 66, 16, 'right', 0.5);
  }

  function drawTitle(t) {
    UI.logo();
    text(COPY.sub, W / 2, 300, 44);
    const pl = Sprites.get('player');
    ctx.drawImage(pl, W / 2 - 62, 330 + Math.sin(t * 2) * 5, 124, 150);
    text(COPY.how1, W / 2, 540, 26);
    text(COPY.how2, W / 2, 572, 26);
    ctx.drawImage(Sprites.raisin, W / 2 + 92, 552, 30, 30);
    text(COPY.keys, W / 2, 620, 17, 'center', 0.6);
    text(COPY.start, W / 2, 678, 28, 'center', UI.blink(t));
    if (best > 0) text('rekord: ' + best, W / 2, 32, 18, 'center', 0.55);
  }

  let last = 0;
  function frame(ts) {
    const t = ts / 1000;
    const dt = Math.min(0.05, t - last);
    last = t;
    update(dt);
    UI.updateParts(dt);
    ctx.save();
    if (shake > 0) ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
    drawScene(t);
    if (mode === 'play') drawHud();
    if (mode === 'title') drawTitle(t);
    if (mode === 'over') UI.overScreen(t, COPY.over, score + ' pont      rekord: ' + best, score);
    if (mode === 'play' && paused) text(COPY.paused, W / 2, H / 2, 54);
    if (flash > 0) {
      ctx.globalAlpha = flash * 1.2; ctx.fillStyle = '#a33a1f';
      ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }

  reset();
  Sprites.load(() => requestAnimationFrame(frame));
})();
