// Végtelen Babka: kígyó fonott babkatesttel. Egyél tölteléket, kerüld a mazsolát!
(() => {
  const cv = document.getElementById('game');
  const ctx = UI.canvas(cv);
  const { W, H, INK, CREAM } = CFG;
  const { text, beep } = UI;

  const CELL = 24, COLS = 18, ROWS = 24;
  const BX = (W - COLS * CELL) / 2, BY = 84;
  const STEP0 = 0.16, STEP_MIN = 0.085, STEP_GAIN = 0.0035;
  const FLAVORS = CFG.ITEMS.filter((i) => !i.bad);
  const RAISIN_EVERY = 2, RAISIN_MAX = 6;

  // ---- állapot ----
  let mode = 'title', paused = false;
  let snake, dir, dirQueue, food, raisins, eaten, grow, stepIn, stepLen, score;
  let best = +(localStorage.getItem('chewbabka-snake-best') || 0);

  const cx = (c) => BX + c * CELL + CELL / 2;
  const cy = (r) => BY + r * CELL + CELL / 2;
  const occupied = (r, c) =>
    snake.some((s) => s.r === r && s.c === c) || raisins.some((z) => z.r === r && z.c === c) ||
    (food && food.r === r && food.c === c);

  function emptyCell() {
    let r, c;
    do { r = (Math.random() * ROWS) | 0; c = (Math.random() * COLS) | 0; } while (occupied(r, c));
    return { r, c };
  }

  function newFood() {
    const def = FLAVORS[(Math.random() * FLAVORS.length) | 0];
    food = { ...emptyCell(), def };
  }

  function reset() {
    snake = [{ r: 12, c: 9 }, { r: 12, c: 8 }, { r: 12, c: 7 }, { r: 12, c: 6 }];
    dir = { r: 0, c: 1 }; dirQueue = [];
    raisins = []; eaten = 0; grow = 0; score = 0;
    stepLen = STEP0; stepIn = stepLen;
    food = null; newFood();
  }

  // ---- bemenet ----
  const DIRS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], KeyW: [-1, 0], KeyS: [1, 0], KeyA: [0, -1], KeyD: [0, 1] };
  function queueDir(r, c) {
    const lastDir = dirQueue[dirQueue.length - 1] || dir;
    if (Math.abs(lastDir.r) === Math.abs(r) && Math.abs(lastDir.c) === Math.abs(c)) return; // se hátraarc, se ismétlés
    if (dirQueue.length < 3) dirQueue.push({ r, c });
  }
  addEventListener('keydown', (e) => {
    if (DIRS[e.code]) { e.preventDefault(); if (mode === 'play') queueDir(...DIRS[e.code]); else action(); }
    if (e.code === 'Space') { e.preventDefault(); action(); }
    if (e.code === 'KeyM') UI.toggleMute();
    if (e.code === 'KeyP' && mode === 'play') paused = !paused;
  });
  let touch = null;
  cv.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; if (mode !== 'play') action(); });
  cv.addEventListener('pointerup', (e) => {
    if (!touch || mode !== 'play') return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.abs(dx) + Math.abs(dy) > 24) {
      Math.abs(dx) > Math.abs(dy) ? queueDir(0, Math.sign(dx)) : queueDir(Math.sign(dy), 0);
    }
    touch = null;
  });
  function action() {
    if (mode === 'play') return;
    reset();
    mode = 'play';
    beep(523, 0.1, 'triangle');
  }

  // ---- léptetés ----
  function gameOver() {
    mode = 'over';
    best = Math.max(best, score);
    localStorage.setItem('chewbabka-snake-best', best);
    beep(196, 0.5, 'sawtooth', 0.1);
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();
    const head = { r: snake[0].r + dir.r, c: snake[0].c + dir.c };
    // ha nem nő, a farok elmozdul, így az utolsó szelet nem számít ütközésnek
    if (head.r < 0 || head.r >= ROWS || head.c < 0 || head.c >= COLS ||
        snake.some((s, i) => i < snake.length - (grow ? 0 : 1) && s.r === head.r && s.c === head.c) ||
        raisins.some((z) => z.r === head.r && z.c === head.c)) {
      UI.burst(cx(head.c), cy(head.r), 12);
      gameOver();
      return;
    }
    snake.unshift(head);
    if (food && head.r === food.r && head.c === food.c) {
      score += food.def.pts;
      grow += food.def.key === 'pisztacia' ? 2 : 1;
      eaten++;
      stepLen = Math.max(STEP_MIN, stepLen - STEP_GAIN);
      UI.burst(cx(head.c), cy(head.r), 8);
      beep(440 + (snake.length % 12) * 30, 0.08, 'triangle');
      if (eaten % RAISIN_EVERY === 0) {
        raisins.push(emptyCell());
        if (raisins.length > RAISIN_MAX) raisins.shift();
      }
      newFood();
    }
    if (grow > 0) grow--;
    else snake.pop();
  }

  function update(dt) {
    if (mode !== 'play' || paused) return;
    stepIn -= dt;
    while (stepIn <= 0 && mode === 'play') { step(); stepIn += stepLen; }
  }

  // ---- rajzolás ----
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawSnake() {
    // fonott babkatest: krém szelet barna kontúrral, váltakozó átlós csíkokkal
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i], x = cx(s.c), y = cy(s.r);
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      rrect(x - 11, y - 11, 22, 22, 8);
      ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (i % 2) { ctx.moveTo(x - 6, y + 7); ctx.lineTo(x + 7, y - 6); ctx.moveTo(x - 8, y + 2); ctx.lineTo(x + 2, y - 8); }
      else { ctx.moveTo(x - 7, y - 6); ctx.lineTo(x + 6, y + 7); ctx.moveTo(x - 2, y - 8); ctx.lineTo(x + 8, y + 2); }
      ctx.stroke();
    }
    // fej: csokibarna, krém mosollyal
    const h = snake[0], x = cx(h.c), y = cy(h.r);
    ctx.fillStyle = INK;
    rrect(x - 12, y - 12, 24, 24, 9);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.arc(x - 4, y - 3, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - 3, 2, 0, 7); ctx.fill();
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + 3, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  function drawScene(now) {
    UI.paper();
    UI.wobblyRect(BX - 7, BY - 7, COLS * CELL + 14, ROWS * CELL + 14);
    if (mode === 'title') return;
    for (const z of raisins) ctx.drawImage(Sprites.raisin, cx(z.c) - 13, cy(z.r) - 13, 26, 26);
    if (food) {
      const bob = Math.sin(now * 4) * 2;
      ctx.drawImage(Sprites.get(food.def.key), cx(food.c) - 13, cy(food.r) - 13 + bob, 26, 26);
    }
    drawSnake();
    UI.drawParts();
  }

  function drawHud() {
    text(score + ' pont', 16, 40, 28, 'left');
    text(snake.length + ' szelet', W / 2, 40, 22, 'center', 0.7);
    if (best > 0) text('rekord: ' + best, W - 16, 40, 18, 'right', 0.55);
    if (UI.isMuted()) text('némítva', W - 16, 64, 15, 'right', 0.5);
  }

  function drawTitle(now) {
    UI.logo(60, 390);
    text('végtelen babka!', W / 2, 320, 42);
    text('Egyél tölteléket, nőj hosszúra —', W / 2, 400, 25);
    text('fal, mazsola és önharapás tilos!', W / 2, 430, 25);
    ctx.drawImage(Sprites.raisin, W / 2 + 150, 408, 28, 28);
    text('nyilak / WASD / húzás · M némítás · P szünet', W / 2, 490, 17, 'center', 0.6);
    text('SPACE vagy katt — kezdjük!', W / 2, 600, 28, 'center', UI.blink(now));
    if (best > 0) text('rekord: ' + best, W / 2, 36, 18, 'center', 0.55);
  }

  let last = 0;
  function frame(ts) {
    const now = ts / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    update(dt);
    UI.updateParts(dt);
    drawScene(now);
    if (mode === 'play') drawHud();
    if (mode === 'title') drawTitle(now);
    if (mode === 'over') {
      ctx.fillStyle = CREAM;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      UI.overScreen(now, 'a babka elfogyott...',
        score + ' pont      ' + snake.length + ' szelet      rekord: ' + best, score);
    }
    if (mode === 'play' && paused) text('szünet', W / 2, H / 2, 54);
    requestAnimationFrame(frame);
  }

  reset();
  Sprites.load(() => requestAnimationFrame(frame));
})();
