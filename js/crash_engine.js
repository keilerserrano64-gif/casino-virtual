// crash_engine.js — motor de los Crash Games (Aviator, Spaceman, JetX, Cricket X). Sin DOM; se prueba en Node.
(function (root) {
  const MIN_BET = 10, MAX_MULT = 1000, EDGE = 0.03;      // ventaja de la casa 3 % → RTP teórico 97 %
  /* k = velocidad de crecimiento: multiplicador(t) = e^(k·t). half = permite retirar el 50 % a mitad de vuelo. */
  const GAMES = {
    aviator:  { name: 'Aviator',   studio: 'Spribe',            icon: '✈️', k: 0.085, half: false, slots: 1, stats: false, fall: '💥' },
    spaceman: { name: 'Spaceman',  studio: 'Pragmatic Play',    icon: '🧑‍🚀', k: 0.075, half: true,  slots: 1, stats: false, fall: '🌑' },
    jetx:     { name: 'JetX',      studio: 'Smartsoft Gaming',  icon: '🛩️', k: 0.100, half: false, slots: 1, stats: false, fall: '💥' },
    cricketx: { name: 'Cricket X', studio: 'Smartsoft Gaming',  icon: '🏏', k: 0.090, half: false, slots: 1, stats: false, fall: '❌' },
    aero:     { name: 'Aero',      studio: 'Turbo Games',       icon: '🛫', k: 0.095, half: false, slots: 1, stats: true,  fall: '💥' },
    zeppelin: { name: 'Zeppelin',  studio: 'Betsolutions',      icon: '🎈', k: 0.080, half: false, slots: 2, stats: false, fall: '💥' },
    spacexy:  { name: 'Space XY',  studio: 'BGaming',           icon: '🚀', k: 0.130, half: false, slots: 1, stats: false, fall: '🌌' },
    bigbass:  { name: 'Big Bass Crash', studio: 'Pragmatic Play', icon: '🎣', k: 0.085, half: false, slots: 1, stats: false, fall: '🦈' },
    cashit:   { name: 'Cash It',   studio: 'Playtech',          icon: '💸', k: 0.090, half: false, slots: 1, stats: false, fall: '💥' },
    highstriker: { name: 'High Striker', studio: 'Evoplay',     icon: '📈', k: 0.160, half: false, slots: 1, stats: false, chart: true, fall: '📉' },
  };


  /* RNG: crypto.getRandomValues (CSPRNG), 53 bits para el decimal en [0,1). */
  const cr = root.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null);
  function rand() {
    const a = new Uint32Array(2); cr.getRandomValues(a);
    return ((a[0] >>> 5) * 67108864 + (a[1] >>> 6)) / 9007199254740992;
  }

  // Punto de caída: P(caída ≥ x) = (1 − EDGE) / x para x ≥ 1. Con u < EDGE-ish cae en 1.00x (pierde todo).
  function crashFrom(u) {
    const m = Math.floor(100 * (1 - EDGE) / (1 - u)) / 100;
    return Math.min(MAX_MULT, Math.max(1, m));
  }
  const crashPoint = () => crashFrom(rand());

  const multAt = (t, k) => Math.max(1, Math.floor(100 * Math.exp(k * t)) / 100);   // multiplicador a los t segundos
  const timeAt = (m, k) => Math.log(m) / k;                                        // segundos hasta llegar a m
  const payoutFor = (stake, m) => Math.floor(stake * m);
  const halfStake = bet => Math.floor(bet / 2);
  const normalizeBet = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= MIN_BET ? n : MIN_BET; };

  root.CrashEngine = { GAMES, MIN_BET, MAX_MULT, EDGE, rand, crashFrom, crashPoint, multAt, timeAt, payoutFor, halfStake, normalizeBet };
  if (typeof module !== 'undefined') module.exports = root.CrashEngine;
})(typeof window !== 'undefined' ? window : globalThis);
