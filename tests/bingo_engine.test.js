// Pruebas del motor del bingo. Ejecutar: node tests/bingo_engine.test.js
const assert = require('assert');
const E = require('../js/bingo_engine.js');

let ok = 0;
const test = (name, fn) => { fn(); ok++; console.log('✔', name); };
const nums = c => c.cells.filter(v => v !== null && v !== 0);

test('randInt: rango correcto y sin sesgo evidente', () => {
  const n = 7, counts = Array(n).fill(0), N = 70000;
  for (let i = 0; i < N; i++) { const v = E.randInt(n); assert.ok(v >= 0 && v < n); counts[v]++; }
  const exp = N / n, chi = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0);
  assert.ok(chi < 22.5, 'χ² demasiado alto: ' + chi);   // 6 g.l., p≈0,001
  assert.throws(() => E.randInt(0));
});

test('shuffle conserva los elementos', () => {
  const a = E.shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
  assert.deepStrictEqual([...a].sort((x, y) => x - y), Array.from({ length: 90 }, (_, i) => i + 1));
});

test('cartón 75: 5x5, rangos por columna, sin repetidos, centro libre', () => {
  for (let k = 0; k < 200; k++) {
    const c = E.buildCard75();
    assert.strictEqual(c.cells.length, 25); assert.strictEqual(c.cells[12], 0);
    assert.strictEqual(new Set(nums(c)).size, 24);
    c.cells.forEach((v, i) => { if (i !== 12) { const col = i % 5; assert.ok(v >= col * 15 + 1 && v <= col * 15 + 15); } });
  }
});

test('cartón 90: 3 filas x 9 col, 5 por fila, 15 números, 1-3 por columna', () => {
  for (let k = 0; k < 300; k++) {
    const c = E.buildCard90();
    assert.strictEqual(nums(c).length, 15); assert.strictEqual(new Set(nums(c)).size, 15);
    for (let r = 0; r < 3; r++) assert.strictEqual(c.cells.slice(r * 9, r * 9 + 9).filter(v => v !== null).length, 5);
    for (let col = 0; col < 9; col++) {
      const inCol = [0, 1, 2].map(r => c.cells[r * 9 + col]).filter(v => v !== null);
      assert.ok(inCol.length >= 1 && inCol.length <= 3);
      const lo = col === 0 ? 1 : col * 10, hi = col === 8 ? 90 : col * 10 + 9;
      inCol.forEach(v => assert.ok(v >= lo && v <= hi));
      assert.deepStrictEqual(inCol, [...inCol].sort((a, b) => a - b));   // ascendentes en la columna
    }
  }
});

test('generateCards: sin cartones duplicados en la misma partida', () => {
  for (const mode of [75, 90]) {
    const cs = E.generateCards(mode, 500);
    assert.strictEqual(new Set(cs.map(c => c.key)).size, 500);
  }
  const used = new Set(); const a = E.generateCards(90, 3, used); const b = E.generateCards(90, 3, used);
  assert.strictEqual(new Set([...a, ...b].map(c => c.key)).size, 6);
});

test('lineDone / fullDone en 75 (fila, columna, diagonal, centro libre)', () => {
  const c = E.buildCard75();
  const called = new Set([0, 1, 2, 3, 4].map(i => c.cells[i * 5 + i]).filter(v => v));
  assert.ok(E.lineDone(c, called));                        // diagonal principal (incluye el centro libre)
  assert.ok(!E.fullDone(c, called));
  assert.ok(E.fullDone(c, new Set(nums(c))));
  assert.ok(!E.lineDone(c, new Set()));
});

test('lineDone / fullDone en 90 (solo cuentan las 5 casillas con número de la fila)', () => {
  const c = E.buildCard90();
  const row0 = new Set(c.cells.slice(0, 9).filter(v => v !== null));
  assert.ok(E.lineDone(c, row0));
  assert.ok(!E.fullDone(c, row0));
  assert.ok(E.fullDone(c, new Set(nums(c))));
});

