// poker.js — Texas Hold'em animado (usa RC de app.js y los estilos de Blackjack.css)
RC.initHeader();

const SUITS = ['♠', '♣', '♥', '♦'], RED = new Set(['♥', '♦']);
const LAB = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }, lab = r => LAB[r] || r;
const HAND_NAMES = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full house', 'Póker', 'Escalera de color'];
const STAGES = ['Preflop', 'Flop', 'Turn', 'River', 'Showdown'];
const MIN_BET = 10;
const BOT_LINES = { start: ['Buena suerte…', 'Veamos qué traes.', 'La casa siempre observa.'], bet: ['Igualo.', 'Me quedo.', 'Interesante…'], win: ['Gracias por las fichas 😎', 'La casa gana.', 'Mejor suerte a la próxima.'], lose: ['Vaya… bien jugado.', '¡Imposible!', 'Te lo has ganado.'], fold: ['Sabia decisión… o no.', 'Huyes, ¿eh?'] };

let deck = [], playerHole = [], botHole = [], community = [], pot = 0, paid = 0, ante = 0, stage = 0, live = false, busy = false, handNo = 0;

const $ = id => document.getElementById(id);
const botCardsEl = $('botCards'), playerCardsEl = $('playerCards'), communityEl = $('community'), potChipsEl = $('potChips');
const msgEl = $('pokerMsg'), dealBtn = $('dealBtn'), betBtn = $('betBtn'), foldBtn = $('foldBtn'), betInput = $('bet'), betRow = $('betRow');
const tableEl = $('pkTable'), shoeVisEl = $('shoeVisual'), fxEl = $('bjFx'), bannerEl = $('bjBanner'), stagesEl = $('stages');
const botSeat = $('botSeat'), playerSeat = $('playerSeat'), botFace = $('botFace'), bubbleEl = $('botBubble');
const botHandName = $('botHandName'), playerHandName = $('playerHandName'), playerCoins = $('playerCoins');
const fmt = n => RC.formatNumber(n), sleep = ms => new Promise(r => setTimeout(r, ms)), reflow = el => void el.offsetWidth;
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---- Mazo ---- */
function randInt(max) {
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(1), limit = Math.floor(4294967296 / max) * max;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % max;
  }
  return Math.floor(Math.random() * max);
}
function freshDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ rank: r, suit: s });
  for (let i = d.length - 1; i > 0; i--) { const j = randInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ---- Evaluación de manos (7 cartas -> mejor 5) ---- */
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
function handLabel(hole, board) {
  if (board.length < 3) return hole[0].rank === hole[1].rank ? `Pareja de ${lab(hole[0].rank)}` : `Carta alta ${lab(Math.max(hole[0].rank, hole[1].rank))}`;
  const b = bestHand([...hole, ...board]);
  return { text: HAND_NAMES[b.score[0]], strong: b.score[0] >= 4 };
}

/* ---- Render ---- */
function cardEl(c, hidden, dealOrder, revOrder) {
  const el = document.createElement('div');
  el.className = 'card' + (hidden ? ' hidden' : (RED.has(c.suit) ? ' red' : ''));
  el.dataset.k = c.rank + c.suit;
  if (!c.dealt) {
    c.dealt = true;
    if (dealOrder != null) el.dataset.deal = dealOrder; else el.dataset.rev = revOrder || 0;
  }
  if (hidden) c.wasHidden = true;
  else {
    if (c.rank >= 11 && c.rank <= 13) el.classList.add('face');
    const r = lab(c.rank);
    el.innerHTML = `<span class="c-tl"><b>${r}</b><i>${c.suit}</i></span><span class="c-mid">${c.suit}</span><span class="c-br"><b>${r}</b><i>${c.suit}</i></span>`;
    if (c.wasHidden && !c.flipped) { el.dataset.flip = '1'; c.flipped = true; }
  }
  return el;
}

function animateNew() {
  const s = shoeVisEl.getBoundingClientRect();
  document.querySelectorAll('.card[data-deal]').forEach(el => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--fx', (s.left + s.width / 2 - (r.left + r.width / 2)) + 'px');
    el.style.setProperty('--fy', (s.top + s.height / 2 - (r.top + r.height / 2)) + 'px');
    el.style.animationDelay = (Number(el.dataset.deal) * 150) + 'ms';
    el.classList.add('deal-in'); el.removeAttribute('data-deal');
  });
  document.querySelectorAll('.card[data-rev]').forEach(el => {
    el.style.animationDelay = (Number(el.dataset.rev) * 230) + 'ms';
    el.classList.add('reveal'); el.removeAttribute('data-rev');
  });
  document.querySelectorAll('.card[data-flip]').forEach(el => { el.classList.add('flip-in'); el.removeAttribute('data-flip'); });
}

