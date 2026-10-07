// Blackjack.js — lógica de Blackjack.html (usa RC de app.js)
// Mejoras: mazo de 1 a 8 barajas con mezcla automática, Pedir / Plantarse / Doblar / Dividir,
// repartidor con reglas fijas (pide con 16 o menos, se planta con 17 o más), As = 1 u 11,
// y detección de victoria, derrota, empate (Push), Blackjack natural y Bust.
RC.initHeader();

const SUITS = [{ s: '♠', c: 'black' }, { s: '♣', c: 'black' }, { s: '♥', c: 'red' }, { s: '♦', c: 'red' }];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const MIN_BET = 10;
const MAX_HANDS = 4;          // máximo de manos tras dividir
const DEALER_DELAY = 600;     // ms entre cartas del repartidor
const SETTINGS_KEY = 'rc_bj_settings';

// ---- Estado ----
let shoe = [], totalCards = 0, needShuffle = false;
let hands = [], active = 0, dealerHand = [];
let phase = 'idle';           // idle | player | dealer

// ---- Elementos ----
const $ = id => document.getElementById(id);
const dealerCardsEl = $('dealerCards'), dealerScoreEl = $('dealerScore');
const playerHandsEl = $('playerHands'), msgEl = $('bjMsg');
const dealBtn = $('dealBtn'), hitBtn = $('hitBtn'), standBtn = $('standBtn');
const doubleBtn = $('doubleBtn'), splitBtn = $('splitBtn');
const betInput = $('bet'), betRow = $('betRow');
const deckCountEl = $('deckCount'), penetrationEl = $('penetration');
const shoeTextEl = $('shoeText'), shoeFillEl = $('shoeFill'), shoeCutEl = $('shoeCut');
const tableEl = $('bjTable'), shoeVisEl = $('shoeVisual'), fxEl = $('bjFx'), bannerEl = $('bjBanner'), betChipsEl = $('betChips');

