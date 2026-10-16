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
const chartEl = $('cxChart'); let pts = [];       // curva del multiplicador (High Striker la dibuja también en su gráfico)
let st = null, rounds = 0;                       // ronda en curso y rondas jugadas en esta sesión

const KEY_ICON = document.body.dataset.crash;     // icono de línea del juego (iconos.js)
iconEl.innerHTML = RCGameIcon(KEY_ICON);
slots.forEach(s => { if (s.half) s.half.hidden = !G.half; });

/* Escenario animado (solo visual): fondo con estrellas, curva de vuelo y el icono siguiendo la punta. Nunca decide nada. */
const stage = document.createElement('canvas');
stage.className = 'cx-stage'; stage.setAttribute('aria-hidden', 'true');
screen.prepend(stage);
const reduced = () => RC.getSettings().anim === false || matchMedia('(prefers-reduced-motion: reduce)').matches;
const stars = Array.from({ length: 70 }, () => [Math.random(), Math.random(), Math.random() * 1.4 + .3]);
const accent = () => getComputedStyle(screen).getPropertyValue('--cx-a').trim() || '#ff2b4a';
function fitStage() {
  const r = window.devicePixelRatio || 1;
  stage.width = Math.round(stage.clientWidth * r); stage.height = Math.round(stage.clientHeight * r);
}
function drawStage(crashed) {
  const c = stage.getContext && stage.getContext('2d'); if (!c) return;
  const r = window.devicePixelRatio || 1, w = stage.width, h = stage.height, now = performance.now() / 1000;
  c.clearRect(0, 0, w, h);
  const flying = pts.length > 1, last = flying ? pts[pts.length - 1] : [0, 1];
  const drift = reduced() ? 0 : (flying && !crashed ? last[0] * .06 : now * .01);
  stars.forEach(([x, y, s]) => {                  // estrellas que se desplazan al volar
    c.globalAlpha = .25 + .5 * Math.abs(Math.sin(now * s + x * 9));
    c.fillStyle = '#fff'; c.fillRect(((x - drift * s) % 1 + 1) % 1 * w, y * h * .85, s * r, s * r);
  });
  c.globalAlpha = 1;
  const pad = 26 * r, gw = w - pad * 2, gh = h - pad * 2;
  c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = r;   // ejes
  c.beginPath(); c.moveTo(pad, pad); c.lineTo(pad, h - pad); c.lineTo(w - pad, h - pad); c.stroke();
  const tMax = Math.max(8, last[0] * 1.15), mMax = Math.max(2, last[1] * 1.15);
  const X = t => pad + t / tMax * gw, Y = m => h - pad - (m - 1) / (mMax - 1) * gh;
  let tip = [X(0), Y(1)];
  if (flying) {
    const col = crashed ? '#ff3b4f' : accent();
    const curve = Array.from({ length: 61 }, (_, i) => { const t = last[0] * i / 60; return [t, Math.min(CE.multAt(t, G.k), last[1])]; });
    const path = () => { c.beginPath(); c.moveTo(X(0), Y(1)); curve.forEach(([t, m]) => c.lineTo(X(t), Y(m))); };
    path(); tip = [X(last[0]), Y(last[1])];
    const g = c.createLinearGradient(0, tip[1], 0, h - pad);
    g.addColorStop(0, col + '88'); g.addColorStop(1, col + '05');
    c.save(); c.lineTo(tip[0], h - pad); c.lineTo(X(0), h - pad); c.closePath(); c.fillStyle = g; c.fill(); c.restore();
    path(); c.strokeStyle = col; c.lineWidth = 4 * r; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 18 * r; c.stroke(); c.shadowBlur = 0;
  }
  iconEl.style.left = (tip[0] / w * 100) + '%'; iconEl.style.top = (tip[1] / h * 100) + '%';
}
function idle() { if (!st) { drawStage(screen.classList.contains('crashed')); if (!reduced()) requestAnimationFrame(idle); } }
new ResizeObserver(() => { fitStage(); drawStage(screen.classList.contains('crashed')); }).observe(stage);
const liveCash = m => slots.forEach((s, i) => {                // el botón RETIRAR muestra lo que cobrarías ahora
  const r = st && st.slots[i], base = s.cash.dataset.label || (s.cash.dataset.label = s.cash.textContent.trim());
  s.cash.textContent = r && r.remaining > 0 && !st.over ? `${base} ${money(Math.floor(r.remaining * m))}` : base;
});

