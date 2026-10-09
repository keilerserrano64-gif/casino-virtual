// slots.js — lógica compartida de gatesofolympus.html, sweetbonanza.html, bookofdead.html y starburst.html (usa RC de app.js y SlotEngine)
RC.initHeader();
const SE = SlotEngine, $ = id => document.getElementById(id);
const KEY = document.body.dataset.slot, G = SE.GAMES[KEY];
const money = n => RC.formatNumber(n);
const gridEl = $('sGrid'), betEl = $('sBet'), spinBtn = $('sSpin'), msgEl = $('sMsg'), infoEl = $('sInfo'), winEl = $('sWin');
let busy = false;

gridEl.style.gridTemplateColumns = `repeat(${G.cols}, 1fr)`;
const cells = Array.from({ length: G.cols * G.rows }, () => { const d = document.createElement('div'); d.className = 's-cell'; gridEl.appendChild(d); return d; });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function show(cellsTxt, win) {
  const w = new Set(win || []);
  cells.forEach((el, i) => { el.textContent = cellsTxt[i] || ''; el.classList.toggle('win', w.has(i)); });
}
// primera imagen: cuadrícula con símbolos al azar
show(Array.from({ length: cells.length }, () => SE.pick(G.symbols)));

/* Tabla de pagos (ya multiplicada por la calibración del juego) */
(function paytable() {
  const f = n => +(n * G.scale).toFixed(2);
  let rows;
  if (G.type === 'cluster') {
    rows = Object.entries(G.pay).map(([s, p]) => `<tr><td>${s}</td><td>×${f(p[0])}</td><td>×${f(p[1])}</td><td>×${f(p[2])}</td></tr>`).join('');
    $('sPay').innerHTML = `<p>Gana con 8 o más símbolos iguales en cualquier lugar. Los premios son veces la apuesta. Los símbolos ganadores desaparecen y caen otros (cascada).</p>
      <table class="rc-table"><thead><tr><th>Símbolo</th><th>8-9</th><th>10-11</th><th>12+</th></tr></thead><tbody>${rows}</tbody></table>
      <p>${G.scatter} Scatter: 4 → ×${G.scatterPay[4]} · 5 → ×${G.scatterPay[5]} · 6 → ×${G.scatterPay[6]} y ${G.fsCount} giros gratis (+${G.fsRetrigger} con 3 o más). ${G.orb} Multiplicadores ${G.accumMult ? '(se acumulan en los giros gratis)' : '(solo en giros gratis)'} se suman al final de la cascada si hubo premio.</p>`;
  } else {
    rows = Object.entries(G.pay).map(([s, p]) => `<tr><td>${s}</td><td>${[2, 3, 4, 5].map(n => p[n] ? `${n}: ×${f(p[n])}` : '').filter(Boolean).join(' · ')}</td></tr>`).join('');
    $('sPay').innerHTML = `<p>${G.lines} líneas fijas. Los premios son veces la apuesta de línea (apuesta ÷ ${G.lines}).${G.bothWays ? ' Paga en ambos sentidos.' : ''}</p>
      <table class="rc-table"><thead><tr><th>Símbolo</th><th>Pagos</th></tr></thead><tbody>${rows}</tbody></table>` +
      (KEY === 'bod' ? `<p>📖 Comodín y Scatter: 3 o más → ×${G.scatterPay[3]}/×${G.scatterPay[4]}/×${G.scatterPay[5]} la apuesta y ${G.fsCount} giros gratis con un símbolo especial que se expande y paga en cualquier posición.</p>`
        : `<p>${G.wild} Comodín solo en los carretes 2, 3 y 4: se expande y da un respin (máx. ${G.maxRespins}).</p>`);
  }
})();

