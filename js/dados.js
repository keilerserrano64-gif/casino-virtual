// dados.js — lógica de dados.html (usa RC de app.js)

RC.initHeader();

const PIP_LAYOUTS = {
  1: [4],
  2: [0,8],
  3: [0,4,8],
  4: [0,2,6,8],
  5: [0,2,4,6,8],
  6: [0,2,3,5,6,8],
};

function buildDieFace(dieEl, value) {
  dieEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip';
    if (PIP_LAYOUTS[value].includes(i)) pip.style.opacity = '1';
    dieEl.appendChild(pip);
  }
}

const die1 = document.getElementById('die1');
const die2 = document.getElementById('die2');
buildDieFace(die1, 1);
buildDieFace(die2, 1);

let currentMode = 'mayor';
document.querySelectorAll('#modes button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#modes button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
  });
});

const betInput = document.getElementById('bet');
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
  });
});

const rollBtn = document.getElementById('rollBtn');
const sumDisplay = document.getElementById('sumDisplay');
const diceMsg = document.getElementById('diceMsg');

rollBtn.addEventListener('click', () => {
  const bet = Math.max(10, Math.floor(Number(betInput.value) || 0));
  const user = RC.getUser();
  if (bet > user.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  betInput.value = bet;
  rollBtn.disabled = true;
  RC.addCoins(-bet);

  die1.classList.add('rolling');
  die2.classList.add('rolling');
  diceMsg.textContent = '';

  let ticks = 0;
  const interval = setInterval(() => {
    buildDieFace(die1, 1 + Math.floor(Math.random()*6));
    buildDieFace(die2, 1 + Math.floor(Math.random()*6));
    ticks++;
    if (ticks > 12) {
      clearInterval(interval);
      const v1 = 1 + Math.floor(Math.random()*6);
      const v2 = 1 + Math.floor(Math.random()*6);
      buildDieFace(die1, v1);
      buildDieFace(die2, v2);
      die1.classList.remove('rolling');
      die2.classList.remove('rolling');
      resolveRoll(v1, v2, bet);
    }
  }, 80);
});

function resolveRoll(v1, v2, bet) {
  const sum = v1 + v2;
  sumDisplay.textContent = `Suma: ${sum}`;

  let won = false, mult = 0;
  if (currentMode === 'mayor' && sum > 7) { won = true; mult = 2; }
  if (currentMode === 'menor' && sum < 7) { won = true; mult = 2; }
  if (currentMode === 'igual7' && sum === 7) { won = true; mult = 5; }
  if (currentMode === 'doble' && v1 === v2) { won = true; mult = 8; }

  const payout = won ? bet * mult : 0;
  if (payout > 0) RC.addCoins(payout);
  const text = won ? `¡Ganaste! +${RC.formatNumber(payout)} monedas` : `Sin premio. Salió ${v1} y ${v2}.`;
  diceMsg.textContent = text;
  RC.toast(won ? 'win' : 'lose', text);
  RC.registerGameResult('Dados', won, bet, payout);
  rollBtn.disabled = false;
}