/* Ronda pendiente: si se cierra la página a mitad de vuelo no se puede retirar, así que cuenta como caída (se pierde lo que quedaba). */
const pendKey = () => `rc_crashpend_${String(RC.currentUser()).toLowerCase()}`;
const savePending = p => { try { RCMem.setItem(pendKey(), JSON.stringify(p)); } catch (e) {} };
const clearPending = () => { try { RCMem.removeItem(pendKey()); } catch (e) {} };
(function recover() {
  try {
    const p = JSON.parse(RCMem.getItem(pendKey()));
    clearPending();
    if (!p || !CE.GAMES[p.game] || !Number.isInteger(p.bet) || p.bet < CE.MIN_BET) return;
    const payout = Number.isSafeInteger(p.payout) && p.payout >= 0 ? p.payout : 0;
    RC.registerGameResult(CE.GAMES[p.game].name, payout > p.bet, p.bet, payout);
    RC.toast('lose', `La ronda de ${CE.GAMES[p.game].name} terminó mientras no estabas: retorno total ${money(payout)} de ${money(p.bet)} monedas.`);
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
  histEl.innerHTML = history.slice(-12).reverse().map(c => `<span class="cx-chip ${c >= 10 ? 'top' : c >= 2 ? 'hi' : 'lo'}">${fmtM(c)}</span>`).join('');
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
  const m = atMult || CE.multAt((performance.now() - st.t0) / 1000, G.k);
  if (m >= st.crash) { tick(performance.now()); return; }
  const pay = CE.withdraw(st, i, part, m);
  if (!pay) return;
  RC.addCoins(pay);
  savePending({ game: KEY, bet: st.slots.reduce((a, x) => a + x.bet, 0), payout: st.slots.reduce((a, x) => a + x.payout, 0) });
  slots[i].msg.textContent = `Retiraste a ${fmtM(m)}: +${money(pay)} monedas.`;
  if (st.slots.every(x => x.remaining <= 0)) finalize();
  setButtons(); liveCash(m);
}

function end() {                                 // la ronda cayó
  st.over = true; st.m = st.crash;
  multEl.textContent = fmtM(st.crash); iconEl.innerHTML = RCIcon('trending-down'); screen.classList.remove('flying');
  screen.classList.add('crashed'); liveCash(1);
  statusEl.textContent = `¡Cayó en ${fmtM(st.crash)}!`;
  pts.push([CE.timeAt(st.crash, G.k), st.crash]); drawChart(true); drawStage(true);
  history.push(st.crash); renderHistory(); renderStats(st.crash, CE.timeAt(st.crash, G.k));
  st.slots.forEach(r => { r.remaining = 0; });
  finalize();
  st = null; setButtons();
  if (!reduced()) setTimeout(() => { if (!st) requestAnimationFrame(idle); }, 1200);
}

function tick(now) {
  if (!st) return;
  const t = (now - st.t0) / 1000, m = CE.multAt(t, G.k);
  CE.autoDue(st, m).forEach(x => cashOut(x.i, 'all', x.m));
  if (m >= st.crash) return end();
  st.m = m; multEl.textContent = fmtM(m); renderStats(m, t);
  pts.push([t, m]); drawChart(false); drawStage(false); liveCash(m);
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', () => {
  if (st) return;
  const bets = [];
  for (let i = 0; i < slots.length; i++) {
    const raw = slots[i].bet.value, v = Number(raw);
    if (i > 0 && (raw === '' || v === 0)) { bets.push(null); continue; }   // las apuestas extra son opcionales
    if (!Number.isSafeInteger(v) || v < CE.MIN_BET || v > Number.MAX_SAFE_INTEGER / CE.MAX_MULT / slots.length) { RC.toast('lose', `La apuesta mínima es ${CE.MIN_BET} monedas (número entero).`); slots[i].bet.value = CE.normalizeBet(raw); return; }
    const auto = Number(slots[i].auto.value);
    if (!Number.isFinite(auto) || (auto !== 0 && (auto <= 1 || auto >= CE.MAX_MULT || Math.abs(auto * 100 - Math.round(auto * 100)) > 1e-8))) { RC.toast('lose', 'Retiro automático inválido: mayor que 1 y menor que 1000.'); return; }
    bets.push(v);
  }
  const total = bets.reduce((a, b) => a + (b || 0), 0);
  if (total > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  RC.addCoins(-total);
  rounds++; pts = [];
  st = { half: G.half, crash: CE.crashPoint(), over: false, done: false, m: 1,
    slots: bets.map((b, i) => ({ bet: b || 0, auto: Number(slots[i].auto.value) || 0, remaining: b || 0, payout: 0, halfUsed: false })) };
  savePending({ game: KEY, bet: total });
  screen.classList.remove('crashed'); screen.classList.add('flying'); iconEl.innerHTML = RCGameIcon(KEY_ICON);
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
setButtons(); renderStats(1, 0); fitStage(); idle();
