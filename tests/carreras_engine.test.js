// Pruebas del motor de carreras. Ejecutar: node tests/carreras_engine.test.js
const assert = require('assert');
const E = require('../js/carreras_engine.js');
let ok = 0; const test = (n, f) => { f(); ok++; console.log('✔', n); };
const flat = E.buildRace(E.HORSES.map(() => 1));

test('las probabilidades suman 1 (win), 2 (plaza) y 3 (show)', () => {
  for (const [k, s] of [['win', 1], ['place', 2], ['show', 3]])
    assert(Math.abs(flat.horses.reduce((a, h) => a + h.prob[k], 0) - s) < 1e-9);
});
test('RTP exacto ≤ 92 % en cualquier condición (salvo cuota mínima)', () => {
  for (let n = 0; n < 200; n++) {
    const r = E.newRace();
    for (let i = 0; i < 5; i++) for (const k of Object.keys(E.KINDS)) {
      const h = r.horses[i];
      if (h.odds[k] > 1.05) assert(E.rtp(r, i, k) <= E.RTP + 1e-9, `${k} ${E.rtp(r, i, k)}`);
      assert(h.odds[k] >= 1.05 && h.odds[k] <= 100);
    }
  }
});
test('el favorito tiene cuota menor que el más lento', () => {
  assert(flat.horses[0].odds.win < flat.horses[4].odds.win);
});
test('drawOrder devuelve una permutación válida y times respeta el orden', () => {
  for (let n = 0; n < 500; n++) {
    const o = E.drawOrder(flat); assert(E.isOrder(o, 5));
    const t = E.times(o); for (let k = 1; k < 5; k++) assert(t[o[k]] > t[o[k - 1]]);
  }
});
test('las frecuencias simuladas coinciden con la probabilidad teórica (60 000 carreras)', () => {
  const N = 60000, wins = Array(5).fill(0);
  for (let n = 0; n < N; n++) wins[E.drawOrder(flat)[0]]++;
  flat.horses.forEach((h, i) => assert(Math.abs(wins[i] / N - h.prob.win) < 0.01, `caballo ${i}`));
});
test('settle: paga según cuota, redondeando hacia abajo', () => {
  const r = E.settle(flat, [2, 0, 1, 3, 4], 0, 'place', 100);
  assert.strictEqual(r.rank, 2); assert(r.won); assert.strictEqual(r.payout, Math.floor(100 * flat.horses[0].odds.place));
  assert.strictEqual(E.settle(flat, [2, 0, 1, 3, 4], 0, 'win', 100).payout, 0);
  assert.strictEqual(E.settle(flat, [2, 0, 1, 3, 4], 3, 'show', 100).won, false);
});
test('validaciones', () => {
  assert(!E.validConds([1, 1, 1])); assert(!E.validConds([1, 1, 1, 1, 9])); assert(!E.isOrder([0, 0, 1, 2, 3], 5));
  assert.strictEqual(E.normalizeBet('abc'), 10); assert.strictEqual(E.normalizeBet(55.9), 55);
});
console.log(`\n${ok} pruebas correctas`);
