// slots_engine.js — motor de 4 slots populares: Gates of Olympus, Sweet Bonanza (cuadrícula 6x5, pago por grupos y cascadas)
// y Book of Dead, Starburst (5x3, 10 líneas). Sin DOM; se prueba en Node. Versiones virtuales con símbolos emoji.
(function (root) {
  const MIN_BET = 10, MAX_WIN = 5000;                 // tope de premio: 5000 veces la apuesta

  /* RNG: crypto.getRandomValues (CSPRNG), 53 bits para el decimal en [0,1). */
  const cr = root.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null);
  function rand() { const a = new Uint32Array(2); cr.getRandomValues(a); return ((a[0] >>> 5) * 67108864 + (a[1] >>> 6)) / 9007199254740992; }
  const randInt = n => Math.floor(rand() * n);
  function pick(list) {                               // elige [símbolo, peso] según el peso
    let tot = 0; for (const e of list) tot += e[1];
    let r = rand() * tot;
    for (const e of list) { if ((r -= e[1]) < 0) return e[0]; }
    return list[list.length - 1][0];
  }
  const normalizeBet = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= MIN_BET ? n : MIN_BET; };

  const ORB_VALUES = [[2, 50], [3, 30], [4, 20], [5, 12], [6, 8], [8, 6], [10, 5], [12, 3], [15, 2], [20, 1.5], [25, 1], [50, .5], [100, .2], [250, .05], [500, .02]];
  const BOMB_VALUES = [[2, 50], [3, 30], [4, 20], [5, 12], [6, 8], [8, 6], [10, 5], [12, 3], [15, 2], [20, 1.5], [25, 1], [50, .5], [100, .2]];

  /* ---------------- Configuración de cada juego ----------------
     cluster: pay[símbolo] = [8-9, 10-11, 12+] veces la apuesta (se multiplica por scale).
     lines:   pay[símbolo] = { n: veces la apuesta de línea (apuesta/10) } (se multiplica por scale).
     scale se calibró por simulación para un RTP ≈ 96 % (ver tests/slots_engine.test.js). */
  const GAMES = {
    gates: {
      name: 'Gates of Olympus', studio: 'Pragmatic Play', icon: '⚡', type: 'cluster', cols: 6, rows: 5,
      scale: 1.03, scatter: '⚡', scatterW: 1.2, scatterPay: { 4: 3, 5: 5, 6: 100 }, fsCount: 15, fsRetrigger: 5,
      orb: '🔮', orbBase: 0.12, orbFS: 0.25, orbValues: ORB_VALUES, accumMult: true,
      symbols: [['👑', 3], ['⏳', 4], ['💍', 5], ['🏺', 6], ['🔴', 9], ['🟣', 10], ['🟢', 11], ['🔵', 12], ['🟡', 13]],
      pay: { '👑': [10, 25, 50], '⏳': [2.5, 10, 25], '💍': [2, 5, 15], '🏺': [1.5, 2, 12], '🔴': [1, 1.5, 10], '🟣': [0.8, 1.2, 8], '🟢': [0.5, 1, 5], '🔵': [0.4, 0.9, 4], '🟡': [0.25, 0.75, 2] },
    },
    bonanza: {
      name: 'Sweet Bonanza', studio: 'Pragmatic Play', icon: '🍭', type: 'cluster', cols: 6, rows: 5,
      scale: 2.27, scatter: '🍭', scatterW: 1.2, scatterPay: { 4: 3, 5: 5, 6: 100 }, fsCount: 10, fsRetrigger: 5,
      orb: '🍬', orbBase: 0, orbFS: 0.6, orbValues: BOMB_VALUES, accumMult: false,
      symbols: [['🍉', 3], ['🍇', 4], ['🍎', 5], ['🍑', 6], ['🍌', 9], ['🍐', 10], ['🍓', 11], ['🍒', 12], ['🫐', 13]],
      pay: { '🍉': [10, 25, 50], '🍇': [2.5, 10, 25], '🍎': [2, 5, 15], '🍑': [1.5, 2, 12], '🍌': [1, 1.5, 10], '🍐': [0.8, 1.2, 8], '🍓': [0.5, 1, 5], '🍒': [0.4, 0.9, 4], '🫐': [0.25, 0.75, 2] },
    },
    bod: {
      name: 'Book of Dead', studio: "Play'n GO", icon: '📖', type: 'lines', cols: 5, rows: 3, lines: 10,
      scale: 1.62, book: '📖', bookW: 1.3, scatterPay: { 3: 2, 4: 20, 5: 200 }, fsCount: 10, fsRetrigger: 10, topSym: '🤠',
      symbols: [['🤠', 2.2], ['🏺', 3], ['🦅', 3.6], ['🪲', 4.2], ['A', 6], ['K', 6], ['Q', 7.5], ['J', 7.5], ['10', 8]],
      pay: { '🤠': { 2: 5, 3: 100, 4: 1000, 5: 5000 }, '🏺': { 3: 30, 4: 100, 5: 400 }, '🦅': { 3: 30, 4: 100, 5: 400 }, '🪲': { 3: 15, 4: 75, 5: 200 },
        'A': { 3: 5, 4: 25, 5: 100 }, 'K': { 3: 5, 4: 25, 5: 100 }, 'Q': { 3: 5, 4: 15, 5: 75 }, 'J': { 3: 5, 4: 15, 5: 75 }, '10': { 3: 5, 4: 15, 5: 75 } },
    },
    starburst: {
      name: 'Starburst', studio: 'NetEnt', icon: '🌟', type: 'lines', cols: 5, rows: 3, lines: 10,
      scale: 0.255, wild: '🌟', wildReels: [1, 2, 3], wildW: 1.8, bothWays: true, maxRespins: 3, welcomeSpins: 10, topSym: '7️⃣',
      symbols: [['7️⃣', 5], ['🎰', 6], ['🟣', 9], ['🔵', 10], ['🟢', 11], ['🟠', 12], ['🔴', 13]],
      pay: { '7️⃣': { 3: 50, 4: 200, 5: 250 }, '🎰': { 3: 25, 4: 100, 5: 120 }, '🟣': { 3: 10, 4: 50, 5: 100 }, '🔵': { 3: 10, 4: 50, 5: 100 },
        '🟢': { 3: 5, 4: 20, 5: 50 }, '🟠': { 3: 3, 4: 12, 5: 30 }, '🔴': { 3: 2, 4: 10, 5: 25 } },
    },
  };
  const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1]];

  /* ---------------- Utilidades ---------------- */
  const flat = (grid, cols, rows, txt) => { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(txt(grid[c][r])); return out; };
  const idxOf = (c, r, cols) => r * cols + c;

  /* ================= Pago por grupos con cascadas (Olympus, Bonanza) ================= */
  function spinCluster(cfg, bet, fs) {
    const { cols, rows } = cfg, inFS = !!fs;
    const bag = cfg.symbols.concat([[cfg.scatter, cfg.scatterW]]);
    const cell = () => ({ s: pick(bag) });
    const txt = x => x.v ? `${x.s}×${x.v}` : x.s;
    const snap = () => flat(grid, cols, rows, txt);
    const addOrb = fresh => {                         // a veces aparece un multiplicador en una casilla nueva
      const chance = inFS ? cfg.orbFS : cfg.orbBase;
      if (chance > 0 && fresh.length && rand() < chance) { const [c, r] = fresh[randInt(fresh.length)]; grid[c][r] = { s: cfg.orb, v: pick(cfg.orbValues) }; }
    };
    const grid = Array.from({ length: cols }, () => Array.from({ length: rows }, cell));
    const all = []; for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) all.push([c, r]);
    addOrb(all);

    const steps = []; let total = 0;
    for (let guard = 0; guard < 60; guard++) {
      const counts = {};
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const x = grid[c][r]; if (cfg.pay[x.s]) counts[x.s] = (counts[x.s] || 0) + 1; }
      const winners = Object.keys(counts).filter(s => counts[s] >= 8);
      if (!winners.length) break;
      let stepWin = 0; const marked = new Set(), winCells = [];
      for (const s of winners) { const n = counts[s], p = cfg.pay[s]; stepWin += p[n >= 12 ? 2 : n >= 10 ? 1 : 0] * cfg.scale * bet; }
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (winners.includes(grid[c][r].s)) { marked.add(c + ',' + r); winCells.push(idxOf(c, r, cols)); }
      steps.push({ cells: snap(), win: winCells, amount: Math.floor(stepWin) });
      total += stepWin;
      const fresh = [];
      for (let c = 0; c < cols; c++) {                // las casillas restantes caen y arriba entran nuevas
        const kept = grid[c].filter((_, r) => !marked.has(c + ',' + r));
        const need = rows - kept.length, add = Array.from({ length: need }, cell);
        grid[c] = add.concat(kept);
        for (let r = 0; r < need; r++) fresh.push([c, r]);
      }
      addOrb(fresh);
    }
    let scatters = 0, orbSum = 0;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const x = grid[c][r]; if (x.s === cfg.scatter) scatters++; if (x.v) orbSum += x.v; }
    steps.push({ cells: snap(), win: [], amount: 0 });

    let mult = 1, fsOut = null;
    if (total > 0 && orbSum > 0) {
      if (inFS && cfg.accumMult) { fs = { ...fs, mult: fs.mult + orbSum }; mult = fs.mult; } else mult = orbSum;
    } else if (inFS && cfg.accumMult && total > 0 && fs.mult > 0) mult = fs.mult;
    let payout = Math.floor(total * mult);
    const sp = scatters >= 6 ? cfg.scatterPay[6] : cfg.scatterPay[scatters] || 0;
    const scatterWin = Math.floor(sp * bet);
    payout = Math.min(MAX_WIN * bet, payout + scatterWin);

    if (inFS) {
      fsOut = { ...fs, left: fs.left - 1 + (scatters >= 3 ? cfg.fsRetrigger : 0), acc: fs.acc + payout };
    } else if (scatters >= 4) {
      fsOut = { game: null, left: cfg.fsCount, mult: 0, bet, acc: payout };
    }
    return { steps, payout, scatters, scatterWin, mult, orbSum, fs: fsOut, retrigger: inFS && scatters >= 3 };
  }

  /* ================= Líneas (Book of Dead, Starburst) ================= */
  const BLOCK = '#';
  function runLength(cells, wild) {
    let sym = null, n = 0;
    for (const s of cells) {
      if (s === wild) { n++; continue; }
      if (s === BLOCK) break;
      if (sym === null) { sym = s; n++; continue; }
      if (s === sym) n++; else break;
    }
    return { sym, n };
  }
  function evalLines(cfg, grid, bet, wild) {         // devuelve { win, cells }
    let win = 0; const cells = new Set(), lb = bet / cfg.lines;
    for (const line of LINES) {
      const seq = line.map((r, c) => grid[c][r]);
      const dirs = cfg.bothWays ? [false, true] : [false];
      let leftN = 0;
      for (const rev of dirs) {
        const arr = rev ? seq.slice().reverse() : seq;
        let { sym, n } = runLength(arr, wild);
        if (sym === null && n > 0) sym = cfg.topSym;
        const p = sym && cfg.pay[sym];
        if (!p || !p[n]) { if (!rev) leftN = 0; continue; }
        if (rev && leftN === cfg.cols) continue;       // 5 iguales solo paga una vez
        if (!rev) leftN = n;
        win += p[n] * cfg.scale * lb;
        for (let i = 0; i < n; i++) { const c = rev ? cfg.cols - 1 - i : i; cells.add(idxOf(c, line[c], cfg.cols)); }
      }
    }
    return { win, cells: [...cells] };
  }

  function spinBook(cfg, bet, fs) {
    const bag = cfg.symbols.concat([[cfg.book, cfg.bookW]]);
    const grid = Array.from({ length: cfg.cols }, () => Array.from({ length: cfg.rows }, () => pick(bag)));
    const show = () => flat(grid, cfg.cols, cfg.rows, x => x === BLOCK ? '' : x);
    const books = grid.flat().filter(s => s === cfg.book).length;
    const steps = []; let payout = 0;
    if (fs) {
      const sp = fs.special, reels = [];
      for (let c = 0; c < cfg.cols; c++) if (grid[c].includes(sp)) reels.push(c);
      steps.push({ cells: show(), win: [], amount: 0 });
      const row = cfg.pay[sp][reels.length];
      const ewin = row ? Math.floor(bet * row * cfg.scale) : 0;
      for (const c of reels) for (let r = 0; r < cfg.rows; r++) grid[c][r] = BLOCK;     // el símbolo expandido no forma líneas normales
      const expCells = []; for (const c of reels) for (let r = 0; r < cfg.rows; r++) expCells.push(idxOf(c, r, cfg.cols));
      const shownSp = flat(grid, cfg.cols, cfg.rows, x => x === BLOCK ? sp : x);
      if (reels.length) steps.push({ cells: shownSp, win: ewin ? expCells : [], amount: ewin });
      payout += ewin;
      const lw = evalLines(cfg, grid, bet, cfg.book);
      const lwin = Math.floor(lw.win);
      if (lwin) steps.push({ cells: shownSp, win: lw.cells, amount: lwin });
      payout += lwin;
    } else {
      const lw = evalLines(cfg, grid, bet, cfg.book);
      const lwin = Math.floor(lw.win);
      steps.push({ cells: show(), win: lw.cells, amount: lwin });
      payout += lwin;
    }
    const sc = cfg.scatterPay[Math.min(books, 5)] || 0, scatterWin = Math.floor(sc * bet);
    payout = Math.min(MAX_WIN * bet, payout + scatterWin);
    let fsOut = null;
    if (fs) fsOut = { ...fs, left: fs.left - 1 + (books >= 3 ? cfg.fsRetrigger : 0), acc: fs.acc + payout };
    else if (books >= 3) {
      const specials = cfg.symbols.map(e => e[0]);
      fsOut = { game: null, left: cfg.fsCount, special: specials[randInt(specials.length)], mult: 0, bet, acc: payout };
    }
    return { steps, payout, scatters: books, scatterWin, mult: 1, orbSum: 0, fs: fsOut, retrigger: !!fs && books >= 3 };
  }

  function spinStarburst(cfg, bet) {
    const mk = c => cfg.wildReels.includes(c) ? cfg.symbols.concat([[cfg.wild, cfg.wildW]]) : cfg.symbols;
    const roll = c => Array.from({ length: cfg.rows }, () => pick(mk(c)));
    const grid = Array.from({ length: cfg.cols }, (_, c) => roll(c));
    const locked = new Set(), steps = []; let payout = 0;
    for (let stage = 0; stage <= cfg.maxRespins; stage++) {
      const fresh = [];
      for (const c of cfg.wildReels) if (!locked.has(c) && grid[c].includes(cfg.wild)) fresh.push(c);
      for (const c of fresh) { locked.add(c); grid[c] = Array(cfg.rows).fill(cfg.wild); }   // el comodín se expande
      const lw = evalLines(cfg, grid, bet, cfg.wild), w = Math.floor(lw.win);
      steps.push({ cells: flat(grid, cfg.cols, cfg.rows, x => x), win: lw.cells, amount: w });
      payout += w;
      if (!fresh.length || stage === cfg.maxRespins) break;
      for (let c = 0; c < cfg.cols; c++) if (!locked.has(c)) grid[c] = roll(c);           // respin de los carretes libres
    }
    payout = Math.min(MAX_WIN * bet, payout);
    return { steps, payout, scatters: 0, scatterWin: 0, mult: 1, orbSum: 0, fs: null, respins: steps.length - 1 };
  }

  // spin(juego, apuesta, fs): fs = estado de giros gratis (o null en un giro normal). Devuelve { steps, payout, fs, ... }.
  function spin(key, bet, fs) {
    const cfg = GAMES[key];
    let r;
    if (cfg.type === 'cluster') r = spinCluster(cfg, bet, fs || null);
    else if (key === 'bod') r = spinBook(cfg, bet, fs || null);
    else r = spinStarburst(cfg, bet);
    if (r.fs) r.fs.game = key;
    return r;
  }

  root.SlotEngine = { GAMES, LINES, MIN_BET, MAX_WIN, rand, randInt, pick, normalizeBet, spin };
  if (typeof module !== 'undefined') module.exports = root.SlotEngine;
})(typeof window !== 'undefined' ? window : globalThis);
