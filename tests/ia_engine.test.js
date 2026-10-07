// node tests/ia_engine.test.js
const assert = require('assert');
const IA = require('../js/ia_engine.js');
const NO_NOISE = () => 0.5;                       // evita el 7 % aleatorio
const raise = (m, eq) => IA.decideRaise(m, { stage: 1, eq, pot: 100, r: 10 }, NO_NOISE);
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✔', name); };

ok('modelo nuevo: sube con mano fuerte y no de farol con mano débil', () => {
  const m = IA.newModel(); assert.strictEqual(raise(m, 0.9), true); assert.strictEqual(raise(m, 0.2), false);
});
ok('aprende que el jugador siempre se retira ante subidas → hace faroles', () => {
  const m = IA.newModel();
  for (let i = 0; i < 30; i++) { IA.observe(m, 1, true, true); IA.observe(m, 1, false, false); }
  assert.strictEqual(raise(m, 0.2), true);
});
ok('aprende que el jugador nunca se retira → no hace faroles pero sube con mano fuerte', () => {
  const m = IA.newModel();
  for (let i = 0; i < 30; i++) { IA.observe(m, 1, true, false); IA.observe(m, 1, false, false); }
  assert.strictEqual(raise(m, 0.2), false); assert.strictEqual(raise(m, 0.9), true);
});
ok('se adapta si el jugador cambia de estilo (olvida lo viejo)', () => {
  const m = IA.newModel();
  for (let i = 0; i < 30; i++) IA.observe(m, 1, true, true);
  const antes = IA.foldProb(m, 1, true);
  for (let i = 0; i < 60; i++) IA.observe(m, 1, true, false);
  assert.ok(antes > 0.9 && IA.foldProb(m, 1, true) < 0.25);
});
ok('confianza crece con las observaciones y se limita a 1', () => {
  const m = IA.newModel(); assert.strictEqual(IA.confidence(m), 0);
  for (let i = 0; i < 100; i++) IA.observe(m, 2, false, false); assert.strictEqual(IA.confidence(m), 1);
});
ok('load() ignora datos corruptos y conserva los válidos', () => {
  assert.strictEqual(IA.load('basura').obs, 0);
  const m = IA.newModel(); IA.observe(m, 1, true, true);
  assert.strictEqual(IA.load(JSON.parse(JSON.stringify(m))).obs, 1);
});
console.log(`\n${n} pruebas OK`);
