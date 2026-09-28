// tragamonedas_engine.js — reglas, pagos y RNG del Tragamonedas (sin DOM, se puede probar en Node)
(function (root) {
  const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣'];

  /* ---------- Configuración matemática ----------
     Cada carrete es una tira virtual de 40 posiciones. El peso de un símbolo es cuántas
     posiciones ocupa: los símbolos de más premio ocupan menos y por eso salen menos.
     Los 3 carretes usan la misma tira, pero cada parada se sortea de forma independiente.
     Con estos pesos y pagos: RTP teórico ≈ 95,96 %, volatilidad media (desv. típica ≈ 2,7 apuestas). */
  const WEIGHTS = { '🍒': 17, '🍋': 5, '🍊': 5, '⭐': 5, '💎': 5, '7️⃣': 3 };
  const PAYOUTS = { '7️⃣': 100, '💎': 30, '⭐': 15, '🍊': 10, '🍋': 6, '🍒': 4 };  // triple: multiplicador de la apuesta
  const PAIR_MULT = 1;      // dos símbolos iguales: recuperas la apuesta
  const MIN_BET = 10;
  const REELS = 3;

  const STRIP = [];
  (function buildStrip() {
    const left = { ...WEIGHTS };
    let remaining = Object.values(left).reduce((a, b) => a + b, 0);
    // intercala los símbolos para que la tira no quede en bloques (no cambia las probabilidades)
    while (remaining > 0) {
      for (const s of SYMBOLS) if (left[s] > 0) { STRIP.push(s); left[s]--; remaining--; }
    }
  })();

  /* ---------- RNG ----------
     crypto.getRandomValues (CSPRNG del navegador) con rechazo de los valores que
     repartirían el rango de forma desigual (sin sesgo de módulo). Cada giro es independiente. */
  const buf = new Uint32Array(32);
  let pos = buf.length;
  function refill() {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (c) c.getRandomValues(buf);
    else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 4294967296);
    pos = 0;
  }
  function randInt(n) {                       // entero uniforme en [0, n)
    const limit = 4294967296 - (4294967296 % n);
    for (;;) {
      if (pos >= buf.length) refill();
      const v = buf[pos++];
      if (v < limit) return v % n;
    }
  }

  /* ---------- Apuesta ---------- */
  // Devuelve un entero >= MIN_BET (o MIN_BET si el valor no es válido).
  function normalizeBet(raw) {
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) ? Math.max(MIN_BET, n) : MIN_BET;
  }

  /* ---------- Resultado ---------- */
  function evaluate(symbols, bet) {
    const [a, b, c] = symbols;
    if (a === b && b === c) {
      const mult = PAYOUTS[a];
      return { kind: 'triple', symbol: a, mult, payout: bet * mult };
    }
    if (a === b || b === c || a === c) return { kind: 'pair', symbol: null, mult: PAIR_MULT, payout: bet * PAIR_MULT };
    return { kind: 'none', symbol: null, mult: 0, payout: 0 };
  }

  function spin(bet) {
    const stops = [];
    for (let i = 0; i < REELS; i++) stops.push(randInt(STRIP.length));
    const symbols = stops.map(s => STRIP[s]);
    return { symbols, bet, ...evaluate(symbols, bet) };
  }

  /* ---------- Análisis exacto ----------
     Recorre las 40³ combinaciones de paradas (todas equiprobables) y calcula RTP,
     frecuencia de premio y volatilidad reales del juego. */
  function analyze() {
    const n = STRIP.length, total = n ** REELS;
    let sumMult = 0, sumSq = 0, hits = 0, triples = 0, pairs = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
      const r = evaluate([STRIP[i], STRIP[j], STRIP[k]], 1);
      sumMult += r.mult; sumSq += r.mult * r.mult;
      if (r.kind === 'triple') { triples++; hits++; } else if (r.kind === 'pair') { pairs++; hits++; }
    }
    const rtp = sumMult / total;
    return {
      combinations: total, rtp, houseEdge: 1 - rtp,
      hitFrequency: hits / total, tripleFrequency: triples / total, pairFrequency: pairs / total,
      stdDev: Math.sqrt(sumSq / total - rtp * rtp),
      jackpotOdds: total / (WEIGHTS['7️⃣'] ** REELS),   // 1 entre N para 7️⃣ 7️⃣ 7️⃣
    };
  }

  root.SlotEngine = { SYMBOLS, WEIGHTS, PAYOUTS, PAIR_MULT, MIN_BET, REELS, STRIP, randInt, normalizeBet, evaluate, spin, analyze };
})(typeof window !== 'undefined' ? window : module.exports);
