// carreras_engine.js — caballos, probabilidades, cuotas, pagos y RNG (sin DOM; se puede probar en Node)
(function (root) {
  /* Cada caballo tiene velocidad, resistencia y forma (1-10). Su rating pondera las tres.
     En cada carrera la "condición del día" (±15 %, sorteada) modifica el rating, así que las cuotas cambian. */
  const HORSES = [
    { emoji: '🐎', name: 'Relámpago', speed: 9, stamina: 6, form: 8 },
    { emoji: '🐴', name: 'Trueno',    speed: 7, stamina: 8, form: 7 },
    { emoji: '🦄', name: 'Estrella',  speed: 6, stamina: 7, form: 6 },
    { emoji: '🐎', name: 'Fantasma',  speed: 7, stamina: 6, form: 6 },
    { emoji: '🐴', name: 'Corsario',  speed: 5, stamina: 5, form: 6 },
  ];
  const KINDS = { win: { label: 'Ganador (1.º)', top: 1 }, place: { label: 'Plaza (1.º o 2.º)', top: 2 }, show: { label: 'Show (top 3)', top: 3 } };
  const RTP = 0.92;            // retorno teórico al jugador (ventaja de la casa 8 %)
  const MIN_BET = 10, MIN_ODDS = 1.05, MAX_ODDS = 100, SPREAD = 4;   // SPREAD: cuánto separa el rating a los caballos
  const COND_MIN = 0.85, COND_MAX = 1.15;

  /* RNG: crypto.getRandomValues (CSPRNG) con rechazo para enteros y 53 bits para decimales. */
  const cr = root.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null);
  const buf = new Uint32Array(2);
  function randInt(n) {                       // entero uniforme en [0, n) sin sesgo de módulo
    const lim = Math.floor(4294967296 / n) * n;
    for (;;) { cr.getRandomValues(buf); if (buf[0] < lim) return buf[0] % n; }
  }
  function randFloat() { cr.getRandomValues(buf); return ((buf[0] >>> 5) * 67108864 + (buf[1] >>> 6)) / 9007199254740992; }

  const rating = h => 0.5 * h.speed + 0.3 * h.stamina + 0.2 * h.form;
  const newConds = () => HORSES.map(() => +(COND_MIN + randFloat() * (COND_MAX - COND_MIN)).toFixed(3));
  const validConds = c => Array.isArray(c) && c.length === HORSES.length && c.every(x => Number.isFinite(x) && x >= COND_MIN && x <= COND_MAX);

  const weights = conds => HORSES.map((h, i) => Math.pow(rating(h) * conds[i], SPREAD));

  // Probabilidad exacta de que cada caballo termine entre los `top` primeros (modelo Plackett-Luce, 5! órdenes)
  function topProbs(conds) {
    const w = weights(conds), n = w.length, out = { 1: Array(n).fill(0), 2: Array(n).fill(0), 3: Array(n).fill(0) };
    (function rec(order, used, p, rem) {
      if (order.length === 3) { order.forEach((h, k) => { for (let t = k + 1; t <= 3; t++) out[t][h] += p; }); return; }
      for (let i = 0; i < n; i++) if (!used[i]) {
        used[i] = true; order.push(i);
        rec(order, used, p * w[i] / rem, rem - w[i]);
        order.pop(); used[i] = false;
      }
    })([], Array(n).fill(false), 1, w.reduce((a, b) => a + b, 0));
    return out;
  }
  // La cuota se redondea hacia abajo a 1 decimal: nunca supera el RTP objetivo (salvo el mínimo de 1,05)
  const oddsFor = p => Math.min(MAX_ODDS, Math.max(MIN_ODDS, Math.floor(RTP / p * 10) / 10));

  function buildRace(conds) {
    if (!validConds(conds)) throw new Error('condiciones inválidas');
    const tp = topProbs(conds);
    return {
      conds,
      horses: HORSES.map((h, i) => ({
        ...h, id: i, rating: rating(h) * conds[i],
        prob: { win: tp[1][i], place: tp[2][i], show: tp[3][i] },
        odds: { win: oddsFor(tp[1][i]), place: oddsFor(tp[2][i]), show: oddsFor(tp[3][i]) },
      })),
    };
  }
  const newRace = () => buildRace(newConds());

  // Orden de llegada completo: se elige el 1.º con probabilidad ∝ peso, luego el 2.º entre los restantes, etc.
  function drawOrder(race) {
    const w = weights(race.conds), left = w.map((_, i) => i), order = [];
    while (left.length) {
      let r = randFloat() * left.reduce((a, i) => a + w[i], 0), k = 0;
      while (k < left.length - 1 && r >= w[left[k]]) { r -= w[left[k]]; k++; }
      order.push(left.splice(k, 1)[0]);
    }
    return order;
  }
  // Tiempos para la animación, coherentes con el orden (nunca hay empates ni adelantamientos falsos)
  function times(order) {
    const t = Array(order.length).fill(0);
    order.forEach((h, rank) => { t[h] = 3.2 + rank * 0.45 + randFloat() * 0.2; });
    return t;
  }
  const isOrder = (o, n) => Array.isArray(o) && o.length === n && new Set(o).size === n && o.every(x => Number.isInteger(x) && x >= 0 && x < n);
  const normalizeBet = v => Math.max(MIN_BET, Math.floor(Number(v) || 0));

  function settle(race, order, pick, kind, bet) {
    const rank = order.indexOf(pick) + 1, odds = race.horses[pick].odds[kind];
    const won = rank >= 1 && rank <= KINDS[kind].top;
    return { rank, odds, won, payout: won ? Math.floor(bet * odds) : 0 };
  }
  // RTP exacto de una apuesta (para auditoría): Σ prob · cuota efectiva
  const rtp = (race, pick, kind) => race.horses[pick].prob[kind] * race.horses[pick].odds[kind];

  root.RaceEngine = { HORSES, KINDS, RTP, MIN_BET, newRace, buildRace, validConds, drawOrder, times, isOrder, settle, normalizeBet, rtp, randInt };
  if (typeof module !== 'undefined') module.exports = root.RaceEngine;
})(typeof window !== 'undefined' ? window : globalThis);