function setBadge(el, info) {
  const text = typeof info === 'string' ? info : (info ? info.text : '');
  if (el.textContent !== text) { el.textContent = text; el.classList.remove('pop'); reflow(el); el.classList.add('pop'); }
  el.classList.toggle('strong', !!(info && info.strong));
}

function render(showBot) {
  botCardsEl.innerHTML = '';
  botHole.forEach((c, i) => botCardsEl.appendChild(cardEl(c, !showBot, i * 2 + 1)));
  playerCardsEl.innerHTML = '';
  playerHole.forEach((c, i) => playerCardsEl.appendChild(cardEl(c, false, i * 2)));
  communityEl.innerHTML = '';
  let n = 0;
  for (let i = 0; i < 5; i++) {
    if (i < community.length) communityEl.appendChild(cardEl(community[i], false, null, n++));
    else { const s = document.createElement('div'); s.className = 'card slot'; communityEl.appendChild(s); }
  }
  if (playerHole.length) setBadge(playerHandName, handLabel(playerHole, community));
  botHandName.textContent = showBot && botHole.length ? HAND_NAMES[bestHand([...botHole, ...community]).score[0]] : (botHole.length ? 'Cartas ocultas' : '—');
  playerCoins.textContent = fmt(RC.getUser().coins);
  animateNew();
}

/* ---- Fichas ---- */
const CHIPS = [{ v: 1000, c: 'var(--chip-gold)' }, { v: 500, c: 'var(--chip-purple)' }, { v: 100, c: 'var(--chip-black)' }, { v: 50, c: 'var(--chip-blue)' }, { v: 10, c: 'var(--chip-red)' }];
function renderChips(amount, fx) {
  amount = Math.max(0, Math.floor(Number(amount) || 0));
  potChipsEl.innerHTML = '';
  potChipsEl.className = 'bj-chips' + (fx ? ' ' + fx : '');
  let rest = amount, si = 0;
  CHIPS.forEach(d => {
    const n = Math.floor(rest / d.v); rest -= n * d.v;
    if (!n) return;
    const shown = Math.min(n, 6), stack = document.createElement('div');
    stack.className = 'bj-stack'; stack.style.height = (46 + (shown - 1) * 6) + 'px';
    for (let i = 0; i < shown; i++) {
      const chip = document.createElement('div');
      chip.className = 'bj-chip';
      chip.style.setProperty('--chip', d.c); chip.style.setProperty('--i', i); chip.style.setProperty('--s', si);
      if (i === shown - 1) chip.textContent = d.v >= 1000 ? (d.v / 1000) + 'K' : d.v;
      stack.appendChild(chip);
    }
    potChipsEl.appendChild(stack); si++;
  });
  if (amount > 0) { const t = document.createElement('div'); t.className = 'bj-chips-total'; t.textContent = (live || fx ? 'Bote ' : 'Apuesta ') + fmt(amount); potChipsEl.appendChild(t); }
}

