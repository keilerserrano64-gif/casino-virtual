// carreras.js — lógica de carreras.html (usa RC de app.js)

RC.initHeader();

const HORSES = [
  { emoji: '🐎', name: 'Relámpago', odds: 3 },
  { emoji: '🐴', name: 'Trueno', odds: 4 },
  { emoji: '🦄', name: 'Estrella', odds: 6 },
  { emoji: '🐎', name: 'Fantasma', odds: 5 },
  { emoji: '🐴', name: 'Corsario', odds: 8 },
];

let selected = 0;

const horsePick = document.getElementById('horsePick');
HORSES.forEach((h, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="emoji">${h.emoji}</span><span>${h.name}</span><span class="odds">×${h.odds}</span>`;
  if (i === 0) b.classList.add('selected');
  b.addEventListener('click', () => {
    document.querySelectorAll('.horse-pick button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    selected = i;
  });
  horsePick.appendChild(b);
});

const track = document.getElementById('track');
function buildTrack() {
  track.innerHTML = '';
  HORSES.forEach((h, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.innerHTML = `<span class="lbl">${h.name}</span><span class="horse" id="horse${i}" style="left:4px;">${h.emoji}</span><span class="flag">🏁</span>`;
    track.appendChild(lane);
  });
}
buildTrack();

const betInput = document.getElementById('bet');
document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add);
  });
});

const startBtn = document.getElementById('startBtn');
const raceMsg = document.getElementById('raceMsg');

startBtn.addEventListener('click', () => {
  const bet = Math.max(10, Math.floor(Number(betInput.value) || 0));
  const user = RC.getUser();
  if (bet > user.coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  betInput.value = bet;
  RC.addCoins(-bet);
  startBtn.disabled = true;
  raceMsg.textContent = 'Corriendo...';
  buildTrack();

  // pesos inversos a las cuotas: caballos con menor cuota son más rápidos en promedio
  const finishTimes = HORSES.map(h => (2.4 + Math.random() * 1.6) * (h.odds / 3));
  let winnerIndex = 0;
  finishTimes.forEach((t, i) => { if (t < finishTimes[winnerIndex]) winnerIndex = i; });

  requestAnimationFrame(() => {
    HORSES.forEach((h, i) => {
      const el = document.getElementById('horse' + i);
      const maxLeft = 'calc(100% - 40px)';
      el.style.transitionDuration = finishTimes[i].toFixed(2) + 's';
      el.style.left = maxLeft;
    });
  });

  const maxTime = Math.max(...finishTimes) * 1000 + 300;
  setTimeout(() => {
    const won = winnerIndex === selected;
    const payout = won ? bet * HORSES[selected].odds : 0;
    if (payout > 0) RC.addCoins(payout);
    const text = won
      ? `¡${HORSES[winnerIndex].name} gana! Acertaste. +${RC.formatNumber(payout)} monedas.`
      : `Gana ${HORSES[winnerIndex].name}. Tu caballo no llegó primero.`;
    raceMsg.textContent = text;
    RC.toast(won ? 'win' : 'lose', text);
    RC.registerGameResult('Carreras', won, bet, payout);
    startBtn.disabled = false;
  }, maxTime);
});