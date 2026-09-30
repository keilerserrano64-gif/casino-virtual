// bingo_engine.js — reglas, RNG y evaluación del Bingo. Sin DOM: se puede probar en Node.
// RNG: crypto.getRandomValues con rechazo (sin sesgo de módulo). No está certificado por laboratorios externos.
(function (root) {
  'use strict';

  const getCrypto = () => (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues)
    ? globalThis.crypto : require('crypto').webcrypto;

  // Entero uniforme en [0, n) por muestreo con rechazo.
  function randInt(n) {
    if (!Number.isInteger(n) || n <= 0 || n > 0xFFFFFFFF) throw new RangeError('n fuera de rango');
    const limit = 0x100000000 - (0x100000000 % n);
    const buf = new Uint32Array(1);
    let x;
    do { getCrypto().getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }

  // Fisher-Yates con el RNG anterior.
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const pick = (arr, k) => shuffle(arr.slice()).slice(0, k);

  /* ---------- Modos ---------- */
  // maxDraws: bolas por partida. line/full: multiplicador sobre el precio del cartón que gana.
  // jackpotBalls: si se canta bingo con esas bolas o menos, se lleva el bote acumulado.
  const MODES = {
    75: { id: 75, name: 'Bingo 75', pool: 75, rows: 5, cols: 5, maxDraws: 66, line: 0.5, full: 15, jackpotBalls: 60 },
    90: { id: 90, name: 'Bingo 90', pool: 90, rows: 3, cols: 9, maxDraws: 78, line: 0.5, full: 4.5, jackpotBalls: 63 },
  };
  const MAX_CARDS = 6;
  const JACKPOT_RATE = 0.05;   // parte de cada compra que va al bote
  const JACKPOT_SEED = 1000;   // valor inicial del bote tras un premio

  /* ---------- Cartones ---------- */
  // Cartón: { mode, rows, cols, cells: number|null[] (por filas; 0 = casilla libre en 75), key }
  function buildCard75() {
    const cols = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]].map(([a, b]) => pick(range(a, b), 5));
    const cells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push(r === 2 && c === 2 ? 0 : cols[c][r]);
    return { mode: 75, rows: 5, cols: 5, cells };
  }

  // 90 bolas: 3 filas x 9 columnas, 5 números por fila, 15 en total, 1-3 números por columna.
  function buildCard90() {
    for (;;) {
      const counts = Array(9).fill(1);                         // cada columna al menos 1
      let extra = 15 - 9;
      while (extra > 0) { const c = randInt(9); if (counts[c] < 3) { counts[c]++; extra--; } }
      // reparte las posiciones por fila: cada fila debe tener exactamente 5
      const grid = Array.from({ length: 3 }, () => Array(9).fill(false));
      const rowLoad = [0, 0, 0];
      let ok = true;
      const order = shuffle(range(0, 8));
      for (const c of order) {
        const rowsOrder = shuffle([0, 1, 2]).sort((a, b) => rowLoad[a] - rowLoad[b]);
        const chosen = rowsOrder.filter(r => rowLoad[r] < 5).slice(0, counts[c]);
        if (chosen.length < counts[c]) { ok = false; break; }
        chosen.forEach(r => { grid[r][c] = true; rowLoad[r]++; });
      }
      if (!ok || rowLoad.some(v => v !== 5)) continue;
      const cells = Array(27).fill(null);
      for (let c = 0; c < 9; c++) {
        const lo = c === 0 ? 1 : c * 10, hi = c === 8 ? 90 : c * 10 + 9;
        const nums = pick(range(lo, hi), counts[c]).sort((a, b) => a - b);
        let k = 0;
        for (let r = 0; r < 3; r++) if (grid[r][c]) cells[r * 9 + c] = nums[k++];
      }
      return { mode: 90, rows: 3, cols: 9, cells };
    }
  }

  const cardKey = card => card.cells.map(v => (v === null ? '-' : v)).join(',');

  // Genera `count` cartones distintos entre sí y distintos de los ya usados en la partida.
  function generateCards(mode, count, used) {
    const seen = used || new Set();
    const out = [];
    let guard = 0;
    while (out.length < count) {
      if (++guard > 10000) throw new Error('no se pudieron generar cartones únicos');
      const card = mode === 90 ? buildCard90() : buildCard75();
      card.key = cardKey(card);
      if (seen.has(card.key)) continue;
      seen.add(card.key); out.push(card);
    }
    return out;
  }

  /* ---------- Evaluación ---------- */
  // Líneas de un cartón como listas de índices. 75: filas, columnas y diagonales. 90: sus 3 filas.
  function linesOf(mode) {
    if (mode === 90) return [0, 1, 2].map(r => range(0, 8).map(c => r * 9 + c).filter(() => true));
    const L = [];
    for (let i = 0; i < 5; i++) { L.push(range(0, 4).map(c => i * 5 + c)); L.push(range(0, 4).map(r => r * 5 + i)); }
    L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    return L;
  }

  // ¿Está cubierta una casilla? (libre o número ya cantado). Las casillas vacías del 90 no cuentan.
  const covered = (v, called) => v === 0 || called.has(v);

  function lineDone(card, called) {
    if (card.mode === 90) {
      for (let r = 0; r < 3; r++) {
        const nums = card.cells.slice(r * 9, r * 9 + 9).filter(v => v !== null);
        if (nums.every(v => called.has(v))) return true;
      }
      return false;
    }
    return linesOf(75).some(l => l.every(i => covered(card.cells[i], called)));
  }

  function fullDone(card, called) {
    return card.cells.every(v => v === null || covered(v, called));
  }

  // Cuántos números le faltan al cartón para el bingo.
  const missing = (card, called) => card.cells.filter(v => v !== null && v !== 0 && !called.has(v)).length;

  /* ---------- Partida ---------- */
  // Crea una partida con su bombo mezclado con el RNG. Decide todo antes de que la interfaz anime.
  function newGame(mode, cardCount) {
    const m = MODES[mode];
    if (!m) throw new RangeError('modo no válido');
    const cards = generateCards(mode, cardCount);
    return {
      mode, cards, called: new Set(), order: [],
      bag: shuffle(range(1, m.pool)),
      lineCards: new Set(),    // cartones que ya cantaron línea
      fullCards: [],           // cartones que cantaron bingo
      done: false,
    };
  }

  // Extrae una bola y evalúa TODOS los cartones al instante. Cada cartón canta su primera línea una vez;
  // el bingo termina la partida. Devuelve los eventos ocurridos con esa bola.
  function draw(game) {
    const m = MODES[game.mode];
    if (game.done) return { ball: null, events: [] };
    const ball = game.bag.pop();
    game.called.add(ball); game.order.push(ball);
    const events = [];
    game.cards.forEach((c, i) => {
      if (!game.lineCards.has(i) && lineDone(c, game.called)) { game.lineCards.add(i); events.push({ type: 'line', card: i }); }
    });
    const winners = [];
    game.cards.forEach((c, i) => { if (fullDone(c, game.called)) winners.push(i); });
    if (winners.length) {
      game.fullCards = winners; game.done = true;
      const jackpot = game.order.length <= m.jackpotBalls;
      winners.forEach(i => events.push({ type: 'bingo', card: i, jackpot }));
    } else if (game.order.length >= m.maxDraws) {
      game.done = true; events.push({ type: 'end' });
    }
    return { ball, events };
  }

  const normalizeBet = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 10 ? n : 10; };
  const normalizeCount = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(MAX_CARDS, Math.max(1, n)) : 1; };

  // Premio por cartón ganador, sobre el precio de ese cartón (la ventaja no depende de cuántos cartones compres).
  const linePrize = (mode, price) => Math.floor(price * MODES[mode].line);
  const fullPrize = (mode, price) => Math.floor(price * MODES[mode].full);

  // Bote: sube un % de lo pagado por cartones y se reinicia al ganarlo.
  const jackpotAfterPurchase = (jackpot, paid) => jackpot + Math.floor(paid * JACKPOT_RATE);

  root.BingoEngine = {
    MODES, MAX_CARDS, JACKPOT_RATE, JACKPOT_SEED,
    randInt, shuffle, generateCards, buildCard75, buildCard90, cardKey, linesOf,
    lineDone, fullDone, missing, newGame, draw, normalizeBet, normalizeCount,
    linePrize, fullPrize, jackpotAfterPurchase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BingoEngine;
})(typeof window !== 'undefined' ? window : globalThis);
