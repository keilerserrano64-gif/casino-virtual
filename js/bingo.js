// bingo.js — lógica de bingo.html (usa RC de app.js y BingoEngine de bingo_engine.js)
RC.initHeader();

const BE = BingoEngine;
const $ = id => document.getElementById(id);
const cardsEl = $('bingoCard'), ballEl = $('currentBall'), calledEl = $('calledBalls'), msgEl = $('bingoMsg');
const buyBtn = $('buyBtn'), drawBtn = $('drawBtn'), betInput = $('bet'), countInput = $('cardCount'), betRow = $('betRow'), countRow = $('countRow');
const modeSel = $('mode'), autoDaub = $('autoDaub'), voiceOn = $('voiceOn');
const jackpotEl = $('jackpot'), bonusEl = $('bonusInfo'), rulesEl = $('rulesInfo');

const WELCOME_CARDS = 3;      // cartones gratis de bienvenida
const LOYALTY_EVERY = 10;     // 1 cartón gratis cada 10 partidas de bingo

let game = null, cardCells = [], playing = false, price = 0, paidStake = 0, payout = 0, jackpotPaid = false;

/* ---------- Bote acumulado (uno por sala, compartido en este navegador) ---------- */
const jpKey = m => 'rc_bingo_jackpot_' + m;
const getJackpot = m => { try { const v = Number(JSON.parse(RCMem.getItem(jpKey(m)))); return Number.isFinite(v) && v >= BE.JACKPOT_SEED ? v : BE.JACKPOT_SEED; } catch (e) { return BE.JACKPOT_SEED; } };
const setJackpot = (m, v) => { try { RCMem.setItem(jpKey(m), JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
const curMode = () => Number(modeSel.value);
// Color/letra de cada bola (75: B-I-N-G-O por rango; 90: por decena)
const ballInfo = (n, mode) => mode === 75 ? { l: 'BINGO'[Math.floor((n - 1) / 15)], g: Math.floor((n - 1) / 15) } : { l: '', g: Math.min(Math.floor((n - 1) / 10), 8) };

/* ---------- Sonido y voz (respeta Configuración) ---------- */
const soundAllowed = () => RC.getSettings().sound !== false && voiceOn.checked;
let audioCtx = null;
function tones(freqs) {
  if (!soundAllowed()) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + i * 0.13;
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.22);
    });
  } catch (e) { /* audio no disponible */ }
}
function say(text) {
  if (!soundAllowed() || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES'; u.rate = 1.05;
  const v = speechSynthesis.getVoices().find(x => /^es[-_]/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

/* ---------- Bonos ---------- */
function refreshBonusInfo() {
  const u = RC.getUser();
  const left = LOYALTY_EVERY - ((u.bingoGames || 0) % LOYALTY_EVERY);
  bonusEl.textContent = `Cartones gratis: ${u.bingoFreeCards || 0} · Lealtad: ${left} partida${left > 1 ? 's' : ''} para tu próximo cartón gratis.`;
}
function welcomeBonus() {
  const u = RC.getUser();
  if (u.bingoWelcome) return;
  u.bingoWelcome = true; u.bingoFreeCards = (u.bingoFreeCards || 0) + WELCOME_CARDS;
  RC.saveUser(u);
  RC.notify(`Bono de bienvenida: ${WELCOME_CARDS} cartones gratis de Bingo.`, '🎱');
  RC.toast('info', `Bono de bienvenida: ${WELCOME_CARDS} cartones gratis.`);
}

/* ---------- Información de sala ---------- */
function refreshRoom() {
  const m = BE.MODES[curMode()];
  jackpotEl.innerHTML = `<span class="jp-lbl">Bote acumulado</span><span class="jp-num">${RC.formatNumber(getJackpot(m.id))}</span><span class="jp-note">Bingo en ${m.jackpotBalls} bolas o menos se lo lleva</span>`;
  rulesEl.textContent = `${m.name}: ${m.maxDraws} bolas por partida. Cada cartón que cante línea gana ×${m.line} su precio; el bingo gana ×${m.full}. ` +
    `El sistema canta línea y bingo automáticamente. Bolas por RNG criptográfico (no certificado por laboratorios externos).`;
  refreshBonusInfo();
}

/* ---------- Cartones ---------- */
function renderCards() {
  cardsEl.innerHTML = ''; cardCells = [];
  game.cards.forEach((card, ci) => {
    const label = document.createElement('div'); label.className = 'stage-label'; label.textContent = `CARTÓN ${ci + 1}`;
    const grid = document.createElement('div'); grid.className = 'bingo-card';
    const wide = card.cols === 9;
    if (wide) grid.classList.add('wide');
    else 'BINGO'.split('').forEach((L, i) => { const h = document.createElement('div'); h.className = 'hd g' + i; h.textContent = L; grid.appendChild(h); });
    const cells = [];
    card.cells.forEach(v => {
      const el = document.createElement('div');
      if (v === null) { el.className = 'blank'; cells.push({ el, n: null }); grid.appendChild(el); return; }
      const free = v === 0;
      el.textContent = free ? '★' : v;
      if (free) el.className = 'free marked';
      else el.addEventListener('click', () => toggle(el, v));
      cells.push({ el, n: v }); grid.appendChild(el);
    });
    cardsEl.append(label, grid); cardCells.push(cells);
  });
}

function toggle(el, n) {
  if (!playing) return;
  if (!game.called.has(n)) { RC.toast('info', 'Ese número todavía no ha salido.'); return; }
  el.classList.toggle('marked');
}
const markNumber = n => cardCells.forEach(cells => cells.forEach(c => { if (c.n === n) c.el.classList.add('marked'); }));
const markAllCalled = () => game.called.forEach(markNumber);

autoDaub.addEventListener('change', () => { if (playing && autoDaub.checked) markAllCalled(); });
modeSel.addEventListener('change', () => { if (playing) { modeSel.value = String(game.mode); return; } refreshRoom(); loadChat(); });

/* ---------- Compra ---------- */
buyBtn.addEventListener('click', () => {
  if (playing) return;
  const mode = curMode();
  price = BE.normalizeBet(betInput.value); betInput.value = price;
  const count = BE.normalizeCount(countInput.value); countInput.value = count;
  const u = RC.getUser();
  const free = Math.min(u.bingoFreeCards || 0, count);
  const cost = (count - free) * price;
  if (cost > u.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  if (cost > 0) RC.addCoins(-cost);
  if (free > 0) { const v = RC.getUser(); v.bingoFreeCards = (v.bingoFreeCards || 0) - free; RC.saveUser(v); }
  setJackpot(mode, BE.jackpotAfterPurchase(getJackpot(mode), cost));
  paidStake = cost; payout = 0; jackpotPaid = false;
  game = BE.newGame(mode, count);
  calledEl.innerHTML = ''; ballEl.textContent = '—'; delete ballEl.dataset.g;
  renderCards();
  playing = true;
  [buyBtn, modeSel, betInput, countInput].forEach(el => { el.disabled = true; });
  drawBtn.disabled = false; betRow.style.opacity = '.5'; countRow.style.opacity = '.5';
  const m = BE.MODES[mode];
  msgEl.textContent = `${count} ${count > 1 ? 'cartones' : 'cartón'}${free ? ` (${free} gratis)` : ''}. Hay ${m.maxDraws} bolas: saca bolas y el sistema cantará línea y bingo.`;
  tones([520, 660]);
  refreshRoom();
});

/* ---------- Extracción y cómputo en tiempo real ---------- */
drawBtn.addEventListener('click', () => {
  if (!playing || game.done) return;
  const m = BE.MODES[game.mode];
  const { ball, events } = BE.draw(game);
  const bi = ballInfo(ball, game.mode);
  ballEl.dataset.g = bi.g; ballEl.innerHTML = (bi.l ? `<small>${bi.l}</small>` : '') + `<b>${ball}</b>`; ballEl.classList.remove('pop'); void ballEl.offsetWidth; ballEl.classList.add('pop');
  const s = document.createElement('span'); s.textContent = ball; s.dataset.g = bi.g;
  calledEl.querySelectorAll('.latest').forEach(x => x.classList.remove('latest')); s.className = 'latest'; calledEl.appendChild(s);
  calledEl.scrollLeft = calledEl.scrollWidth;
  if (autoDaub.checked) markNumber(ball);
  say(`Bola ${ball}`);
  msgEl.textContent = `Bola ${game.order.length} de ${m.maxDraws}. Quedan ${m.maxDraws - game.order.length}.`;

  events.forEach(e => {
    if (e.type === 'line') {
      const prize = BE.linePrize(game.mode, price);
      RC.addCoins(prize); payout += prize;
      msgEl.textContent = `¡LÍNEA! Cartón ${e.card + 1}. +${RC.formatNumber(prize)} monedas.`;
      RC.result({ type: 'win', title: '¡LÍNEA!', amount: prize, text: `Cartón ${e.card + 1}`, sound: false, duration: 2200 }); say('¡Línea!'); tones([660, 880]);
      postSystem(`${who()} cantó LÍNEA en el cartón ${e.card + 1}.`);
    } else if (e.type === 'bingo') {
      let prize = BE.fullPrize(game.mode, price);
      let text = `¡BINGO! Cartón ${e.card + 1}. +${RC.formatNumber(prize)} monedas.`;
      if (e.jackpot && !jackpotPaid) {
        const jp = getJackpot(game.mode); prize += jp; jackpotPaid = true; setJackpot(game.mode, BE.JACKPOT_SEED);
        text = `¡BINGO y BOTE! Cartón ${e.card + 1}. +${RC.formatNumber(prize)} monedas (bote ${RC.formatNumber(jp)}).`;
      }
      RC.addCoins(prize); payout += prize;
      msgEl.textContent = text;
      RC.result({ type: 'big', title: e.jackpot ? '¡BINGO Y BOTE!' : '¡BINGO!', amount: prize, text: `Cartón ${e.card + 1}`, sound: false }); say('¡Bingo!'); tones([523, 659, 784, 1047]);
      postSystem(`${who()} cantó BINGO${e.jackpot ? ' y se llevó el bote' : ''}.`);
    }
  });
  if (game.done) finish();
});

function finish() {
  playing = false;
  const won = payout > 0;
  if (!won) msgEl.textContent = 'Se acabaron las bolas sin premio.';
  else if (game.fullCards.length === 0) msgEl.textContent += ` Total de la partida: +${RC.formatNumber(payout)} monedas.`;
  if (!won) RC.result({ type: 'lose', title: 'SIN PREMIO', amount: paidStake, text: 'Se acabaron las bolas.', sound: false });
  RC.registerGameResult('Bingo · ' + game.mode + ' bolas', won, paidStake, payout);
  // Lealtad: 1 cartón gratis cada LOYALTY_EVERY partidas
  const u = RC.getUser();
  u.bingoGames = (u.bingoGames || 0) + 1;
  if (u.bingoGames % LOYALTY_EVERY === 0) {
    u.bingoFreeCards = (u.bingoFreeCards || 0) + 1;
    RC.notify('Premio de lealtad: 1 cartón gratis de Bingo.', '🎱'); RC.toast('info', 'Premio de lealtad: 1 cartón gratis.');
  }
  RC.saveUser(u);
  [buyBtn, modeSel, betInput, countInput].forEach(el => { el.disabled = false; });
  drawBtn.disabled = true; betRow.style.opacity = '1'; countRow.style.opacity = '1';
  refreshRoom();
}

/* ---------- Chat moderado (local: se comparte entre pestañas del mismo navegador) ---------- */
const chatLog = $('chatLog'), chatInput = $('chatInput');
const chatKey = () => 'rc_bingo_chat_' + curMode();
const who = () => RC.getUser().name || RC.currentUser() || 'Jugador';
const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const BAD_WORDS = /(puta|mierda|joder|cabron|pendejo|gilipollas|imbecil|idiota|estupid|marica|hijueputa|malparid|verga|cono)/;
let lastSent = 0;

function readChat() { try { const v = JSON.parse(RCMem.getItem(chatKey())); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function pushChat(msg) { const l = readChat(); l.push(msg); try { RCMem.setItem(chatKey(), JSON.stringify(l.slice(-50))); } catch (e) { /* sin almacenamiento */ } loadChat(); }
function loadChat() {
  chatLog.innerHTML = '';
  readChat().forEach(m => {
    const row = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = m.sys ? '🎱 Sala' : m.u;
    row.append(name, document.createTextNode(': ' + m.t));
    chatLog.appendChild(row);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}
function postSystem(t) { pushChat({ sys: true, t, ts: Date.now() }); }

function moderate(text) {
  const t = text.trim();
  if (!t) return { ok: false, why: '' };
  if (t.length > 140) return { ok: false, why: 'Máximo 140 caracteres.' };
  if (/(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b)/i.test(t)) return { ok: false, why: 'No se permiten enlaces en el chat.' };
  if (BAD_WORDS.test(plain(t))) return { ok: false, why: 'Mensaje bloqueado por moderación.' };
  if (/(.)\1{7,}/.test(t)) return { ok: false, why: 'Evita repetir el mismo carácter.' };
  if (Date.now() - lastSent < 1500) return { ok: false, why: 'Espera un momento antes de enviar otro mensaje.' };
  return { ok: true, text: t };
}
function sendChat(text) {
  const r = moderate(text);
  if (!r.ok) { if (r.why) RC.toast('info', r.why); return false; }
  lastSent = Date.now();
  pushChat({ u: who(), t: r.text, ts: lastSent });
  return true;
}

$('chatSend').addEventListener('click', () => { if (sendChat(chatInput.value)) chatInput.value = ''; });
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('chatSend').click(); } });
document.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => { chatInput.value += b.dataset.emoji; chatInput.focus(); }));
document.querySelectorAll('[data-sticker]').forEach(b => b.addEventListener('click', () => sendChat(b.dataset.sticker)));
// Minijuegos rápidos del chat (resultado con el mismo RNG del bingo; no mueven monedas)
$('chatDice').addEventListener('click', () => { if (Date.now() - lastSent >= 1500) { lastSent = Date.now(); postSystem(`${who()} tiró el dado: 🎲 ${BE.randInt(6) + 1}`); } });
$('chatCoin').addEventListener('click', () => { if (Date.now() - lastSent >= 1500) { lastSent = Date.now(); postSystem(`${who()} lanzó la moneda: 🪙 ${BE.randInt(2) ? 'cara' : 'cruz'}`); } });
window.addEventListener('storage', e => { if (e.key === chatKey()) loadChat(); });

/* ---------- Inicio ---------- */
welcomeBonus();
refreshRoom();
loadChat();
