// crash.js — lógica compartida de todas las páginas de Crash Games (usa RC de app.js y CrashEngine).
// Cada página declara data-crash="..." en el <body> y uno o más bloques .cx-slot (Zeppelin tiene dos apuestas simultáneas).
RC.initHeader();
const CE = CrashEngine, $ = id => document.getElementById(id);
const KEY = document.body.dataset.crash, G = CE.GAMES[KEY];
const money = n => RC.formatNumber(n);
const fmtM = m => m.toFixed(2) + 'x';

const screen = $('cxScreen'), iconEl = $('cxIcon'), multEl = $('cxMult'), statusEl = $('cxStatus'), statsEl = $('cxStats');
const startBtn = $('startBtn'), histEl = $('cxHist'), history = [];
const slots = [...document.querySelectorAll('.cx-slot')].map(el => ({
  el, bet: el.querySelector('.cx-bet'), auto: el.querySelector('.cx-auto'),
  cash: el.querySelector('.cx-cash'), half: el.querySelector('.cx-half'), msg: el.querySelector('.cx-smsg'),
}));
const chartEl = $('cxChart'); let pts = [];       // curva del multiplicador (solo High Striker)
let st = null, rounds = 0;                       // ronda en curso y rondas jugadas en esta sesión

iconEl.textContent = G.icon;
slots.forEach(s => { if (s.half) s.half.hidden = !G.half; });

/* Ronda pendiente: si se cierra la página a mitad de vuelo no se puede retirar, así que cuenta como caída (se pierde lo que quedaba). */
const pendKey = () => `rc_crashpend_${String(RC.currentUser()).toLowerCase()}`;
const savePending = p => { try { RCMem.setItem(pendKey(), JSON.stringify(p)); } catch (e) {} };
const clearPending = () => { try { RCMem.removeItem(pendKey()); } catch (e) {} };
(function recover() {
  try {
    const p = JSON.parse(RCMem.getItem(pendKey()));
    clearPending();
    if (!p || !CE.GAMES[p.game] || !Number.isInteger(p.bet) || p.bet < CE.MIN_BET) return;
    RC.registerGameResult(CE.GAMES[p.game].name, false, p.bet, 0);
    RC.toast('lose', `La ronda de ${CE.GAMES[p.game].name} terminó mientras no estabas: perdiste ${money(p.bet)} monedas.`);
  } catch (e) {}
})();

function setButtons() {
  const live = st && !st.over;
  startBtn.disabled = !!st;
  slots.forEach((s, i) => {
    const r = live ? st.slots[i] : null, active = !!(r && r.remaining > 0);
    s.cash.disabled = !active;
    if (s.half) s.half.disabled = !(active && !r.halfUsed);
    s.bet.disabled = s.auto.disabled = !!st;
  });
}
function renderHistory() {
  histEl.innerHTML = history.slice(-12).reverse().map(c => `<span class="cx-chip ${c >= 2 ? 'hi' : 'lo'}">${fmtM(c)}</span>`).join('');
}
function renderStats(m, t) {                     // panel de estadísticas en vivo (solo Aero)
  if (!statsEl) return;
  const last = history.slice(-10), avg = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  const best = history.length ? Math.max(...history) : 0;
  statsEl.textContent = `Ronda ${rounds} · Tiempo ${t.toFixed(1)} s · Velocidad ${(m * G.k).toFixed(2)} x/s · Promedio últimas 10: ${avg ? fmtM(avg) : '—'} · Mejor caída: ${best ? fmtM(best) : '—'}`;
}