/* ---- Efectos ---- */
function showBanner(text, kind) { bannerEl.textContent = text; bannerEl.className = 'bj-banner ' + kind; reflow(bannerEl); bannerEl.classList.add('show'); }
function coinBurst(n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    c.className = 'bj-coin';
    c.style.setProperty('--dx', (Math.random() * 560 - 280).toFixed(0) + 'px');
    c.style.setProperty('--dy', (-Math.random() * 280 - 80).toFixed(0) + 'px');
    c.style.setProperty('--fall', (Math.random() * 180 + 160).toFixed(0) + 'px');
    c.style.setProperty('--d', (Math.random() * 0.6).toFixed(2) + 's');
    fxEl.appendChild(c); setTimeout(() => c.remove(), 2800);
  }
}
function floatText(text, cls) {
  const f = document.createElement('span');
  f.className = 'pk-float ' + cls; f.textContent = text;
  fxEl.appendChild(f); setTimeout(() => f.remove(), 1600);
}
function shakeTable() { tableEl.classList.remove('shake'); reflow(tableEl); tableEl.classList.add('shake'); setTimeout(() => tableEl.classList.remove('shake'), 600); }
function playShuffle() { shoeVisEl.classList.remove('shuffling'); reflow(shoeVisEl); shoeVisEl.classList.add('shuffling'); setTimeout(() => shoeVisEl.classList.remove('shuffling'), 1100); }
function mood(emoji) { botFace.textContent = emoji; botFace.classList.remove('swap'); reflow(botFace); botFace.classList.add('swap'); }
function say(html, ms = 1800) { bubbleEl.innerHTML = html; bubbleEl.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => bubbleEl.classList.remove('show'), ms); }
async function think() {
  mood('🤔'); botSeat.classList.add('thinking'); say('<i></i><i></i><i></i>', 2000);
  await sleep(700 + randInt(600));
  botSeat.classList.remove('thinking'); mood('😏'); say(pick(BOT_LINES.bet), 1200);
}
function highlight(keys) {
  document.querySelectorAll('#botCards .card, #community .card:not(.slot), #playerCards .card').forEach(el => el.classList.add(keys.has(el.dataset.k) ? 'hl' : 'dim'));
}
new MutationObserver(() => { msgEl.classList.remove('msg-in'); reflow(msgEl); msgEl.classList.add('msg-in'); })
  .observe(msgEl, { childList: true, characterData: true, subtree: true });

/* ---- Estado de la UI ---- */
function setStage() {
  stagesEl.querySelectorAll('span').forEach((s, i) => { s.classList.toggle('done', i < stage); s.classList.toggle('on', live && i === stage); });
}
function controls() {
  dealBtn.disabled = live || busy;
  betBtn.disabled = !live || busy;
  foldBtn.disabled = !live || busy;
  betInput.disabled = live;
  betRow.querySelectorAll('button').forEach(b => { b.disabled = live; });
  betRow.style.opacity = live ? '.5' : '1';
}
function endRound() {
  live = false; busy = false; setStage(); controls();
  setTimeout(() => { if (!live) renderChips(betInput.value); }, 2000);
}

