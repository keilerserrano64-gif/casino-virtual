// poker.js — lógica de poker.html (usa RC de app.js)

RC.initHeader();

const SUITS = ['♠','♣','♥','♦'];
const RED_SUITS = new Set(['♥','♦']);
const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
const RANK_LABEL = { 11:'J', 12:'Q', 13:'K', 14:'A' };

let deck = [], playerHole = [], botHole = [], community = [], pot = 0, ante = 0, stage = 0, roundOver = true;
const STAGES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

const botCardsEl = document.getElementById('botCards');
const playerCardsEl = document.getElementById('playerCards');
const communityEl = document.getElementById('community');
const potLine = document.getElementById('potLine');
const msgEl = document.getElementById('pokerMsg');
const dealBtn = document.getElementById('dealBtn');
const betBtn = document.getElementById('betBtn');
const foldBtn = document.getElementById('foldBtn');
const betInput = document.getElementById('bet');

function freshDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function label(card) { return RANK_LABEL[card.rank] || card.rank; }

function renderCard(card, hidden) {
  const el = document.createElement('div');
  el.className = 'card' + (hidden ? ' hidden' : (RED_SUITS.has(card.suit) ? ' red' : ''));
  if (!hidden) el.innerHTML = `<div>${label(card)}</div><div class="suit">${card.suit}</div>`;
  return el;
}

function renderSlot() {
  const el = document.createElement('div');
  el.className = 'card slot';
  return el;
}

function render(showBot) {
  botCardsEl.innerHTML = '';
  botHole.forEach(c => botCardsEl.appendChild(renderCard(c, !showBot)));

  playerCardsEl.innerHTML = '';
  playerHole.forEach(c => playerCardsEl.appendChild(renderCard(c, false)));

  communityEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < community.length) communityEl.appendChild(renderCard(community[i], false));
    else communityEl.appendChild(renderSlot());
  }

  potLine.textContent = `Bote: ${RC.formatNumber(pot)}`;
}

/* ---- Evaluación de manos (7 cartas -> mejor 5) ---- */
function combos5(arr) {
  const res = [];
  const n = arr.length;
  for (let a = 0; a < n; a++) for (let b = a+1; b < n; b++) for (let c = b+1; c < n; c++)
    for (let d = c+1; d < n; d++) for (let e = d+1; e < n; e++)
      res.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
  return res;
}

function scoreFive(cards) {
  const ranks = cards.map(c => c.rank).sort((a,b) => b-a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const uniqueRanks = [...new Set(ranks)];
  let isStraight = false, straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) { isStraight = true; straightHigh = uniqueRanks[0]; }
    else if (JSON.stringify(uniqueRanks) === JSON.stringify([14,5,4,3,2])) { isStraight = true; straightHigh = 5; }
  }
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const groups = Object.entries(counts).map(([r,c]) => [Number(r), c]).sort((x,y) => y[1]-x[1] || y[0]-x[0]);

  if (isStraight && isFlush) return [8, straightHigh];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (isFlush) return [5, ...ranks];
  if (isStraight) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(g=>g[0])];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(g=>g[0])];
  return [0, ...ranks];
}

function bestScore(sevenCards) {
  let best = null;
  for (const combo of combos5(sevenCards)) {
    const s = scoreFive(combo);
    if (!best || compareScores(s, best) > 0) best = s;
  }
  return best;
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0, bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

const HAND_NAMES = ['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full house','Póker','Escalera de color'];

/* ---- Flujo de juego ---- */

dealBtn.addEventListener('click', () => {
  const b = Math.max(10, Math.floor(Number(betInput.value) || 0));
  const user = RC.getUser();
  if (b * 2 > user.coins) { RC.toast('lose', 'No tienes monedas suficientes para esta apuesta.'); return; }
  ante = b;
  betInput.value = ante;
  RC.addCoins(-ante);
  pot = ante;
  stage = 0;
  community = [];

  deck = freshDeck();
  playerHole = [deck.pop(), deck.pop()];
  botHole = [deck.pop(), deck.pop()];

  render(false);
  msgEl.textContent = 'Ronda preflop. ¿Apuestas o te retiras?';
  dealBtn.disabled = true;
  document.getElementById('betRow').style.opacity = '.5';
  betBtn.disabled = false;
  foldBtn.disabled = false;
});

betBtn.addEventListener('click', () => {
  const user = RC.getUser();
  if (ante > user.coins) { RC.toast('lose', 'No tienes monedas suficientes para igualar.'); return; }
  RC.addCoins(-ante);
  pot += ante * 2; // jugador iguala, banca iguala automáticamente
  stage++;

  if (stage === 1) { community.push(deck.pop(), deck.pop(), deck.pop()); msgEl.textContent = 'Flop revelado. ¿Apuestas o te retiras?'; }
  else if (stage === 2) { community.push(deck.pop()); msgEl.textContent = 'Turn revelado. ¿Apuestas o te retiras?'; }
  else if (stage === 3) { community.push(deck.pop()); msgEl.textContent = 'River revelado.'; render(false); showdown(); return; }

  render(false);
});

foldBtn.addEventListener('click', () => {
  msgEl.textContent = `Te retiras. Pierdes ${RC.formatNumber(pot - ante)} monedas ya apostadas... y la mano.`;
  RC.toast('lose', `Te retiraste. Pierdes ${RC.formatNumber(ante)} monedas.`);
  RC.registerGameResult('Poker', false, ante, 0);
  endRound(false);
});

function showdown() {
  const playerBest = bestScore([...playerHole, ...community]);
  const botBest = bestScore([...botHole, ...community]);
  const cmp = compareScores(playerBest, botBest);

  render(true);

  let won = false, payout = 0, text = '';
  if (cmp > 0) {
    won = true; payout = pot;
    text = `Ganas con ${HAND_NAMES[playerBest[0]]} frente a ${HAND_NAMES[botBest[0]]}. +${RC.formatNumber(payout)} monedas.`;
  } else if (cmp === 0) {
    won = true; payout = pot / 2;
    text = `Empate (${HAND_NAMES[playerBest[0]]}). Se reparte el bote.`;
  } else {
    text = `La banca gana con ${HAND_NAMES[botBest[0]]} frente a tu ${HAND_NAMES[playerBest[0]]}.`;
  }

  if (payout > 0) RC.addCoins(payout);
  msgEl.textContent = text;
  RC.toast(won ? 'win' : 'lose', text);
  RC.registerGameResult('Poker', won, pot / 2, payout);
  endRound(true);
}

function endRound(dummy) {
  betBtn.disabled = true;
  foldBtn.disabled = true;
  dealBtn.disabled = false;
  document.getElementById('betRow').style.opacity = '1';
}