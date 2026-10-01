// carreras.js — lógica de carreras.html (usa RC de app.js y RaceEngine de carreras_engine.js)
RC.initHeader();
const RE = RaceEngine;
const $ = id => document.getElementById(id);
const K = RE.KINDS;

let race = RE.newRace(), selected = 0, busy = false;
const horsePick = $('horsePick'), track = $('track'), betInput = $('bet');
const startBtn = $('startBtn'), raceMsg = $('raceMsg'), kindSel = $('betKind');
const SILKS = ['#d63a3a', '#2f6fd6', '#8b4fc7', '#e8a41c', '#1fa88a'];   // casacas por caballo
const pct = p => (p * 100).toFixed(1).replace('.', ',') + ' %';
const money = n => RC.formatNumber(n);

Object.entries(K).forEach(([k, v]) => kindSel.add(new Option(v.label, k)));

function renderPicks() {
  const kind = kindSel.value;
  horsePick.innerHTML = '';
  race.horses.forEach((h, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.style.setProperty('--silk', SILKS[i]);
    b.title = `Velocidad ${h.speed} · Resistencia ${h.stamina} · Forma ${h.form} · Condición hoy ${Math.round((race.conds[i] - 1) * 100)} %`;
    b.innerHTML = `<span class="emoji">${h.emoji}</span><span>${h.name}</span><span class="odds">×${h.odds[kind].toFixed(1)} · ${pct(h.prob[kind])}</span>`;
    b.classList.toggle('selected', i === selected);
    b.disabled = busy;
    b.addEventListener('click', () => { selected = i; renderPicks(); });
    horsePick.appendChild(b);
  });
}
function buildTrack() {
  track.innerHTML = '';
  race.horses.forEach((h, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane' + (i === selected ? ' mine' : '');
    lane.style.setProperty('--silk', SILKS[i]);
    lane.innerHTML = `<span class="num">${i + 1}</span><span class="lbl">${h.name}</span><span class="horse" id="horse${i}" style="left:4px;">${h.emoji}</span><span class="flag">🏁</span>`;
    track.appendChild(lane);
  });
}
function nextRace() { race = RE.newRace(); renderPicks(); }   // la pista conserva el resultado hasta la próxima carrera
function markResult(order) {                // medallas 1.º-3.º y carril ganador (solo visual)
  track.classList.remove('racing');
  order.slice(0, 3).forEach((h, k) => {
    const lane = track.children[h]; if (!lane) return;
    lane.classList.add('pos' + (k + 1));
    const m = document.createElement('span'); m.className = 'rank'; m.textContent = k + 1; lane.appendChild(m);
  });
}
kindSel.addEventListener('change', () => { if (!busy) renderPicks(); });

document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn =>
  btn.addEventListener('click', () => { betInput.value = RE.normalizeBet(betInput.value) + Number(btn.dataset.add); }));

/* Giro pendiente: el resultado se decide y se guarda ANTES de animar; si se cierra la página a mitad de
   carrera, el premio se acredita al volver. Al leerlo se reconstruye y valida todo con el motor. */
const pendKey = () => `rc_racepend_${String(RC.currentUser()).toLowerCase()}`;
const savePending = p => { try { localStorage.setItem(pendKey(), JSON.stringify(p)); } catch (e) {} };
const clearPending = () => { try { localStorage.removeItem(pendKey()); } catch (e) {} };
function loadPending() {
  try {
    const p = JSON.parse(localStorage.getItem(pendKey()));
    if (!p || !RE.validConds(p.conds) || !RE.isOrder(p.order, RE.HORSES.length) || !K[p.kind] ||
        !Number.isInteger(p.pick) || p.pick < 0 || p.pick >= RE.HORSES.length || !Number.isInteger(p.bet) || p.bet < RE.MIN_BET) return null;
    return { ...p, race: RE.buildRace(p.conds) };
  } catch (e) { return null; }
}
function finish(p) {                       // paga una sola vez: primero se borra el pendiente
  clearPending(); markResult(p.order);
  const r = RE.settle(p.race, p.order, p.pick, p.kind, p.bet), h = p.race.horses;
  if (r.payout > 0) RC.addCoins(r.payout);
  const text = r.won
    ? `¡${h[p.pick].name} llegó ${r.rank}.º! ${K[p.kind].label} a ×${r.odds.toFixed(1)}: +${money(r.payout)} monedas.`
    : `Ganó ${h[p.order[0]].name}. ${h[p.pick].name} llegó ${r.rank}.º y no cumple ${K[p.kind].label}.`;
  raceMsg.textContent = text;
  RC.result(r.won ? { type: 'win', title: '¡GANASTE!', amount: r.payout, text } : { type: 'lose', title: 'PERDISTE', amount: p.bet, text });
  RC.registerGameResult('Carreras', r.won, p.bet, r.payout);
}

startBtn.addEventListener('click', () => {
  if (busy) return;
  const bet = Number(betInput.value);
  if (!Number.isInteger(bet) || bet < RE.MIN_BET) { RC.toast('lose', `La apuesta mínima es ${RE.MIN_BET} monedas (número entero).`); betInput.value = RE.normalizeBet(betInput.value); return; }
  if (bet > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  busy = true; startBtn.disabled = true; kindSel.disabled = true; renderPicks();
  RC.addCoins(-bet);
  const order = RE.drawOrder(race);
  const p = { conds: race.conds, order, pick: selected, kind: kindSel.value, bet };
  savePending(p);
  raceMsg.textContent = 'Corriendo...';
  buildTrack(); track.classList.add('racing');
  const t = RE.times(order);
  requestAnimationFrame(() => race.horses.forEach((h, i) => {
    const el = $('horse' + i);
    el.style.transitionDuration = t[i].toFixed(2) + 's';
    el.style.left = 'calc(100% - 40px)';
  }));
  setTimeout(() => {
    finish({ ...p, race });
    busy = false; startBtn.disabled = false; kindSel.disabled = false;
    nextRace();
  }, Math.max(...t) * 1000 + 300);
});

// recuperar una carrera interrumpida
const pend = loadPending();
renderPicks(); buildTrack();
if (pend) finish(pend);