/* ---- Flujo de juego ---- */
/* ---- IA de la banca: aprende cómo juegas y sube cuando le conviene (js/ia_engine.js) ---- */
let raiseExtra = 0, iaModel = null;
const iaKey = () => 'rc_ia_poker_' + String(RC.currentUser() || 'guest').toLowerCase();
function iaLoad() { try { iaModel = RCIA.load(JSON.parse(RCMem.getItem(iaKey()))); } catch (e) { iaModel = RCIA.newModel(); } }
function iaSave() { try { RCMem.setItem(iaKey(), JSON.stringify(iaModel)); } catch (e) {} }
function equityVsRandom(hole, board, sims = 120) {   // probabilidad de ganar contra una mano rival al azar (no ve cartas ajenas)
  const known = new Set([...hole, ...board].map(c => JSON.stringify(c)));
  const rest = freshDeck().filter(c => !known.has(JSON.stringify(c)));
  let score = 0;
  for (let i = 0; i < sims; i++) {
    const d = rest.slice();
    for (let k = d.length - 1; k > 0; k--) { const j = randInt(k + 1); [d[k], d[j]] = [d[j], d[k]]; }
    const full = board.concat(d.splice(0, 5 - board.length)), opp = d.splice(0, 2);
    const c = compareScores(bestHand([...hole, ...full]).score, bestHand([...opp, ...full]).score);
    score += c > 0 ? 1 : c === 0 ? 0.5 : 0;
  }
  return score / sims;
}
function iaMaybeRaise() {                              // tras revelar flop/turn
  if (!iaModel || stage < 1 || stage > 2) return;
  const eq = equityVsRandom(botHole, community);
  if (RCIA.decideRaise(iaModel, { stage, eq, pot, r: ante })) {
    raiseExtra = ante;
    msgEl.textContent = '⚠️ ¡La banca SUBE +' + fmt(ante) + '! Igualar cuesta ' + fmt(ante * 2) + ' esta ronda.';
    mood('😈'); say('Sube la apuesta… ¿te atreves?', 2200);
  } else if (RCIA.confidence(iaModel) > 0.5 && Math.random() < 0.3) { say('Ya sé cuándo te retiras…', 1800); }
}

