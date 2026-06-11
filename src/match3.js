// Töltelék Trió: hármasító rendelésekkel. Fázisok: idle / swap / pop / fall / levelup.
(() => {
  const cv = document.getElementById('game');
  const ctx = UI.canvas(cv);
  const { W, H } = CFG;
  const { rnd, text, beep } = UI;

  const TYPES = ['csoki', 'dio', 'makos', 'pisztacia', 'mazsola'];
  const FLAVORS = TYPES.slice(0, 4);            // rendelésben csak igazi töltelék
  const COLS = 7, ROWS = 7, TILE = 56;
  const BX = (W - COLS * TILE) / 2, BY = 150;
  const MOVES = 22, SWAP_MS = 160, POP_MS = 180, FALL_V = 1100;

  // ---- állapot ----
  let mode = 'title', phase = 'idle';
  let grid, level, moves, score, orders, cascade, selected = null;
  let swap = null, pops = [], fallers = [], phaseT = 0, toast = null;
  let best = +(localStorage.getItem('chewbabka-m3-best') || 0);

  const sprite = (t) => (t === 'mazsola' ? Sprites.raisin : Sprites.get(t));
  const px = (c) => BX + c * TILE + TILE / 2;
  const py = (r) => BY + r * TILE + TILE / 2;

  function randType(r, c, g) {
    let t;
    do { t = TYPES[(Math.random() * TYPES.length) | 0]; }
    while ((c > 1 && g[r][c - 1].t === t && g[r][c - 2].t === t) ||
           (r > 1 && g[r - 1][c].t === t && g[r - 2][c].t === t));
    return t;
  }

  function newBoard() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) grid[r][c] = { t: randType(r, c, grid), dy: 0 };
    if (!hasMove()) newBoard();
  }

  function newLevel(n) {
    level = n; moves = MOVES; cascade = 1;
    const picks = [...FLAVORS].sort(() => Math.random() - 0.5).slice(0, n < 3 ? 2 : 3);
    orders = picks.map((t) => ({ t, need: Math.min(20, 5 + 2 * n) }));
    newBoard();
    phase = 'idle';
  }

  function start() { score = 0; newLevel(1); mode = 'play'; beep(523, 0.1, 'triangle'); }

  // ---- táblalogika ----
  function findMatches(g = grid) {
    const hit = new Set();
    const scan = (cells) => {
      let run = [cells[0]];
      for (let i = 1; i <= cells.length; i++) {
        const cur = cells[i];
        if (cur && g[cur.r][cur.c].t === g[run[0].r][run[0].c].t) run.push(cur);
        else {
          if (run.length >= 3) run.forEach((p) => hit.add(p.r + ',' + p.c));
          run = cur ? [cur] : [];
        }
      }
    };
    for (let r = 0; r < ROWS; r++) scan(Array.from({ length: COLS }, (_, c) => ({ r, c })));
    for (let c = 0; c < COLS; c++) scan(Array.from({ length: ROWS }, (_, r) => ({ r, c })));
    return [...hit].map((k) => k.split(',').map(Number));
  }

  function hasMove() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
          if (r2 >= ROWS || c2 >= COLS) continue;
          [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
          const ok = findMatches().length > 0;
          [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
          if (ok) return true;
        }
    return false;
  }

  function startPop(cells) {
    pops = cells.map(([r, c]) => ({ r, c, t: grid[r][c].t }));
    score += 10 * cells.length * cascade;
    for (const p of pops) {
      const o = orders.find((x) => x.t === p.t && x.need > 0);
      if (o) o.need--;
      UI.burst(px(p.c), py(p.r), 6);
    }
    beep(420 + cascade * 90, 0.1, 'triangle');
    if (cascade >= 2) toast = { text: 'lavina x' + cascade + '!', t: 1 };
    phase = 'pop'; phaseT = 0;
  }

  function startFall() {
    for (const p of pops) grid[p.r][p.c] = null;
    pops = [];
    fallers = [];
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--)
        if (grid[r][c]) {
          if (write !== r) {
            grid[write][c] = grid[r][c];
            grid[r][c] = null;
            grid[write][c].dy = (r - write) * TILE;
          }
          write--;
        }
      for (let r = write; r >= 0; r--)
        grid[r][c] = { t: TYPES[(Math.random() * TYPES.length) | 0], dy: -(write + 1.4) * TILE };
      for (let r = 0; r < ROWS; r++) if (grid[r][c].dy !== 0) fallers.push(grid[r][c]);
    }
    phase = 'fall';
  }

  function settle() {
    const m = findMatches();
    if (m.length) { cascade++; startPop(m); return; }
    cascade = 1;
    if (orders.every((o) => o.need <= 0)) { phase = 'levelup'; phaseT = 0; beep(660, 0.3, 'triangle'); return; }
    if (moves <= 0) {
      mode = 'over';
      best = Math.max(best, score);
      localStorage.setItem('chewbabka-m3-best', best);
      beep(196, 0.5, 'sawtooth', 0.1);
      return;
    }
    if (!hasMove()) { newBoard(); toast = { text: 'újrakeverés!', t: 1.2 }; }
    phase = 'idle';
  }

  function trySwap(a, b) {
    if (phase !== 'idle') return;
    swap = { a, b, t: 0, reverting: false };
    phase = 'swap';
    phaseT = 0;
    selected = null;
  }

  // ---- bemenet ----
  function cellAt(e) {
    const rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / UI.view(), y = (e.clientY - rect.top) / UI.view();
    const c = Math.floor((x - BX) / TILE), r = Math.floor((y - BY) / TILE);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? { r, c, x, y } : null;
  }
  let press = null;
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play') { action(); return; }
    const cell = cellAt(e);
    if (!cell || phase !== 'idle') return;
    if (selected && Math.abs(selected.r - cell.r) + Math.abs(selected.c - cell.c) === 1) {
      trySwap(selected, cell);
    } else { selected = { r: cell.r, c: cell.c }; press = cell; }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!press || phase !== 'idle' || mode !== 'play') return;
    const rect = cv.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / UI.view() - press.x, dy = (e.clientY - rect.top) / UI.view() - press.y;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
    const b = { r: press.r + dir[0], c: press.c + dir[1] };
    if (b.r >= 0 && b.r < ROWS && b.c >= 0 && b.c < COLS) trySwap({ r: press.r, c: press.c }, b);
    press = null;
  });
  cv.addEventListener('pointerup', () => { press = null; });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); action(); }
    if (e.code === 'KeyM') UI.toggleMute();
  });
  function action() { if (mode !== 'play') start(); }

  // ---- frissítés ----
  function update(dt) {
    if (toast && (toast.t -= dt) <= 0) toast = null;
    if (mode !== 'play') return;
    phaseT += dt;
    if (phase === 'swap' && phaseT * 1000 >= SWAP_MS) {
      const { a, b } = swap;
      [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
      phaseT = 0;
      if (swap.reverting) { swap = null; phase = 'idle'; }
      else {
        const m = findMatches();
        if (m.length) { moves--; swap = null; cascade = 1; startPop(m); }
        else { swap.reverting = true; beep(180, 0.08, 'square', 0.06); }
      }
    } else if (phase === 'pop' && phaseT * 1000 >= POP_MS) startFall();
    else if (phase === 'fall') {
      let moving = false;
      for (const f of fallers) {
        if (f.dy < 0) { f.dy = Math.min(0, f.dy + FALL_V * dt); moving = true; }
        else if (f.dy > 0) { f.dy = Math.max(0, f.dy - FALL_V * dt); moving = true; }
      }
      if (!moving) { fallers = []; settle(); }
    } else if (phase === 'levelup' && phaseT >= 1.5) newLevel(level + 1);
  }

  // ---- rajzolás ----
  function drawTile(t, x, y, scale = 1) {
    const s = TILE * 0.46 * scale;
    ctx.drawImage(sprite(t), x - s, y - s, s * 2, s * 2);
  }

  function drawBoard(now) {
    UI.wobblyRect(BX - 8, BY - 8, COLS * TILE + 16, ROWS * TILE + 16);
    ctx.save();
    ctx.beginPath();
    ctx.rect(BX - 8, BY - 8, COLS * TILE + 16, ROWS * TILE + 16);
    ctx.clip();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const g = grid[r][c];
        if (!g || pops.some((p) => p.r === r && p.c === c)) continue;
        if (swap && ((swap.a.r === r && swap.a.c === c) || (swap.b.r === r && swap.b.c === c))) continue;
        drawTile(g.t, px(c), py(r) + (g.dy || 0));
      }
    if (swap) { // a cserélődő pár interpolálva
      const k = Math.min(1, (phaseT * 1000) / SWAP_MS), { a, b } = swap;
      drawTile(grid[a.r][a.c].t, px(a.c) + (px(b.c) - px(a.c)) * k, py(a.r) + (py(b.r) - py(a.r)) * k);
      drawTile(grid[b.r][b.c].t, px(b.c) + (px(a.c) - px(b.c)) * k, py(b.r) + (py(a.r) - py(b.r)) * k);
    }
    for (const p of pops) {
      const k = Math.min(1, (phaseT * 1000) / POP_MS);
      ctx.globalAlpha = 1 - k;
      drawTile(p.t, px(p.c), py(p.r), 1 + k * 0.4);
      ctx.globalAlpha = 1;
    }
    if (selected) {
      const s = TILE * 0.62 * (1 + 0.05 * Math.sin(now * 6));
      ctx.drawImage(Sprites.ring, px(selected.c) - s, py(selected.r) - s, s * 2, s * 2);
    }
    ctx.restore();
  }

  function drawHud() {
    text(level + '. rendelés', 16, 40, 26, 'left');
    text('lépés: ' + moves, W - 16, 40, 26, 'right');
    const ow = 110, ox = W / 2 - (orders.length * ow) / 2;
    orders.forEach((o, i) => {
      const x = ox + i * ow + ow / 2;
      ctx.globalAlpha = o.need > 0 ? 1 : 0.35;
      ctx.drawImage(sprite(o.t), x - 40, 58, 44, 44);
      text(o.need > 0 ? '×' + o.need : 'kész!', x + 26, 90, 24);
      ctx.globalAlpha = 1;
    });
    text(score + ' pont', 16, H - 24, 24, 'left');
    if (best > 0) text('rekord: ' + best, W - 16, H - 24, 18, 'right', 0.55);
    if (toast) text(toast.text, W / 2, 134, 28, 'center', Math.min(1, toast.t * 2));
    if (phase === 'levelup') {
      text('rendelés kész!', W / 2, H / 2 - 10, 52);
      text('jön a következő...', W / 2, H / 2 + 30, 24, 'center', 0.7);
    }
    if (UI.isMuted()) text('némítva', W - 16, H - 48, 15, 'right', 0.5);
  }

  function drawTitle(now) {
    UI.logo();
    text('töltelék trió!', W / 2, 300, 44);
    ['csoki', 'dio', 'makos'].forEach((t, i) =>
      ctx.drawImage(sprite(t), W / 2 - 105 + i * 70, 330 + Math.sin(now * 2 + i) * 5, 64, 64));
    text('Cserélj két szomszédos korongot,', W / 2, 470, 25);
    text('gyűjts hármasokat a rendeléshez!', W / 2, 500, 25);
    text('húzás vagy két katt · M némítás', W / 2, 560, 18, 'center', 0.6);
    text('SPACE vagy katt — kezdjük!', W / 2, 640, 28, 'center', UI.blink(now));
    if (best > 0) text('rekord: ' + best, W / 2, 32, 18, 'center', 0.55);
  }

  let last = 0;
  function frame(ts) {
    const now = ts / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    update(dt);
    UI.updateParts(dt);
    UI.paper();
    if (mode === 'play') { drawBoard(now); drawHud(); }
    UI.drawParts();
    if (mode === 'title') drawTitle(now);
    if (mode === 'over') {
      UI.overScreen(now, 'elfogytak a lépések...',
        score + ' pont      ' + level + '. rendelésig      rekord: ' + best, score);
    }
    requestAnimationFrame(frame);
  }

  Sprites.load(() => requestAnimationFrame(frame));
})();
