// tragamonedas.js — lógica de tragamonedas.html (usa RC de app.js)

RC.initHeader();

const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣'];
const PAYOUTS = { '7️⃣': 20, '💎': 12, '⭐': 8, '🍊': 5, '🍋': 4, '🍒': 3 };

const betInput = document.getElementById('bet');
const spinBtn = document.getElementById('spinBtn');
const payoutLine = document.getElementById('payoutLine');
const reels = [document.getElementById('reel0'), document.getElementById('reel1'), document.getElementById('reel2')];

document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
  });
});
document.querySelector('[data-max]').addEventListener('click', () => {
  betInput.value = RC.getUser().coins;
});

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

spinBtn.addEventListener('click', () => {
  const bet = Math.max(10, Math.floor(Number(betInput.value) || 0));
  const user = RC.getUser();
  if (bet > user.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }

  betInput.value = bet;
  spinBtn.disabled = true;
  payoutLine.textContent = '\u00A0';
  RC.addCoins(-bet);
  reels.forEach(r => r.classList.add('spinning'));

  const finalSymbols = [randomSymbol(), randomSymbol(), randomSymbol()];
  let ticks = 0;
  const spinInterval = setInterval(() => {
    reels.forEach(r => r.textContent = randomSymbol());
    ticks++;
    if (ticks > 14) {
      clearInterval(spinInterval);
      reels.forEach((r, i) => {
        r.classList.remove('spinning');
        r.textContent = finalSymbols[i];
      });
      resolveSpin(finalSymbols, bet);
    }
  }, 90);
});

function resolveSpin(symbols, bet) {
  let payout = 0;
  let won = false;

  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    const mult = PAYOUTS[symbols[0]];
    payout = bet * mult;
    won = true;
    payoutLine.textContent = `¡Triple ${symbols[0]}! Ganas ${RC.formatNumber(payout)} monedas (×${mult})`;
  } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
    payout = bet;
    won = true;
    payoutLine.textContent = `Dos símbolos iguales. Recuperas tu apuesta.`;
  } else {
    payoutLine.textContent = 'Sin premio esta vez.';
  }

  if (payout > 0) RC.addCoins(payout);
  RC.toast(won ? 'win' : 'lose', won ? `+${RC.formatNumber(payout)} monedas` : 'Sin premio');
  RC.registerGameResult('Tragamonedas', won && payout > bet, bet, payout);
  spinBtn.disabled = false;
}