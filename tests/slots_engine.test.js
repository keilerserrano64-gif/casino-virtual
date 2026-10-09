// Pruebas del motor de slots (Gates of Olympus, Sweet Bonanza, Book of Dead, Starburst). Ejecutar: node tests/slots_engine.test.js
const assert = require('assert');
const E = require('../js/slots_engine.js');
let ok = 0; const test = (n, f) => { f(); ok++; console.log('✔', n); };

function session(key, bet) {                        // juega un giro completo (con sus giros gratis) y devuelve el total
  let r = E.spin(key, bet, null), tot = r.payout;
  if (r.fs) { let fs = r.fs; while (fs.left > 0) { r = E.spin(key, bet, fs); fs = r.fs; } tot = fs.acc; }
  return tot;
}
function rtp(key, n) { let paid = 0; for (let i = 0; i < n; i++) paid += session(key, 100); return paid / (n * 100); }

test('hay 4 juegos con el tamaño de cuadrícula correcto en cada paso', () => {
  assert.deepStrictEqual(Object.keys(E.GAMES), ['gates', 'bonanza', 'bod', 'starburst']);
  for (const k of Object.keys(E.GAMES)) {
    const g = E.GAMES[k];
    for (let i = 0; i < 300; i++) { const r = E.spin(k, 100, null); r.steps.forEach(s => assert.strictEqual(s.cells.length, g.cols * g.rows)); }
  }
});
test('el premio nunca supera el tope de 5000x', () => {
  for (const k of Object.keys(E.GAMES)) for (let i = 0; i < 3000; i++) assert(E.spin(k, 100, null).payout <= E.MAX_WIN * 100);
});
test('Starburst: el comodín solo aparece en los carretes 2, 3 y 4', () => {
  const g = E.GAMES.starburst;
  for (let i = 0; i < 5000; i++) for (const s of E.spin('starburst', 100, null).steps)
    for (let r = 0; r < g.rows; r++) for (const c of [0, 4]) assert.notStrictEqual(s.cells[r * g.cols + c], g.wild);
});
test('Starburst: máximo 3 respins', () => {
  for (let i = 0; i < 5000; i++) assert(E.spin('starburst', 100, null).steps.length <= 4);
});
test('Book of Dead: los giros gratis descuentan y el símbolo especial se expande', () => {
  const fs = { game: 'bod', left: 5, special: '🤠', bet: 100, acc: 0, mult: 0 };
  const r = E.spin('bod', 100, fs);
  assert(r.fs.left === 4 || r.fs.left === 14); assert.strictEqual(r.fs.special, '🤠');
  for (let i = 0; i < 2000; i++) {                  // tras la expansión (paso 2 en adelante) cada carrete tiene 0 o 3 símbolos especiales
    const x = E.spin('bod', 100, fs);
    x.steps.slice(1).forEach(s => { for (let c = 0; c < 5; c++) { const n = [0, 1, 2].filter(rw => s.cells[rw * 5 + c] === '🤠').length; assert(n === 0 || n === 3, 'carrete ' + c + ' con ' + n); } });
  }
});
test('los juegos de cascada activan giros gratis con 4+ scatters', () => {
  for (const k of ['gates', 'bonanza']) {
    let found = false;
    for (let i = 0; i < 20000 && !found; i++) { const r = E.spin(k, 100, null); if (r.fs) { found = true; assert(r.scatters >= 4); assert.strictEqual(r.fs.left, E.GAMES[k].fsCount); } }
    assert(found, k + ' no activó giros gratis en 20000 giros');
  }
});
test('apuesta mínima', () => { assert.strictEqual(E.normalizeBet('x'), 10); assert.strictEqual(E.normalizeBet(55.7), 55); });
test('RTP simulado Gates of Olympus ≈ 96 %', () => { const v = rtp('gates', 40000); assert(v > 0.75 && v < 1.2, 'rtp ' + v); });
test('RTP simulado Sweet Bonanza ≈ 96 %', () => { const v = rtp('bonanza', 40000); assert(v > 0.75 && v < 1.2, 'rtp ' + v); });
test('RTP simulado Book of Dead ≈ 96 %', () => { const v = rtp('bod', 60000); assert(v > 0.72 && v < 1.25, 'rtp ' + v); });
test('RTP simulado Starburst ≈ 96 %', () => { const v = rtp('starburst', 60000); assert(v > 0.88 && v < 1.05, 'rtp ' + v); });
console.log(`\n${ok} pruebas OK`);
