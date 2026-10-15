// Reglas puras de la mesa S17. Sin DOM ni saldo.
(function (root) {
  'use strict';
function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return Number(card.rank);
}

// El As vale 11 mientras no te pases; si te pasas, vale 1.
function evaluate(cards) {
  let total = cards.reduce((s, c) => s + cardValue(c), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
  const natural = (cards, fromSplit = false) => !fromSplit && cards.length === 2 && evaluate(cards).total === 21;
  function settleHand(h, dealer) {
    const p = evaluate(h.cards).total, d = evaluate(dealer).total, dBJ = natural(dealer);
    let pay = 0, label;
    if (p > 21) label = `Bust: te pasaste con ${p}`;
    else if (natural(h.cards, h.fromSplit)) {
      if (dBJ) { pay = h.bet; label = 'Push: Blackjack para ambos'; }
      else { pay = Math.round(h.bet * 2.5); label = '¡Blackjack! Paga 3:2'; }
    } else if (dBJ) label = 'El repartidor tiene Blackjack';
    else if (d > 21) { pay = h.bet * 2; label = `Gana: el repartidor se pasa con ${d}`; }
    else if (p > d) { pay = h.bet * 2; label = `Gana ${p} contra ${d}`; }
    else if (p === d) { pay = h.bet; label = `Push: empate en ${p}`; }
    else label = `Pierde ${p} contra ${d}`;
    return { pay, net: pay - h.bet, label };
  }
  const dealerHits = cards => evaluate(cards).total < 17;
  root.BlackjackEngine = { cardValue, evaluate, natural, settleHand, dealerHits };
  if (typeof module !== 'undefined') module.exports = root.BlackjackEngine;
})(typeof window !== 'undefined' ? window : globalThis);
