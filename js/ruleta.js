// ruleta.js — lógica de ruleta.html (usa RC de app.js)

RC.initHeader();

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

let currentMode = 'color';
let currentValue = 'rojo';
let selectedNumber = null;

const numberGrid = document.getElementById('numberGrid');
for (let n = 0; n <= 36; n++) {
  const b = document.createElement('button');
  b.className = 'num-btn ' + colorOf(n);
  b.textContent = n;
  b.dataset.num = n;
  b.addEventListener('click', () => {
    document.querySelectorAll('.num-btn').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    selectedNumber = n;
  });
  numberGrid.appendChild(b);
}

document.querySelectorAll('#betModes button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#betModes button').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    currentValue = btn.dataset.value;
    numberGrid.style.display = currentMode === 'number' ? 'grid' : 'none';
  });
});

const betInput = document.getElementById('bet');
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
  });
});

const wheel = document.getElementById('wheel');
const resultNumber = document.getElementById('resultNumber');
const spinBtn = document.getElementById('spinBtn');
const historyStrip = document.getElementById('historyStrip');
let wheelRotation = 0;
let history = [];

spinBtn.addEventListener('click', () => {
  const bet = Math.max(10, Math.floor(Number(betInput.value) || 0));
  const user = RC.getUser();
  if (bet > user.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  if (currentMode === 'number' && selectedNumber === null) { RC.toast('info', 'Elige un número primero.'); return; }

  betInput.value = bet;
  spinBtn.disabled = true;
  RC.addCoins(-bet);

  const landing = Math.floor(Math.random() * 37);
  wheelRotation += 1440 + landing * (360 / 37);
  wheel.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    const c = colorOf(landing);
    resultNumber.textContent = landing;
    resultNumber.className = 'result-number ' + c;

    let won = false, mult = 0;
    if (currentMode === 'color' && c === currentValue) { won = true; mult = 2; }
    if (currentMode === 'parity') {
      const isEven = landing !== 0 && landing % 2 === 0;
      if ((currentValue === 'par' && isEven) || (currentValue === 'impar' && !isEven)) { won = true; mult = 2; }
    }
    if (currentMode === 'number' && selectedNumber === landing) { won = true; mult = 35; }

    const payout = won ? bet * mult : 0;
    if (payout > 0) RC.addCoins(payout);
    RC.toast(won ? 'win' : 'lose', won ? `¡Acertaste! +${RC.formatNumber(payout)} monedas` : `Salió ${landing}. Sin premio.`);
    RC.registerGameResult('Ruleta', won, bet, payout);

    history.unshift(landing);
    history = history.slice(0, 10);
    historyStrip.innerHTML = history.map(n => `<span class="result-number ${colorOf(n)}" style="width:30px;height:30px;font-size:.74rem;">${n}</span>`).join('');

    spinBtn.disabled = false;
  }, 2250);
});