// ia_rival_engine.js — "Rival IA": aprende cómo juegas (tamaño de apuesta y nivel de riesgo) y juega
// por su cuenta como tú, con su propio saldo, para que compitas contra tu propia sombra.
// NO toca los resultados del juego: el rival usa su propio azar con la MISMA ventaja de la casa.
// Sin DOM; se prueba en Node (node tests/ia_rival_engine.test.js).
(function (root) {
  const EDGE = { Ruleta: 0.027, Blackjack: 0.02, Dados: 0.03, Carreras: 0.08, Bingo: 0.14 };  // ventaja de la casa por juego
  const DECAY = 0.985, KEEP_BETS = 30, START = 1000, MIN_BET = 10;

  const newState = () => ({ v: 1, rounds: 0, games: {} });
  function game(st, name) {
    return st.games[name] || (st.games[name] = { w: {}, bets: [], bal: START, net: 0, hnet: 0, n: 0, rebuys: 0 });
  }
  function load(raw) {
    const st = newState();
    try { if (raw && raw.v === 1 && raw.games) { st.rounds = +raw.rounds || 0; for (const k of Object.keys(EDGE)) if (raw.games[k]) Object.assign(game(st, k), raw.games[k]); } } catch (e) {}
    return st;
  }

  // Aprende de una jugada TUYA. payout = lo que te devolvieron (total, no ganancia).
  // Riesgo: una victoria con multiplicador m ocurre con prob ≈ (1-edge)/m, así que cada victoria
  // pesa m para recuperar la mezcla real de apuestas (también las perdidas, cuyo multiplicador no vemos).
  function learn(st, name, wager, payout) {
    if (!EDGE[name] || !(wager > 0)) return;
    const G = game(st, name);
    G.n++; st.rounds++; G.hnet += payout - wager;
    G.bets.push(wager); if (G.bets.length > KEEP_BETS) G.bets.shift();
    for (const k of Object.keys(G.w)) G.w[k] *= DECAY;
    const m = payout / wager;
    if (m > 1.05) { const k = (Math.round(m * 2) / 2).toFixed(1); G.w[k] = (G.w[k] || 0) + m; }
  }

  function pickRisk(G, rand) {
    const ks = Object.keys(G.w); if (!ks.length) return 2;
    const tot = ks.reduce((a, k) => a + G.w[k], 0); let x = rand() * tot;
    for (const k of ks) { x -= G.w[k]; if (x <= 0) return +k; }
    return +ks[ks.length - 1];
  }

  // El rival juega una ronda "como tú".
  function play(st, name, rand = Math.random) {
    const G = game(st, name);
    if (G.bal < MIN_BET) { G.bal = START; G.rebuys++; }
    const base = G.bets.length ? G.bets[Math.floor(rand() * G.bets.length)] : MIN_BET;
    const bet = Math.max(MIN_BET, Math.min(Math.floor(G.bal), Math.round(base)));
    const m = pickRisk(G, rand), won = rand() < (1 - EDGE[name]) / m, payout = won ? Math.round(bet * m) : 0;
    G.bal += payout - bet; G.net += payout - bet;
    return { bet, mult: m, won, payout };
  }

  const confidence = (st, name) => Math.min(1, game(st, name).n / 30);
  const avgRisk = (st, name) => { const G = game(st, name), ks = Object.keys(G.w), t = ks.reduce((a, k) => a + G.w[k], 0); return t ? ks.reduce((a, k) => a + k * G.w[k], 0) / t : 2; };
  const avgBet = (st, name) => { const b = game(st, name).bets; return b.length ? Math.round(b.reduce((a, x) => a + x, 0) / b.length) : 0; };

  const api = { EDGE, newState, load, learn, play, game, confidence, avgRisk, avgBet };
  root.RCRivalEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
