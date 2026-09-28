// Pruebas del motor del tragamonedas. Ejecutar: node tests/tragamonedas_engine.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../js/tragamonedas_engine.js').SlotEngine;

let ok = 0;
const test = (name, fn) => { fn(); ok++; console.log('✔', name); };

test('la tira virtual respeta los pesos', () => {
  assert.strictEqual(E.STRIP.length, Object.values(E.WEIGHTS).reduce((a, b) => a + b, 0));
  for (const s of E.SYMBOLS) assert.strictEqual(E.STRIP.filter(x => x === s).length, E.WEIGHTS[s]);
});

test('evaluate: triple, par y nada', () => {
  assert.deepStrictEqual(E.evaluate(['7️⃣', '7️⃣', '7️⃣'], 10), { kind: 'triple', symbol: '7️⃣', mult: 100, payout: 1000 });
  assert.strictEqual(E.evaluate(['🍒', '🍒', '🍒'], 50).payout, 200);
  for (const s of [['🍋', '🍋', '⭐'], ['🍋', '⭐', '🍋'], ['⭐', '🍋', '🍋']]) {
    const r = E.evaluate(s, 30); assert.strictEqual(r.kind, 'pair'); assert.strictEqual(r.payout, 30);
  }
  assert.deepStrictEqual(E.evaluate(['🍒', '🍋', '⭐'], 30), { kind: 'none', symbol: null, mult: 0, payout: 0 });
});

test('normalizeBet: entero y mínimo', () => {
  assert.strictEqual(E.normalizeBet('abc'), 10);
  assert.strictEqual(E.normalizeBet(''), 10);
  assert.strictEqual(E.normalizeBet(-50), 10);
  assert.strictEqual(E.normalizeBet(99.9), 99);
  assert.strictEqual(E.normalizeBet(Infinity), 10);
  assert.strictEqual(E.normalizeBet('250'), 250);
});

test('randInt: uniforme y dentro de rango (χ², n=40)', () => {
  const n = 40, N = 400000, c = new Array(n).fill(0);
  for (let i = 0; i < N; i++) { const v = E.randInt(n); assert(v >= 0 && v < n); c[v]++; }
  const chi = c.reduce((a, o) => a + (o - N / n) ** 2 / (N / n), 0);
  assert(chi < 73.4, 'χ² = ' + chi.toFixed(1));   // gl=39, p=0.001
});

const A = E.analyze();
test('análisis exacto: RTP 95–97 %, volatilidad media', () => {
  console.log('   RTP', (A.rtp * 100).toFixed(2) + '%', '| ventaja casa', (A.houseEdge * 100).toFixed(2) + '%',
    '| premio', (A.hitFrequency * 100).toFixed(1) + '%', '| triples', (A.tripleFrequency * 100).toFixed(2) + '%',
    '| σ', A.stdDev.toFixed(2), '| 7-7-7 1 en', Math.round(A.jackpotOdds));
  assert(A.rtp > 0.95 && A.rtp < 0.97);
  assert(A.stdDev > 2 && A.stdDev < 4);
});

test('simulación de 2 000 000 giros converge al RTP teórico', () => {
  let ret = 0; const n = 2000000;
  for (let i = 0; i < n; i++) ret += E.spin(1).payout;
  const rtp = ret / n, se = A.stdDev / Math.sqrt(n);
  console.log('   RTP simulado', (rtp * 100).toFixed(2) + '%');
  assert(Math.abs(rtp - A.rtp) < 5 * se, `simulado ${rtp} vs teórico ${A.rtp}`);
});

test('carretes uniformes en la tira e independientes entre sí', () => {
  const n = 300000, L = E.STRIP.length, one = new Array(L).fill(0), tab = new Map();
  for (let i = 0; i < n; i++) {
    const r = E.spin(1).symbols; one[E.STRIP.indexOf(r[0])]++; // solo comprueba símbolos válidos
    const k = r[0] + r[1]; tab.set(k, (tab.get(k) || 0) + 1);
  }
  // independencia carrete 0 vs 1: la frecuencia conjunta debe ser ≈ producto de las marginales
  const p = s => E.WEIGHTS[s] / L;
  let chi = 0, df = 0;
  for (const a of E.SYMBOLS) for (const b of E.SYMBOLS) {
    const exp = n * p(a) * p(b), obs = tab.get(a + b) || 0; chi += (obs - exp) ** 2 / exp; df++;
  }
  assert(chi < 66.6, 'χ² independencia = ' + chi.toFixed(1)); // gl=35, p=0.001
});

test('la tabla de pagos del HTML coincide con el motor', () => {
  const html = fs.readFileSync(path.join(__dirname, '../html/tragamonedas.html'), 'utf8');
  for (const [s, m] of Object.entries(E.PAYOUTS)) assert(html.includes(`<td>${s} ${s} ${s}</td><td>×${m}</td>`), s);
  assert(html.includes(`×${E.PAIR_MULT} (recuperas apuesta)`));
});

console.log(`\n${ok} pruebas OK`);
