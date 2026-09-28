// bingo.js — lógica de bingo.html (usa RC de app.js)
RC.initHeader();

const MAX_DRAWS = 30;            // bolas por partida
const LINE_PRIZE = 3, FULL_PRIZE = 10;
const $ = id => document.getElementById(id);
const cardEl = $('bingoCard'), ballEl = $('currentBall'), calledEl = $('calledBalls'), msgEl = $('bingoMsg');
const buyBtn = $('buyBtn'), drawBtn = $('drawBtn'), bingoBtn = $('bingoBtn'), betInput = $('bet'), betRow = $('betRow');

let cells = [], called = new Set(), pool = [], playing = false, bet = 0;

const LINES = [];
for (let i = 0; i < 5; i++) {
  LINES.push([0, 1, 2, 3, 4].map(c => i * 5 + c));   // filas
  LINES.push([0, 1, 2, 3, 4].map(r => r * 5 + i));   // columnas
}
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);   // diagonales

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function buildCard() {
  const cols = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]].map(([a, b]) =>
    shuffle(Array.from({ length: b - a + 1 }, (_, i) => a + i)).slice(0, 5));
  cardEl.innerHTML = ''; cells = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const el = document.createElement('div');
    const free = r === 2 && c === 2;
    el.dataset.n = free ? 0 : cols[c][r];
    el.textContent = free ? '★' : cols[c][r];
    if (free) el.className = 'free marked';
    el.addEventListener('click', () => toggle(el));
    cardEl.appendChild(el); cells.push(el);
  }
}

function toggle(el) {
  if (!playing || el.classList.contains('free')) return;
  if (!called.has(Number(el.dataset.n))) { RC.toast('info', 'Ese número todavía no ha salido.'); return; }
  el.classList.toggle('marked');
}

const hasLine = () => LINES.some(l => l.every(i => cells[i].classList.contains('marked')));
const isFull = () => cells.every(c => c.classList.contains('marked'));

document.querySelectorAll('.rc-chip-btn[data-add]').forEach(btn =>
  btn.addEventListener('click', () => { betInput.value = Number(betInput.value || 0) + Number(btn.dataset.add); }));

buyBtn.addEventListener('click', () => {
  const b = Math.max(10, Math.floor(Number(betInput.value) || 0));
  if (b > RC.getUser().coins) { RC.toast('lose', 'No tienes monedas suficientes.'); return; }
  bet = b; betInput.value = b;
  RC.addCoins(-bet);
  called = new Set(); pool = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
  calledEl.innerHTML = ''; ballEl.textContent = '—';
  buildCard();
  playing = true;
  buyBtn.disabled = true; drawBtn.disabled = false; bingoBtn.disabled = false;
  betRow.style.opacity = '.5';
  msgEl.textContent = `Cartón comprado. Tienes ${MAX_DRAWS} bolas: marca los números que salgan.`;
});

drawBtn.addEventListener('click', () => {
  if (!playing || called.size >= MAX_DRAWS) return;
  const n = pool.pop();
  called.add(n);
  ballEl.textContent = n; ballEl.classList.remove('pop'); void ballEl.offsetWidth; ballEl.classList.add('pop');
  const s = document.createElement('span'); s.textContent = n; calledEl.appendChild(s);
  msgEl.textContent = `Bola ${called.size} de ${MAX_DRAWS}. Quedan ${MAX_DRAWS - called.size}.`;
  if (called.size >= MAX_DRAWS) {
    drawBtn.disabled = true;
    if (hasLine()) msgEl.textContent = '¡Se acabaron las bolas y tienes línea! Pulsa BINGO.';
    else finish(false, 0, 'Se acabaron las bolas sin línea. Pierdes tu cartón.');
  }
});

bingoBtn.addEventListener('click', () => {
  if (!playing) return;
  if (isFull()) return finish(true, FULL_PRIZE, `¡CARTÓN LLENO! Ganas ×${FULL_PRIZE}.`);
  if (hasLine()) return finish(true, LINE_PRIZE, `¡BINGO! Línea completa. Ganas ×${LINE_PRIZE}.`);
  RC.toast('lose', 'Todavía no tienes una línea completa.');
});

function finish(won, mult, text) {
  playing = false;
  const payout = won ? bet * mult : 0;
  if (payout > 0) RC.addCoins(payout);
  msgEl.textContent = won ? `${text} +${RC.formatNumber(payout)} monedas.` : text;
  RC.toast(won ? 'win' : 'lose', msgEl.textContent);
  RC.registerGameResult('Bingo', won, bet, payout);
  buyBtn.disabled = false; drawBtn.disabled = true; bingoBtn.disabled = true;
  betRow.style.opacity = '1';
}

buildCard();