/* Estado de giros gratis y giros de bienvenida: se guardan por usuario para no perder nada si se cierra la página */
const user = () => String(RC.currentUser()).toLowerCase();
const fsKey = () => `rc_slotfs_${user()}_${KEY}`, wKey = () => `rc_slotwelcome_${user()}_${KEY}`;
const load = k => { try { return JSON.parse(RCMem.getItem(k)); } catch (e) { return null; } };
const save = (k, v) => { try { RCMem.setItem(k, JSON.stringify(v)); } catch (e) {} };
const drop = k => { try { RCMem.removeItem(k); } catch (e) {} };
let fs = load(fsKey());
if (fs && (fs.game !== KEY || !(fs.left > 0) || !Number.isInteger(fs.bet))) { drop(fsKey()); fs = null; }
let welcome = 0;
if (G.welcomeSpins) {                              // Starburst: 10 giros de bienvenida la primera vez
  const w = load(wKey()); welcome = w === null ? G.welcomeSpins : (Number.isInteger(w) && w > 0 ? w : 0);
  save(wKey(), welcome);
}
function refreshInfo() {
  const parts = [];
  if (fs) parts.push(`Giros gratis: ${fs.left}` + (fs.special ? ` · Símbolo especial: ${fs.special}` : '') + (G.accumMult && fs.mult ? ` · Multiplicador: ×${fs.mult}` : '') + ` · Acumulado: ${money(fs.acc)}`);
  if (welcome > 0) parts.push(`🎁 Giros de bienvenida: ${welcome} (apuesta ${SE.MIN_BET}, gratis)`);
  infoEl.textContent = parts.join(' | ');
  spinBtn.textContent = fs ? 'CONTINUAR GIROS GRATIS' : (welcome > 0 ? 'GIRO DE BIENVENIDA' : 'GIRAR');
}

async function play(res) {                         // anima los pasos de un giro (cascadas, expansiones, respins)
  for (const s of res.steps) {
    show(s.cells, s.win);
    if (s.amount > 0) winEl.textContent = `+${money(s.amount)}`;
    await sleep(s.win.length ? 700 : 450);
  }
}

async function round() {
  if (busy) return;
  let bet, free = false, welcomeSpin = false;
  if (fs) { bet = fs.bet; free = true; }
  else if (welcome > 0) { bet = SE.MIN_BET; welcomeSpin = true; welcome--; save(wKey(), welcome); }
  else {
    bet = Number(betEl.value);
    if (!Number.isInteger(bet) || bet < SE.MIN_BET) { RC.toast('lose', `La apuesta mínima es ${SE.MIN_BET} monedas (número entero).`); betEl.value = SE.normalizeBet(betEl.value); return; }
    if (bet > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
    RC.addCoins(-bet);
  }
  busy = true; spinBtn.disabled = betEl.disabled = true; msgEl.textContent = ''; winEl.textContent = '';
  let total = 0, state = fs;
  for (;;) {
    const res = SE.spin(KEY, bet, state);
    RC.addCoins(res.payout);                       // el premio se acredita al decidirse el giro (antes de animar)
    state = res.fs;
    total = state ? state.acc : res.payout;
    if (state && state.left > 0) save(fsKey(), state); else drop(fsKey());
    fs = state && state.left > 0 ? state : null;
    refreshInfo();
    await play(res);
    if (res.scatterWin) msgEl.textContent = `Scatter: +${money(res.scatterWin)}`;
    if (res.mult > 1 && res.payout > 0) msgEl.textContent += ` Multiplicador ×${res.mult}`;
    if (res.respins) msgEl.textContent = `${res.respins} respin${res.respins > 1 ? 's' : ''} con comodín expandido`;
    if (!fs) break;
    if (!free) { free = true; msgEl.textContent = `¡${fs.left} giros gratis!`; await sleep(1200); }
    else await sleep(700);
  }
  const wager = welcomeSpin ? 0 : bet, won = total > wager;
  winEl.textContent = total ? `Total: ${money(total)}` : '';
  RC.registerGameResult(G.name, won, wager, total);
  const text = total ? `Ganaste ${money(total)} monedas en ${G.name}.` : `Sin premio en ${G.name}.`;
  if (won) RC.result({ type: total >= bet * 25 ? 'big' : 'win', title: '¡GANASTE!', amount: total - wager, text });
  else if (total === wager) RC.result({ type: 'push', title: 'EMPATE', amount: 0, text });
  else RC.result({ type: 'lose', title: 'PERDISTE', amount: wager - total, text });
  busy = false; spinBtn.disabled = betEl.disabled = false; refreshInfo();
}

spinBtn.addEventListener('click', round);
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(b =>
  b.addEventListener('click', () => { if (!busy) betEl.value = SE.normalizeBet(betEl.value) + Number(b.dataset.add); }));
refreshInfo();
