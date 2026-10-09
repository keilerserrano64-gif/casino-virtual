// Pruebas del motor de crash games. Ejecutar: node tests/crash_engine.test.js
const assert = require('assert');
const E = require('../js/crash_engine.js');
let ok = 0; const test = (n, f) => { f(); ok++; console.log('✔', n); };

test('el punto de caída siempre está entre 1.00 y el máximo', () => {
  for (let i = 0; i < 20000; i++) { const c = E.crashPoint(); assert(c >= 1 && c <= E.MAX_MULT); }
});
test('RTP simulado ≈ 97 % retirando siempre en 2x', () => {
  const N = 400000; let paid = 0;
  for (let i = 0; i < N; i++) if (E.crashPoint() >= 2) paid += 2;
  const rtp = paid / N; assert(rtp > 0.94 && rtp < 1.0, 'rtp ' + rtp);
});
test('RTP simulado ≈ 97 % retirando siempre en 10x', () => {
  const N = 600000; let paid = 0;
  for (let i = 0; i < N; i++) if (E.crashPoint() >= 10) paid += 10;
  const rtp = paid / N; assert(rtp > 0.90 && rtp < 1.04, 'rtp ' + rtp);
});
test('multiplicador y tiempo son inversos y crecen', () => {
  for (const g of Object.values(E.GAMES)) {
    assert.strictEqual(E.multAt(0, g.k), 1);
    assert(E.multAt(20, g.k) > E.multAt(10, g.k));
    assert(Math.abs(E.multAt(E.timeAt(5, g.k), g.k) - 5) <= 0.02);
  }
});
test('pagos y retiro del 50 %', () => {
  assert.strictEqual(E.payoutFor(100, 2.5), 250);
  assert.strictEqual(E.halfStake(101), 50);
  assert(E.GAMES.spaceman.half && !E.GAMES.aviator.half);
});
test('hay 10 juegos; Zeppelin tiene 2 apuestas y Aero estadísticas', () => {
  assert.strictEqual(Object.keys(E.GAMES).length, 10);
  assert.strictEqual(E.GAMES.zeppelin.slots, 2); assert(E.GAMES.aero.stats);
  for (const g of Object.values(E.GAMES)) assert(g.k > 0 && g.slots >= 1);
});
test('apuesta mínima', () => { assert.strictEqual(E.normalizeBet('x'), 10); assert.strictEqual(E.normalizeBet(55.7), 55); });
console.log(`\n${ok} pruebas OK`);