const fmt = n => RC.formatNumber(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Configuración persistente ----
function loadSettings() {
  try {
    const s = JSON.parse(RCMem.getItem(SETTINGS_KEY) || '{}');
    if (s.decks >= 1 && s.decks <= 8) deckCountEl.value = String(s.decks);
    if (['0.5', '0.65', '0.75', '0.85'].includes(String(s.pen))) penetrationEl.value = String(s.pen);
  } catch (e) { /* sin configuración guardada */ }
}
function saveSettings() {
  try { RCMem.setItem(SETTINGS_KEY, JSON.stringify({ decks: Number(deckCountEl.value), pen: Number(penetrationEl.value) })); } catch (e) { /* ignorar */ }
}

// ---- Mazo (shoe) ----
function randInt(max) {
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(1), limit = Math.floor(4294967296 / max) * max;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function buildShoe() {
  const n = Number(deckCountEl.value) || 1;
  const d = [];
  for (let k = 0; k < n; k++)
    for (const suit of SUITS) for (const rank of RANKS) d.push({ rank, suit: suit.s, color: suit.c });
  for (let i = d.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  shoe = d; totalCards = d.length; needShuffle = false;
  updateShoe();
  playShuffle();
}

function cutReached() { return shoe.length <= totalCards * (1 - Number(penetrationEl.value)); }

function draw() {
  if (!shoe.length) { buildShoe(); RC.toast('info', '🔀 Se acabó el mazo: se mezcla uno nuevo.'); }
  const c = shoe.pop();
  if (cutReached()) needShuffle = true;
  updateShoe();
  return c;
}

function updateShoe() {
  const n = Number(deckCountEl.value) || 1;
  shoeTextEl.textContent = `${shoe.length} de ${totalCards} cartas (${n} ${n === 1 ? 'baraja' : 'barajas'})` +
    (needShuffle ? ' · se mezclará en la próxima mano' : '');
  shoeFillEl.style.width = (totalCards ? (shoe.length / totalCards) * 100 : 0) + '%';
  shoeCutEl.style.left = ((1 - Number(penetrationEl.value)) * 100) + '%';
}

// ---- Animaciones ----
const reflow = el => void el.offsetWidth;

function playShuffle() {
  if (!shoeVisEl) return;
  shoeVisEl.classList.remove('shuffling'); reflow(shoeVisEl); shoeVisEl.classList.add('shuffling');
  setTimeout(() => shoeVisEl.classList.remove('shuffling'), 1100);
}

// Las cartas nuevas vuelan desde la zapatilla y la carta oculta del repartidor se voltea
function animateNewCards() {
  const src = shoeVisEl.getBoundingClientRect();
  let i = 0;
  document.querySelectorAll('.card[data-deal]').forEach(el => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--fx', (src.left + src.width / 2 - (r.left + r.width / 2)) + 'px');
    el.style.setProperty('--fy', (src.top + src.height / 2 - (r.top + r.height / 2)) + 'px');
    el.style.animationDelay = (i++ * 130) + 'ms';
    el.classList.add('deal-in');
    el.removeAttribute('data-deal');
  });
  document.querySelectorAll('.card[data-flip]').forEach(el => {
    el.classList.add('flip-in');
    el.removeAttribute('data-flip');
  });
}

function setScore(el, text, total) {
  if (el.textContent !== text) { el.textContent = text; el.classList.remove('pop'); reflow(el); el.classList.add('pop'); }
  el.classList.toggle('bust', total > 21);
  el.classList.toggle('t21', total === 21);
}

// Fichas de la apuesta (se apilan por denominación)
const CHIPS = [{ v: 1000, c: 'var(--chip-gold)' }, { v: 500, c: 'var(--chip-purple)' }, { v: 100, c: 'var(--chip-black)' }, { v: 50, c: 'var(--chip-blue)' }, { v: 10, c: 'var(--chip-red)' }];
let lastChipAmount = -1;
function renderBetChips(amount, fx, force) {
  amount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!force && amount === lastChipAmount && !fx) return;
  lastChipAmount = amount;
  betChipsEl.innerHTML = '';
  betChipsEl.className = 'bj-chips' + (fx ? ' ' + fx : '');
  let rest = amount, si = 0;
  CHIPS.forEach(d => {
    const n = Math.floor(rest / d.v);
    rest -= n * d.v;
    if (!n) return;
    const shown = Math.min(n, 6);
    const stack = document.createElement('div');
    stack.className = 'bj-stack';
    stack.style.height = (46 + (shown - 1) * 6) + 'px';
    for (let i = 0; i < shown; i++) {
      const chip = document.createElement('div');
      chip.className = 'bj-chip';
      chip.style.setProperty('--chip', d.c);
      chip.style.setProperty('--i', i);
      chip.style.setProperty('--s', si);
      if (i === shown - 1) chip.textContent = d.v >= 1000 ? (d.v / 1000) + 'K' : d.v;
      stack.appendChild(chip);
    }
    betChipsEl.appendChild(stack);
    si++;
  });
  if (amount > 0) {
    const t = document.createElement('div');
    t.className = 'bj-chips-total';
    t.textContent = fmt(amount);
    betChipsEl.appendChild(t);
  }
}

function showBanner(text, kind) {
  bannerEl.textContent = text;
  bannerEl.className = 'bj-banner ' + kind;
  reflow(bannerEl);
  bannerEl.classList.add('show');
}

function coinBurst(n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    c.className = 'bj-coin';
    c.style.setProperty('--dx', (Math.random() * 520 - 260).toFixed(0) + 'px');
    c.style.setProperty('--dy', (-Math.random() * 260 - 80).toFixed(0) + 'px');
    c.style.setProperty('--fall', (Math.random() * 160 + 160).toFixed(0) + 'px');
    c.style.setProperty('--d', (Math.random() * 0.5).toFixed(2) + 's');
    fxEl.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

function shakeTable() {
  tableEl.classList.remove('shake'); reflow(tableEl); tableEl.classList.add('shake');
  setTimeout(() => tableEl.classList.remove('shake'), 600);
}

// El mensaje se anima cada vez que cambia
new MutationObserver(() => { msgEl.classList.remove('msg-in'); reflow(msgEl); msgEl.classList.add('msg-in'); })
  .observe(msgEl, { childList: true, characterData: true, subtree: true });

// ---- Puntajes ----
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
const isDealerBJ = () => dealerHand.length === 2 && evaluate(dealerHand).total === 21;
const isNatural = h => !h.fromSplit && h.cards.length === 2 && evaluate(h.cards).total === 21;

function newHand(cards, bet) {
  return { cards, bet, fromSplit: false, splitAces: false, doubled: false, result: null };
}

// ---- Render ----
function renderCard(card, faceDown) {
  const el = document.createElement('div');
  el.className = 'card' + (faceDown ? ' hidden' : (card.color === 'red' ? ' red' : ''));
  if (!card.dealt) { el.dataset.deal = '1'; card.dealt = true; }   // entra volando desde la zapatilla
  if (faceDown) card.wasHidden = true;
  else {
    if (['J', 'Q', 'K'].includes(card.rank)) el.classList.add('face');
    el.innerHTML = `<span class="c-tl"><b>${card.rank}</b><i>${card.suit}</i></span>` +
                   `<span class="c-mid">${card.suit}</span>` +
                   `<span class="c-br"><b>${card.rank}</b><i>${card.suit}</i></span>`;
    if (card.wasHidden && !card.flipped) { el.dataset.flip = '1'; card.flipped = true; }  // se voltea al descubrirse
  }
  return el;
}

function playerScoreText(h) {
  const e = evaluate(h.cards);
  if (isNatural(h)) return 'Blackjack';
  if (e.total > 21) return e.total + ' · Pasado';
  if (e.soft && e.total < 21) return (e.total - 10) + ' / ' + e.total;
  return String(e.total);
}

function renderDealer(hideHole) {
  dealerCardsEl.innerHTML = '';
  dealerHand.forEach((c, i) => dealerCardsEl.appendChild(renderCard(c, hideHole && i === 1)));
  if (!dealerHand.length) { setScore(dealerScoreEl, '—', 0); return; }
  if (hideHole) { setScore(dealerScoreEl, cardValue(dealerHand[0]) + ' + ?', 0); animateNewCards(); return; }
  const e = evaluate(dealerHand);
  setScore(dealerScoreEl, isDealerBJ() ? 'Blackjack' : (e.total > 21 ? e.total + ' · Pasado' : (e.soft && e.total < 21 ? e.total + ' (blando)' : String(e.total))), e.total);
  animateNewCards();
}

function renderPlayer() {
  playerHandsEl.innerHTML = '';
  playerHandsEl.classList.toggle('multi', hands.length > 1);
  const list = hands.length ? hands : [null];
  list.forEach((h, i) => {
    const block = document.createElement('div');
    block.className = 'hand-block player-hand';
    if (h && phase === 'player' && i === active) block.classList.add('active');
    if (h && h.result) block.classList.add(h.result.net > 0 ? 'won' : (h.result.net < 0 ? 'lost' : 'push'));

    const title = document.createElement('div');
    title.className = 'hand-title';
    const name = document.createElement('span');
    name.textContent = hands.length > 1 ? 'Mano ' + (i + 1) : 'Tú';
    title.appendChild(name);
    if (h) {
      const b = document.createElement('span');
      b.className = 'hand-bet';
      b.textContent = 'Apuesta ' + fmt(h.bet);
      title.appendChild(b);
    }
    const sc = document.createElement('span');
    sc.className = 'score';
    sc.textContent = h ? playerScoreText(h) : '—';
    if (h) {
      const tot = evaluate(h.cards).total, txt = sc.textContent;
      if (h.lastScore !== txt) { sc.classList.add('pop'); h.lastScore = txt; }
      if (tot > 21) sc.classList.add('bust'); else if (tot === 21) sc.classList.add('t21');
    }
    title.appendChild(sc);
    block.appendChild(title);

    const cardsEl = document.createElement('div');
    cardsEl.className = 'cards';
    if (h) h.cards.forEach(c => cardsEl.appendChild(renderCard(c, false)));
    block.appendChild(cardsEl);

    const tag = document.createElement('span');
    tag.className = 'hand-tag';
    tag.textContent = h ? (h.result ? h.result.label : (h.doubled ? 'Doblada' : (h.splitAces ? 'As dividido: una sola carta' : ''))) : '';
    block.appendChild(tag);
    playerHandsEl.appendChild(block);
  });
  animateNewCards();
}

function canDouble(h) { return h.cards.length === 2 && !h.splitAces && RC.getUser().coins >= h.bet; }
function canSplit(h) {
  return h.cards.length === 2 && h.cards[0].rank === h.cards[1].rank && !h.splitAces &&
    hands.length < MAX_HANDS && RC.getUser().coins >= h.bet;
}

function updateControls() {
  const inRound = phase === 'player';
  const h = inRound ? hands[active] : null;
  dealBtn.disabled = phase !== 'idle';
  hitBtn.disabled = !inRound;
  standBtn.disabled = !inRound;
  doubleBtn.disabled = !(inRound && canDouble(h));
  splitBtn.disabled = !(inRound && canSplit(h));
  const locked = phase !== 'idle';
  betInput.disabled = locked;
  betRow.querySelectorAll('button').forEach(b => { b.disabled = locked; });
  deckCountEl.disabled = locked;
  penetrationEl.disabled = locked;
  betRow.style.opacity = locked ? '.5' : '1';
}

function refresh(hideHole = true) {
  if (phase === 'player' && hands.length) renderBetChips(hands.reduce((a, h) => a + h.bet, 0));
  renderDealer(hideHole);
  renderPlayer();
  updateControls();
}

// ---- Flujo de la ronda ----
function deal() {
  if (phase !== 'idle') return;
  const b = Math.floor(Number(betInput.value) || 0);
  if (b < MIN_BET) { RC.toast('info', 'La apuesta mínima es ' + MIN_BET + ' monedas.'); return; }
  if (b > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  betInput.value = b;

  if (needShuffle || !shoe.length) { buildShoe(); RC.toast('info', '🔀 Mazo mezclado.'); }
  RC.addCoins(-b);
  renderBetChips(b, 'chips-place', true);

  hands = [newHand([draw(), draw()], b)];
  dealerHand = [draw(), draw()];
  active = 0;
  phase = 'player';
  msgEl.textContent = 'Tu turno: pide, plántate, dobla o divide.';
  refresh(true);

  // Blackjack natural: se comprueba también el del repartidor
  if (isNatural(hands[0]) || isDealerBJ()) dealerTurn();
}

function hit() {
  if (phase !== 'player') return;
  const h = hands[active];
  h.cards.push(draw());
  if (evaluate(h.cards).total >= 21) nextHand(); // 21 → plantarse solo; más de 21 → Bust
  else refresh(true);
}

function stand() { if (phase === 'player') nextHand(); }

function doubleDown() {
  if (phase !== 'player') return;
  const h = hands[active];
  if (!canDouble(h)) return;
  RC.addCoins(-h.bet);
  h.bet *= 2;
  h.doubled = true;
  h.cards.push(draw());
  nextHand();
}

function split() {
  if (phase !== 'player') return;
  const h = hands[active];
  if (!canSplit(h)) return;
  RC.addCoins(-h.bet);
  const [a, b] = h.cards;
  const h1 = newHand([a, draw()], h.bet);
  const h2 = newHand([b, draw()], h.bet);
  h1.fromSplit = h2.fromSplit = true;
  if (a.rank === 'A') h1.splitAces = h2.splitAces = true; // Ases: una sola carta cada uno
  hands.splice(active, 1, h1, h2);
  if (autoDone(hands[active])) nextHand();
  else { msgEl.textContent = 'Juegas la mano ' + (active + 1) + '.'; refresh(true); }
}

function autoDone(h) { return h.splitAces || evaluate(h.cards).total >= 21; }

function nextHand() {
  active++;
  while (active < hands.length && autoDone(hands[active])) active++;
  if (active >= hands.length) { dealerTurn(); return; }
  msgEl.textContent = 'Juegas la mano ' + (active + 1) + '.';
  refresh(true);
}

async function dealerTurn() {
  phase = 'dealer';
  active = -1;
  updateControls();
  renderPlayer();
  renderDealer(false); // se descubre la carta oculta

  // El repartidor solo juega si queda alguna mano viva (sin Bust y sin Blackjack natural)
  const live = hands.some(h => evaluate(h.cards).total <= 21 && !isNatural(h));
  if (live && !isDealerBJ()) {
    msgEl.textContent = 'Turno del repartidor…';
    await sleep(DEALER_DELAY);
    while (evaluate(dealerHand).total < 17) {   // pide con 16 o menos, se planta con 17 o más
      dealerHand.push(draw());
      renderDealer(false);
      await sleep(DEALER_DELAY);
    }
  }
  settle();
}

function settle() {
  const d = evaluate(dealerHand).total, dBJ = isDealerBJ();
  let wager = 0, payout = 0;

  hands.forEach(h => {
    const p = evaluate(h.cards).total;
    let pay = 0, label;
    if (p > 21) label = `Bust: te pasaste con ${p}`;
    else if (isNatural(h)) {
      if (dBJ) { pay = h.bet; label = 'Push: Blackjack para ambos'; }
      else { pay = Math.round(h.bet * 2.5); label = '¡Blackjack! Paga 3:2'; }
    }
    else if (dBJ) label = 'El repartidor tiene Blackjack';
    else if (d > 21) { pay = h.bet * 2; label = `Gana: el repartidor se pasa con ${d}`; }
    else if (p > d) { pay = h.bet * 2; label = `Gana ${p} contra ${d}`; }
    else if (p === d) { pay = h.bet; label = `Push: empate en ${p}`; }
    else label = `Pierde ${p} contra ${d}`;
    h.result = { pay, net: pay - h.bet, label };
    wager += h.bet;
    payout += pay;
  });

  phase = 'idle';
  if (payout > 0) RC.addCoins(payout);

  const net = payout - wager;
  const netText = net > 0 ? `Ganas ${fmt(net)} monedas.` : (net === 0 ? 'Recuperas tu apuesta.' : `Pierdes ${fmt(-net)} monedas.`);
  let text = hands.length === 1 ? `${hands[0].result.label}. ${netText}` : `Resultado total: ${netText}`;
  if (needShuffle) text += ' El mazo se mezclará en la próxima mano.';
  msgEl.textContent = text;

  refresh(false);
  updateShoe();

  const playerNat = hands.some(h => isNatural(h)) && !dBJ;
  const allBust = hands.every(h => evaluate(h.cards).total > 21);
  if (playerNat) { coinBurst(70); renderBetChips(wager, 'chips-win', true); }
  else if (net > 0) { coinBurst(40); renderBetChips(wager, 'chips-win', true); }
  else if (net < 0) { shakeTable(); renderBetChips(wager, 'chips-lose', true); }

  // Tras la animación, la apuesta vuelve a mostrarse lista para la siguiente mano
  setTimeout(() => { if (phase === 'idle') renderBetChips(betInput.value, '', true); }, 1500);

  if (playerNat) RC.result({ type: 'big', title: '¡BLACKJACK!', amount: net, text });
  else if (net > 0) RC.result({ type: 'win', title: '¡GANASTE!', amount: net, text });
  else if (net === 0) RC.result({ type: 'push', title: 'PUSH', text });
  else RC.result({ type: 'lose', title: allBust ? '¡TE PASASTE!' : 'PERDISTE', amount: -net, text });
  RC.registerGameResult('Blackjack', payout > wager, wager, payout);
}

// ---- Eventos ----
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => { betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add); renderBetChips(betInput.value); });
});
$('betClear').addEventListener('click', () => { betInput.value = MIN_BET; renderBetChips(MIN_BET); });
betInput.addEventListener('input', () => { if (phase === 'idle') renderBetChips(betInput.value); });

dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', doubleDown);
splitBtn.addEventListener('click', split);

deckCountEl.addEventListener('change', () => {
  if (phase !== 'idle') return;
  saveSettings();
  buildShoe();
  msgEl.textContent = `Mazo nuevo de ${deckCountEl.value} ${deckCountEl.value === '1' ? 'baraja' : 'barajas'}, mezclado.`;
});
penetrationEl.addEventListener('change', () => {
  if (phase !== 'idle') return;
  saveSettings();
  if (shoe.length && cutReached()) needShuffle = true;
  updateShoe();
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'enter' && !dealBtn.disabled) deal();
  else if (k === 'h' && !hitBtn.disabled) hit();
  else if (k === 's' && !standBtn.disabled) stand();
  else if (k === 'd' && !doubleBtn.disabled) doubleDown();
  else if (k === 'p' && !splitBtn.disabled) split();
});

// ---- Inicio ----
loadSettings();
buildShoe();
refresh(true);
renderBetChips(betInput.value, '', true);
