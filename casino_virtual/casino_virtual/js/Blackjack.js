// Blackjack.js — lógica de Blackjack.html (usa RC de app.js)
RC.initHeader();

const SUITS = [{s:'♠',c:'black'},{s:'♣',c:'black'},{s:'♥',c:'red'},{s:'♦',c:'red'}];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

let deck = [], playerHand = [], dealerHand = [], bet = 0, roundOver = true;

const dealerCardsEl = document.getElementById('dealerCards');
const playerCardsEl = document.getElementById('playerCards');
const dealerScoreEl = document.getElementById('dealerScore');
const playerScoreEl = document.getElementById('playerScore');
const msgEl = document.getElementById('bjMsg');
const dealBtn = document.getElementById('dealBtn');
const hitBtn = document.getElementById('hitBtn');
const standBtn = document.getElementById('standBtn');
const betInput = document.getElementById('bet');
const betRow = document.getElementById('betRow');

document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
  });
});

function freshDeck() {
  const d = [];
  for (const suit of SUITS) for (const rank of RANKS) d.push({ rank, suit: suit.s, color: suit.c });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J','Q','K'].includes(card.rank)) return 10;
  return Number(card.rank);
}

function handScore(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function renderCard(card, faceDown) {
  const el = document.createElement('div');
  el.className = 'card' + (faceDown ? ' hidden' : (card.color === 'red' ? ' red' : ''));
  if (!faceDown) el.innerHTML = `<div>${card.rank}</div><div class="suit">${card.suit}</div>`;
  return el;
}

function renderTable(hideDealerHole) {
  dealerCardsEl.innerHTML = '';
  dealerHand.forEach((c, i) => dealerCardsEl.appendChild(renderCard(c, hideDealerHole && i === 1)));
  playerCardsEl.innerHTML = '';
  playerHand.forEach(c => playerCardsEl.appendChild(renderCard(c, false)));
  playerScoreEl.textContent = handScore(playerHand);
  dealerScoreEl.textContent = hideDealerHole ? cardValue(dealerHand[0]) + ' + ?' : handScore(dealerHand);
}

dealBtn.addEventListener('click', () => {
  const b = Math.max(10, Math.floor(Number(betInput.value) || 0));
  if (b > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  bet = b;
  betInput.value = bet;
  RC.addCoins(-bet);

  deck = freshDeck();
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];
  roundOver = false;
  msgEl.textContent = 'Pide una carta o plántate.';
  renderTable(true);

  dealBtn.disabled = true;
  betRow.style.opacity = '.5';
  hitBtn.disabled = false;
  standBtn.disabled = false;

  // blackjack natural: se comprueba también el de la banca
  const pBJ = handScore(playerHand) === 21, dBJ = handScore(dealerHand) === 21;
  if (pBJ && dBJ) finishRound('push-bj');
  else if (pBJ) finishRound('blackjack');
  else if (dBJ) finishRound('dealer-bj');
});

hitBtn.addEventListener('click', () => {
  if (roundOver) return;
  playerHand.push(deck.pop());
  renderTable(true);
  const s = handScore(playerHand);
  if (s > 21) finishRound('bust');
  else if (s === 21) dealerPlay(); // 21 → planta automática
});

standBtn.addEventListener('click', () => {
  if (!roundOver) dealerPlay();
});

function dealerPlay() {
  while (handScore(dealerHand) < 17) dealerHand.push(deck.pop());
  finishRound('showdown');
}

function finishRound(reason) {
  roundOver = true;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = false;
  betRow.style.opacity = '1';
  renderTable(false);

  const pScore = handScore(playerHand);
  const dScore = handScore(dealerHand);
  let outcome = 'lose', payout = 0, text = '';

  if (reason === 'bust') {
    text = `Te pasaste con ${pScore}. Pierdes ${RC.formatNumber(bet)} monedas.`;
  } else if (reason === 'dealer-bj') {
    text = `El repartidor tiene Blackjack. Pierdes ${RC.formatNumber(bet)} monedas.`;
  } else if (reason === 'push-bj') {
    outcome = 'push'; payout = bet;
    text = 'Blackjack para ambos. Recuperas tu apuesta.';
  } else if (reason === 'blackjack') {
    outcome = 'win'; payout = Math.round(bet * 2.5);
    text = `¡Blackjack! Ganas ${RC.formatNumber(payout)} monedas.`;
  } else if (dScore > 21) {
    outcome = 'win'; payout = bet * 2;
    text = `El repartidor se pasa con ${dScore}. Ganas ${RC.formatNumber(payout)} monedas.`;
  } else if (pScore > dScore) {
    outcome = 'win'; payout = bet * 2;
    text = `Ganas ${pScore} contra ${dScore}. +${RC.formatNumber(payout)} monedas.`;
  } else if (pScore === dScore) {
    outcome = 'push'; payout = bet;
    text = `Empate en ${pScore}. Recuperas tu apuesta.`;
  } else {
    text = `El repartidor gana con ${dScore} contra ${pScore}.`;
  }

  if (payout > 0) RC.addCoins(payout);
  msgEl.textContent = text;
  RC.toast(outcome === 'win' ? 'win' : (outcome === 'push' ? 'info' : 'lose'), text);
  RC.registerGameResult('Blackjack', outcome === 'win', bet, payout);
}