test('draw: sin bolas repetidas, canta línea y bingo en la bola exacta y termina', () => {
  for (const mode of [75, 90]) {
    const g = E.newGame(mode, 2);
    const m = E.MODES[mode];
    // fuerza el bombo para completar el cartón 0: sus números primero
    const target = nums(g.cards[0]);
    g.bag = g.bag.filter(x => !target.includes(x)).concat([...target].reverse());
    let lines = 0, bingos = 0, n = 0;
    while (!g.done) {
      const r = E.draw(g); n++;
      r.events.forEach(e => { if (e.type === 'line') lines++; if (e.type === 'bingo') bingos++; });
      assert.ok(n <= m.maxDraws);
    }
    assert.strictEqual(new Set(g.order).size, g.order.length);
    assert.ok(lines >= 1); assert.strictEqual(bingos, 1);
    assert.strictEqual(g.order.length, target.length);         // bingo justo con la última bola necesaria
    assert.deepStrictEqual(g.fullCards, [0]);
    assert.strictEqual(E.draw(g).ball, null);                  // partida cerrada
  }
});

test('draw: cada cartón canta su primera línea una sola vez', () => {
  const g = E.newGame(75, 3); const seen = {};
  while (!g.done) E.draw(g).events.forEach(e => { if (e.type === 'line') seen[e.card] = (seen[e.card] || 0) + 1; });
  Object.values(seen).forEach(v => assert.strictEqual(v, 1));
});

test('el bote solo se gana con bingo dentro de jackpotBalls', () => {
  const g = E.newGame(75, 1); const target = nums(g.cards[0]);
  g.bag = g.bag.filter(x => !target.includes(x)).concat([...target].reverse());
  let ev; while (!g.done) ev = E.draw(g).events.find(e => e.type === 'bingo') || ev;
  assert.strictEqual(ev.jackpot, true);                        // 24 bolas ≤ 60
  const h = E.newGame(75, 1); const t2 = nums(h.cards[0]);
  const filler = h.bag.filter(x => !t2.includes(x)).slice(0, E.MODES[75].jackpotBalls);
  h.bag = h.bag.filter(x => !filler.includes(x) && !t2.includes(x)).concat([...t2].reverse(), [...filler].reverse());
  let ev2; while (!h.done) ev2 = E.draw(h).events.find(e => e.type === 'bingo') || ev2;
  if (ev2) assert.strictEqual(ev2.jackpot, false);
});

test('normalizeBet, normalizeCount y premios', () => {
  assert.strictEqual(E.normalizeBet('abc'), 10); assert.strictEqual(E.normalizeBet(99.9), 99); assert.strictEqual(E.normalizeBet(-5), 10);
  assert.strictEqual(E.normalizeCount(0), 1); assert.strictEqual(E.normalizeCount(99), E.MAX_CARDS); assert.strictEqual(E.normalizeCount('x'), 1);
  assert.strictEqual(E.linePrize(75, 100), 50); assert.strictEqual(E.fullPrize(90, 100), 450);
  assert.strictEqual(E.jackpotAfterPurchase(1000, 200), 1010);
});

test('RTP simulado (sin bote) entre 75 % y 95 % en ambas salas', () => {
  for (const mode of [75, 90]) {
    let paid = 0, won = 0;
    for (let i = 0; i < 20000; i++) {
      const g = E.newGame(mode, 2); paid += 200;
      while (!g.done) E.draw(g).events.forEach(e => { if (e.type === 'line') won += E.linePrize(mode, 100); if (e.type === 'bingo') won += E.fullPrize(mode, 100); });
    }
    const rtp = won / paid; console.log('   RTP', mode, rtp.toFixed(3));
    assert.ok(rtp > 0.75 && rtp < 0.95, 'RTP fuera de rango: ' + rtp);
  }
});

console.log(`\n${ok} pruebas correctas`);
