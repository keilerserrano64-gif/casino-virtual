// tragamonedas.js — lógica de tragamonedas.html (usa RC de app.js y SlotEngine de tragamonedas_engine.js)
// La capa visual/sonora vive en tragamonedas_fx.js (SlotFX); si no carga, el juego funciona igual.

RC.initHeader();

const SYMBOLS = SlotEngine.SYMBOLS;
const FX = (typeof SlotFX !== 'undefined') ? SlotFX : null;
// Llama a un efecto sin que un fallo visual pueda romper el juego ni dejar un giro sin pagar.
async function fx(name, ...args) {
  try { return FX && FX[name] ? await FX[name](...args) : undefined; }
  catch (e) { console.warn('SlotFX.' + name, e); }
}

const betInput = document.getElementById('bet');
const spinBtn = document.getElementById('spinBtn');
const autoBtn = document.getElementById('autoBtn');
const payoutLine = document.getElementById('payoutLine');

const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const AUTO_SPINS = 10;

document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
    fx('click'); fx('hud');
  });
});
document.querySelector('[data-max]').addEventListener('click', () => {
  betInput.value = RC.getUser().coins;
  fx('click'); fx('hud');
});
document.querySelectorAll('.rc-chip-btn[data-step]').forEach(btn => {
  btn.addEventListener('click', () => {
    const dir = Number(btn.dataset.step);
    const cur = SlotEngine.normalizeBet(betInput.value);
    let next;
    if (dir > 0) {
      next = BET_STEPS.find(v => v > cur);
      if (next === undefined || next > RC.getUser().coins) next = cur;   // no subir por encima del saldo
    } else {
      next = [...BET_STEPS].reverse().find(v => v < cur);
      if (next === undefined) next = SlotEngine.MIN_BET;
    }
    betInput.value = next;
    fx('click'); fx('hud');
  });
});

/* Giro pendiente: el resultado se decide y se guarda ANTES de animar. Si el jugador cierra o
   recarga la página a mitad de giro, el premio se acredita al volver a entrar (no se pierde). */
const pendingKey = () => `rc_slotpend_${String(RC.currentUser()).toLowerCase()}`;
const savePending = spin => { try { localStorage.setItem(pendingKey(), JSON.stringify(spin)); } catch (e) {} };
const clearPending = () => { try { localStorage.removeItem(pendingKey()); } catch (e) {} };
function loadPending() {
  try {
    const s = JSON.parse(localStorage.getItem(pendingKey()));
    const ok = s && Array.isArray(s.symbols) && s.symbols.length === SlotEngine.REELS &&
      s.symbols.every(x => SYMBOLS.includes(x)) && Number.isInteger(s.bet) && s.bet >= SlotEngine.MIN_BET;
    // se vuelve a calcular el pago con las reglas del motor (no se confía en el valor guardado)
    return ok ? { symbols: s.symbols, bet: s.bet, ...SlotEngine.evaluate(s.symbols, s.bet) } : null;
  } catch (e) { return null; }
}

let spinning = false;
let autoLeft = 0;

function setAuto(n) {
  autoLeft = n;
  autoBtn.classList.toggle('on', n > 0);
  autoBtn.textContent = n > 0 ? `AUTO · ${n}` : 'AUTO';
  autoBtn.setAttribute('aria-pressed', String(n > 0));
}

spinBtn.addEventListener('click', () => doSpin(false));
autoBtn.addEventListener('click', () => {
  if (autoLeft > 0) { setAuto(0); return; }
  setAuto(AUTO_SPINS);
  fx('click');
  if (!spinning) doSpin(true);
});
// Los giros automáticos no siguen gastando monedas si el jugador cambia de pestaña.
document.addEventListener('visibilitychange', () => { if (document.hidden) setAuto(0); });

async function doSpin(fromAuto) {
  if (spinning) return;
  if (fromAuto && autoLeft <= 0) return;
  const bet = SlotEngine.normalizeBet(betInput.value);
  const user = RC.getUser();
  if (bet > user.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); setAuto(0); return; }

  spinning = true;
  betInput.value = bet;
  spinBtn.disabled = true;
  payoutLine.textContent = '\u00A0';

  const result = SlotEngine.spin(bet);   // resultado decidido por el RNG del motor
  savePending(result);
  RC.addCoins(-bet);
  fx('hud');

  await fx('spin', result, { turbo: autoLeft > 0 });
  await resolveSpin(result);
}

async function resolveSpin(result) {
  const { symbols, bet, kind, mult, payout } = result;
  const won = payout > 0;

  if (kind === 'triple') {
    payoutLine.textContent = `¡Triple ${symbols[0]}! Ganas ${RC.formatNumber(payout)} monedas (×${mult})`;
  } else if (kind === 'pair') {
    payoutLine.textContent = `Dos símbolos iguales. Recuperas tu apuesta.`;
  } else {
    payoutLine.textContent = 'Sin premio esta vez.';
  }

  // Primero se acredita y se registra (aunque falle un efecto), después se celebra.
  if (payout > 0) RC.addCoins(payout);
  clearPending();
  RC.toast(won ? 'win' : 'lose', won ? `+${RC.formatNumber(payout)} monedas` : 'Sin premio');
  RC.registerGameResult('Tragamonedas', payout > bet, bet, payout);
  fx('hud');

  await fx('celebrate', result);

  spinning = false;
  spinBtn.disabled = false;

  if (autoLeft > 0) {
    autoLeft--;
    const stop = autoLeft === 0 || document.hidden || mult >= 100 ||
      RC.getUser().coins < SlotEngine.normalizeBet(betInput.value);
    if (stop) setAuto(0);
    else { setAuto(autoLeft); setTimeout(() => doSpin(true), 450); }
  }
}

// Si quedó un giro a medias (página cerrada durante la animación), se liquida al entrar.
(function settleInterruptedSpin() {
  if (!RC.currentUser()) return;
  const pending = loadPending();
  if (!pending) { clearPending(); return; }
  spinning = true; spinBtn.disabled = true;
  fx('setSymbols', pending.symbols);
  resolveSpin(pending);
})();
