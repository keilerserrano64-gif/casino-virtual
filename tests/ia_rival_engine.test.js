// node tests/ia_rival_engine.test.js
const assert = require('assert');
const R = require('../js/ia_rival_engine.js');
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✔', name); };

// Un jugador humano simulado: apuesta con riesgo m (mezcla), con la ventaja real de la casa.
function humano(st, game, rounds, mix, bet, rand) {
  for (let i = 0; i < rounds; i++) {
    const m = mix[Math.floor(rand() * mix.length)];
    const won = rand() < (1 - R.EDGE[game]) / m;
    R.learn(st, game, bet, won ? Math.round(bet * m) : 0);
  }
}
const share = (st, game, m, rand, k = 3000) => { let c = 0; for (let i = 0; i < k; i++) if (R.play(st, game, rand).mult === m) c++; return c / k; };

ok('recupera la mezcla de riesgo del jugador (50 % ×2 y 50 % ×10)', () => {
  const rnd = seeded(1), st = R.newState(); humano(st, 'Ruleta', 4000, [2, 10], 50, rnd);
  const s10 = share(st, 'Ruleta', 10, rnd); assert.ok(s10 > 0.4 && s10 < 0.6, 'x10 = ' + s10);
});
ok('imita el tamaño de apuesta', () => {
  const rnd = seeded(2), st = R.newState(); humano(st, 'Dados', 60, [2], 200, rnd);
  assert.strictEqual(R.play(st, 'Dados', rnd).bet, 200);
});
ok('juega con la misma ventaja de la casa (RTP ≈ 1 - edge)', () => {
  const rnd = seeded(3), st = R.newState(); humano(st, 'Carreras', 400, [3], 100, rnd);
  let ap = 0, ga = 0; for (let i = 0; i < 20000; i++) { const g = R.game(st, 'Carreras'); g.bal = 1e6; const r = R.play(st, 'Carreras', rnd); ap += r.bet; ga += r.payout; }
  const rtp = ga / ap; assert.ok(Math.abs(rtp - 0.92) < 0.05, 'RTP = ' + rtp);
});
ok('se adapta si el jugador cambia de estilo', () => {
  const rnd = seeded(4), st = R.newState(); humano(st, 'Ruleta', 1500, [10], 50, rnd);
  const antes = share(st, 'Ruleta', 10, rnd); humano(st, 'Ruleta', 700, [2], 50, rnd);
  assert.ok(antes > 0.7 && share(st, 'Ruleta', 10, rnd) < 0.25);
});
ok('recompra si se queda sin saldo y nunca apuesta más de lo que tiene', () => {
  const st = R.newState(), g = R.game(st, 'Bingo'); g.bal = 5; const r = R.play(st, 'Bingo', () => 0.99);
  assert.ok(g.rebuys === 1 && r.bet <= 1000);
});
ok('ignora juegos que no son suyos (tragamonedas) y datos corruptos', () => {
  const st = R.newState(); R.learn(st, 'Tragamonedas', 10, 0); assert.strictEqual(st.rounds, 0);
  assert.strictEqual(R.load('basura').rounds, 0);
});
console.log(`\n${n} pruebas OK`);