function drawChart(crashed) {
  if (!chartEl || !chartEl.getContext) return;
  const c = chartEl.getContext('2d'), w = chartEl.width, h = chartEl.height;
  c.clearRect(0, 0, w, h);
  if (pts.length < 2) return;
  const tMax = pts[pts.length - 1][0] || 1, mMax = Math.max(2, pts[pts.length - 1][1]);
  c.beginPath();
  pts.forEach(([t, m], i) => { const x = t / tMax * (w - 4) + 2, y = h - 2 - (m - 1) / (mMax - 1) * (h - 4); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.strokeStyle = crashed ? '#ff6b6b' : '#5be08f'; c.lineWidth = 2; c.stroke();
}

function finalize() {                            // un solo resultado por ronda, cuando ya no queda apuesta en juego
  if (st.done) return; st.done = true; clearPending();
  const bet = st.slots.reduce((a, r) => a + r.bet, 0), payout = st.slots.reduce((a, r) => a + r.payout, 0), won = payout > bet;
  RC.registerGameResult(G.name, won, bet, payout);
  const text = payout === 0 ? `${G.name} cayó en ${fmtM(st.crash)}.` : `Recuperaste ${money(payout)} monedas de ${money(bet)}.`;
  if (won) RC.result({ type: payout >= bet * 10 ? 'big' : 'win', title: '¡GANASTE!', amount: payout - bet, text });
  else if (payout === bet) RC.result({ type: 'push', title: 'EMPATE', amount: 0, text });
  else RC.result({ type: 'lose', title: 'PERDISTE', amount: bet - payout, text });
}

function cashOut(i, part, atMult) {
  if (!st || st.over) return;
  const r = st.slots[i]; if (!r || r.remaining <= 0) return;
  const m = atMult || st.m;
  const stake = part === 'half' ? CE.halfStake(r.bet) : r.remaining;
  const pay = CE.payoutFor(stake, m);
  r.remaining -= stake; r.payout += pay;
  if (part === 'half') r.halfUsed = true;
  RC.addCoins(pay);
  slots[i].msg.textContent = `Retiraste ${money(stake)} a ${fmtM(m)}: +${money(pay)} monedas.`;
  if (st.slots.every(x => x.remaining <= 0)) finalize();
  setButtons();
}

function end() {                                 // la ronda cayó
  st.over = true; st.m = st.crash;
  multEl.textContent = fmtM(st.crash); iconEl.textContent = G.fall;
  screen.classList.add('crashed');
  statusEl.textContent = `¡Cayó en ${fmtM(st.crash)}!`;
  pts.push([CE.timeAt(st.crash, G.k), st.crash]); drawChart(true);
  history.push(st.crash); renderHistory(); renderStats(st.crash, CE.timeAt(st.crash, G.k));
  st.slots.forEach(r => { r.remaining = 0; });
  finalize();
  st = null; setButtons();
}

function tick(now) {
  if (!st) return;
  const t = (now - st.t0) / 1000, m = CE.multAt(t, G.k);
  if (m >= st.crash) return end();
  st.m = m; multEl.textContent = fmtM(m); renderStats(m, t);
  pts.push([t, m]); drawChart(false);
  st.slots.forEach((r, i) => { if (r.auto > 1 && r.remaining > 0 && m >= r.auto) cashOut(i, 'all', r.auto); });
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', () => {
  if (st) return;
  const bets = [];
  for (let i = 0; i < slots.length; i++) {
    const raw = slots[i].bet.value, v = Number(raw);
    if (i > 0 && (raw === '' || v === 0)) { bets.push(null); continue; }   // las apuestas extra son opcionales
    if (!Number.isInteger(v) || v < CE.MIN_BET) { RC.toast('lose', `La apuesta mínima es ${CE.MIN_BET} monedas (número entero).`); slots[i].bet.value = CE.normalizeBet(raw); return; }
    bets.push(v);
  }
  const total = bets.reduce((a, b) => a + (b || 0), 0);
  if (total > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  RC.addCoins(-total);
  rounds++; pts = [];
  st = { crash: CE.crashPoint(), over: false, done: false, m: 1,
    slots: bets.map((b, i) => ({ bet: b || 0, auto: Number(slots[i].auto.value) || 0, remaining: b || 0, payout: 0, halfUsed: false })) };
  savePending({ game: KEY, bet: total });
  screen.classList.remove('crashed'); iconEl.textContent = G.icon;
  multEl.textContent = '1.00x'; statusEl.textContent = '¡Despegando!'; slots.forEach(s => { s.msg.textContent = ''; });
  setButtons();
  st.t0 = performance.now();
  requestAnimationFrame(tick);
});
slots.forEach((s, i) => {
  s.cash.addEventListener('click', () => cashOut(i, 'all'));
  if (s.half) s.half.addEventListener('click', () => cashOut(i, 'half'));
  s.el.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn =>
    btn.addEventListener('click', () => { if (!st) s.bet.value = CE.normalizeBet(s.bet.value) + Number(btn.dataset.add); }));
});
setButtons(); renderStats(1, 0);