function deal() {
  if (live || busy) return;
  const b = Math.max(MIN_BET, Math.floor(Number(betInput.value) || 0));
  if (b * 2 > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes para esta apuesta.'); return; }
  ante = b; betInput.value = b; raiseExtra = 0; iaLoad();
  RC.addCoins(-b);
  paid = b; pot = b * 2; stage = 0; community = []; live = true;
  document.querySelectorAll('.card.hl, .card.dim').forEach(el => el.classList.remove('hl', 'dim'));
  botSeat.classList.remove('win', 'lose'); playerSeat.classList.remove('win', 'lose');
  playerHandName.textContent = '';

  deck = freshDeck(); playShuffle();
  playerHole = [deck.pop(), deck.pop()];
  botHole = [deck.pop(), deck.pop()];
  (handNo++ % 2 ? playerSeat : botSeat).appendChild(Object.assign(document.createElement('span'), { className: 'pk-dbtn', textContent: 'D' }));
  document.querySelectorAll('.pk-dbtn').forEach((d, i, all) => { if (i < all.length - 1) d.remove(); });

  mood('😏'); say(pick(BOT_LINES.start));
  msgEl.textContent = 'Preflop. ¿Apuestas o te retiras?';
  render(false); renderChips(pot, 'chips-place'); setStage(); controls();
}

async function bet() {
  if (!live || busy) return;
  const cost = ante + raiseExtra;
  if (cost > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes para igualar.'); return; }
  if (iaModel && stage >= 1) { RCIA.observe(iaModel, stage, raiseExtra > 0, false); iaSave(); }
  busy = true; controls();
  RC.addCoins(-cost); paid += cost; pot += cost * 2; raiseExtra = 0;
  renderChips(pot); floatText('+' + fmt(ante * 2), 'pk-f-gold'); playerCoins.textContent = fmt(RC.getUser().coins);
  await think();
  stage++; setStage();
  if (stage === 1) { community.push(deck.pop(), deck.pop(), deck.pop()); msgEl.textContent = '¡Flop! ¿Apuestas o te retiras?'; }
  else if (stage === 2) { community.push(deck.pop()); msgEl.textContent = 'Turn revelado. ¿Apuestas o te retiras?'; }
  else { community.push(deck.pop()); msgEl.textContent = 'River revelado…'; }
  render(false);
  if (stage < 3) iaMaybeRaise();
  if (stage === 3) { await sleep(1100); await showdown(); return; }
  await sleep(stage === 1 ? 900 : 500);
  busy = false; controls();
}

async function showdown() {
  stage = 4; setStage();
  msgEl.textContent = '¡Showdown! La banca muestra sus cartas…';
  render(true);
  await sleep(1200);
  const P = bestHand([...playerHole, ...community]), B = bestHand([...botHole, ...community]);
  const cmp = compareScores(P.score, B.score);
  const keys = new Set((cmp > 0 ? P.cards : cmp < 0 ? B.cards : [...P.cards, ...B.cards]).map(c => c.rank + c.suit));
  highlight(keys);

  const payout = cmp > 0 ? pot : (cmp === 0 ? paid : 0), net = payout - paid;
  const pn = HAND_NAMES[P.score[0]], bn = HAND_NAMES[B.score[0]];
  let text;
  if (cmp > 0) text = `Ganas con ${pn} frente a ${bn}. +${fmt(net)} monedas.`;
  else if (cmp === 0) text = `Empate (${pn}). Recuperas tu apuesta.`;
  else text = `La banca gana con ${bn} frente a tu ${pn}. Pierdes ${fmt(paid)} monedas.`;

  if (payout > 0) RC.addCoins(payout);
  msgEl.textContent = text;
  playerCoins.textContent = fmt(RC.getUser().coins);

  if (cmp > 0) {
    playerSeat.classList.add('win'); botSeat.classList.add('lose'); mood('😡'); say(pick(BOT_LINES.lose), 2400);
    if (P.score[0] >= 4) { coinBurst(90); tableEl.classList.add('jackpot'); setTimeout(() => tableEl.classList.remove('jackpot'), 2600); }
    else { coinBurst(45); }
    floatText('+' + fmt(net), 'pk-f-green'); renderChips(pot, 'chips-win');
  } else if (cmp === 0) {
    mood('😐'); renderChips(pot, 'chips-win');
  } else {
    botSeat.classList.add('win'); playerSeat.classList.add('lose'); mood('😎'); say(pick(BOT_LINES.win), 2400);
    shakeTable(); floatText('-' + fmt(paid), 'pk-f-red'); renderChips(pot, 'chips-lose');
  }
  if (cmp > 0) RC.result(P.score[0] >= 4 ? { type: 'big', title: pn.toUpperCase() + '!', amount: net, text } : { type: 'win', title: '¡GANASTE!', amount: net, text });
  else if (cmp === 0) RC.result({ type: 'push', title: 'EMPATE', text });
  else RC.result({ type: 'lose', title: 'PERDISTE', amount: paid, text });
  RC.registerGameResult('Poker', payout > paid, paid, payout);
  endRound();
}

function fold() {
  if (!live || busy) return;
  if (iaModel && stage >= 1) { RCIA.observe(iaModel, stage, raiseExtra > 0, true); iaSave(); }
  const text = `Te retiras y pierdes ${fmt(paid)} monedas.`;
  msgEl.textContent = text;
  RC.result({ type: 'lose', title: 'TE RETIRAS', amount: paid, text });
  RC.registerGameResult('Poker', false, paid, 0);
  botSeat.classList.add('win'); playerSeat.classList.add('lose'); mood('😎'); say(pick(BOT_LINES.fold), 2200);
  shakeTable(); floatText('-' + fmt(paid), 'pk-f-red'); renderChips(pot, 'chips-lose');
  playerCoins.textContent = fmt(RC.getUser().coins);
  endRound();
}

/* ---- Eventos ---- */
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => btn.addEventListener('click', () => {
  betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add); renderChips(betInput.value);
}));
$('betClear').addEventListener('click', () => { betInput.value = MIN_BET; renderChips(MIN_BET); });
betInput.addEventListener('input', () => { if (!live) renderChips(betInput.value); });
dealBtn.addEventListener('click', deal);
betBtn.addEventListener('click', bet);
foldBtn.addEventListener('click', fold);
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'enter' && !dealBtn.disabled) deal();
  else if (k === 'a' && !betBtn.disabled) bet();
  else if (k === 'r' && !foldBtn.disabled) fold();
});

/* ---- Inicio ---- */
STAGES.forEach(n => { const s = document.createElement('span'); s.textContent = n; stagesEl.appendChild(s); });
render(false); renderChips(betInput.value); setStage(); controls(); playShuffle();
