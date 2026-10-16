// Evaluador Texas Hold’em: mejor cinco entre siete, sin acceso a saldo ni RNG.
(function(root) {
function combos5(arr) {
  const res = [], n = arr.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) res.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
  return res;
}
function scoreFive(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const isFlush = cards.every(c => c.suit === cards[0].suit);
  const uniq = [...new Set(ranks)];
  let isStraight = false, high = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; high = uniq[0]; }
    else if (uniq.join() === '14,5,4,3,2') { isStraight = true; high = 5; }
  }
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const g = Object.entries(counts).map(([r, c]) => [Number(r), c]).sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  if (isStraight && isFlush) return [8, high];
  if (g[0][1] === 4) return [7, g[0][0], g[1][0]];
  if (g[0][1] === 3 && g[1][1] === 2) return [6, g[0][0], g[1][0]];
  if (isFlush) return [5, ...ranks];
  if (isStraight) return [4, high];
  if (g[0][1] === 3) return [3, g[0][0], ...g.slice(1).map(x => x[0])];
  if (g[0][1] === 2 && g[1][1] === 2) return [2, g[0][0], g[1][0], g[2][0]];
  if (g[0][1] === 2) return [1, g[0][0], ...g.slice(1).map(x => x[0])];
  return [0, ...ranks];
}
function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const av = a[i] ?? 0, bv = b[i] ?? 0; if (av !== bv) return av - bv; }
  return 0;
}
// Devuelve la puntuación y las 5 cartas que forman la mejor mano
function bestHand(seven) {
  let best = null;
  for (const combo of combos5(seven)) {
    const s = scoreFive(combo);
    if (!best || compareScores(s, best.score) > 0) best = { score: s, cards: combo };
  }
  return best;
}
root.PokerEngine = { combos5, scoreFive, compareScores, bestHand };
if (typeof module !== 'undefined') module.exports = root.PokerEngine;
})(typeof window !== 'undefined' ? window : globalThis);
