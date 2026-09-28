// craps_engine.js — reglas, pagos y RNG del Craps (sin DOM, se puede probar en Node)
(function (root) {
  const NUMS = [4, 5, 6, 8, 9, 10];

  /* ---------- RNG ----------
     Usa crypto.getRandomValues (CSPRNG del navegador) y descarta valores >= 252
     para que 256 no se reparta de forma desigual entre 6 caras (rechazo, sin sesgo de módulo). */
  const buf = new Uint8Array(64);
  let pos = buf.length;
  function refill() {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (c) c.getRandomValues(buf);
    else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    pos = 0;
  }
  function rollDie() {
    for (;;) {
      if (pos >= buf.length) refill();
      const v = buf[pos++];
      if (v < 252) return (v % 6) + 1;
    }
  }

  /* ---------- Pagos ---------- */
  const PASS_ODDS = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] };
  const LAY_ODDS  = { 4: [1, 2], 10: [1, 2], 5: [2, 3], 9: [2, 3], 6: [5, 6], 8: [5, 6] };
  const PLACE_PAY = { 4: [9, 5], 10: [9, 5], 5: [7, 5], 9: [7, 5], 6: [7, 6], 8: [7, 6] };
  const PROP_HIT  = { any7: [7], anycraps: [2, 3, 12], eleven: [11], aces: [2], twelve: [12], acedeuce: [3] };
  const PROP_PAY  = { any7: 4, anycraps: 7, eleven: 15, aces: 30, twelve: 30, acedeuce: 15 };
  const frac = (a, r) => Math.floor(a * r[0] / r[1]);

  function merge(list) {
    const out = [];
    for (const b of list) {
      const f = out.find(x => x.type === b.type && (x.num || null) === (b.num || null));
      if (f) f.amount += b.amount; else out.push({ ...b });
    }
    return out;
  }

  /* Resuelve una tirada.
     bets: [{type, num?, amount}], point: null|4..10, s: suma (2..12)
     Devuelve { bets, lines, wager, ret, point, event, cycleEnded } */
  function settleRoll(bets, point, s) {
    const keep = [], lines = [];
    let wager = 0, ret = 0;
    const line = (b, result, win) => lines.push({ type: b.type, num: b.num || null, amount: b.amount, result, win: win || 0 });
    const done = (b, result, win = 0) => {
      wager += b.amount;
      if (result === 'win') ret += b.amount + win; else if (result === 'push') ret += b.amount;
      line(b, result, win);
    };
    const stay = b => keep.push({ ...b });

    for (const b of bets) {
      const a = b.amount, n = b.num;
      switch (b.type) {
        case 'field':
          if ([3, 4, 9, 10, 11].includes(s)) done(b, 'win', a);
          else if (s === 2) done(b, 'win', 2 * a);       // el 2 paga 2 a 1
          else if (s === 12) done(b, 'win', 3 * a);      // el 12 paga 3 a 1 (ventaja de la casa 2,78 %)
          else done(b, 'lose');
          break;
        case 'any7': case 'anycraps': case 'eleven': case 'aces': case 'twelve': case 'acedeuce':
          if (PROP_HIT[b.type].includes(s)) done(b, 'win', a * PROP_PAY[b.type]); else done(b, 'lose');
          break;
        case 'pass':
          if (!point) {
            if (s === 7 || s === 11) done(b, 'win', a);
            else if (s === 2 || s === 3 || s === 12) done(b, 'lose');
            else stay(b);
          } else if (s === point) done(b, 'win', a);
          else if (s === 7) done(b, 'lose');
          else stay(b);
          break;
        case 'passodds':
          if (point && s === point) done(b, 'win', frac(a, PASS_ODDS[point]));
          else if (point && s === 7) done(b, 'lose');
          else stay(b);
          break;
        case 'dp':
          if (!point) {
            if (s === 2 || s === 3) done(b, 'win', a);
            else if (s === 12) done(b, 'push');
            else if (s === 7 || s === 11) done(b, 'lose');
            else stay(b);
          } else if (s === 7) done(b, 'win', a);
          else if (s === point) done(b, 'lose');
          else stay(b);
          break;
        case 'dpodds':
          if (point && s === 7) done(b, 'win', frac(a, LAY_ODDS[point]));
          else if (point && s === point) done(b, 'lose');
          else stay(b);
          break;
        case 'come':
          if (s === 7 || s === 11) done(b, 'win', a);
          else if (s === 2 || s === 3 || s === 12) done(b, 'lose');
          else { line(b, 'move', 0); keep.push({ type: 'comeN', num: s, amount: a }); }
          break;
        case 'comeN':
          if (s === n) done(b, 'win', a); else if (s === 7) done(b, 'lose'); else stay(b);
          break;
        case 'dcome':
          if (s === 2 || s === 3) done(b, 'win', a);
          else if (s === 12) done(b, 'push');
          else if (s === 7 || s === 11) done(b, 'lose');
          else { line(b, 'move', 0); keep.push({ type: 'dcomeN', num: s, amount: a }); }
          break;
        case 'dcomeN':
          if (s === 7) done(b, 'win', a); else if (s === n) done(b, 'lose'); else stay(b);
          break;
        case 'place':
          if (!point) stay(b);                       // las Place están "apagadas" en la salida
          else if (s === n) { const w = frac(a, PLACE_PAY[n]); ret += w; line(b, 'win', w); stay(b); }
          else if (s === 7) done(b, 'lose');
          else stay(b);
          break;
        default: stay(b);
      }
    }

    let newPoint = point, event = 'none', cycleEnded = false;
    if (!point) {
      if (NUMS.includes(s)) { newPoint = s; event = 'pointSet'; }
      else if (s === 7 || s === 11) event = 'natural';
      else if (s === 2 || s === 3 || s === 12) event = 'craps';
    } else if (s === point) { newPoint = null; event = 'pointMade'; cycleEnded = true; }
    else if (s === 7) { newPoint = null; event = 'sevenOut'; cycleEnded = true; }

    return { bets: merge(keep), lines, wager, ret, point: newPoint, event, cycleEnded };
  }

  root.CrapsEngine = { NUMS, rollDie, settleRoll, merge, PASS_ODDS, LAY_ODDS, PLACE_PAY, PROP_PAY };
})(typeof window !== 'undefined' ? window : module.exports);
