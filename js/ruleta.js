// ruleta.js — lógica de ruleta.html (usa RC de app.js)

RC.initHeader();

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

/* ================= Dibujo de la ruleta (SVG) ================= */

// Orden real de una ruleta europea, en sentido horario empezando por el 0
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const STEP = 360 / WHEEL_ORDER.length;   // grados por casilla
const C = 500;                           // centro del viewBox (1000x1000)
const R_FRET = 392, R_POCKET_IN = 352, R_NUM_IN = 290, R_HUB = 122;
const R_BALL_POCKET = 372, R_BALL_TRACK = 430;

const pt = (r, deg) => {
  const a = deg * Math.PI / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
const f = n => n.toFixed(2);

// Sector anular entre los radios r1 (interior) y r2 (exterior)
function sector(r1, r2, a1, a2) {
  const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 0 0 ${f(x4)} ${f(y4)}Z`;
}

function buildWheelSVG() {
  let pockets = '', numbers = '', frets = '';
  WHEEL_ORDER.forEach((n, i) => {
    const a = i * STEP, col = colorOf(n);
    // casilla exterior (donde cae la bola) y anillo de números
    pockets += `<path class="pk ${col}" d="${sector(R_POCKET_IN, R_FRET, a - STEP / 2, a + STEP / 2)}"/>`;
    pockets += `<path class="pk ${col}" d="${sector(R_NUM_IN, R_POCKET_IN, a - STEP / 2, a + STEP / 2)}"/>`;
    const [tx, ty] = pt(321, a);
    numbers += `<text class="pn" x="${f(tx)}" y="${f(ty)}" transform="rotate(${f(a)} ${f(tx)} ${f(ty)})">${n}</text>`;
    const [x1, y1] = pt(R_NUM_IN, a - STEP / 2), [x2, y2] = pt(R_FRET, a - STEP / 2);
    frets += `<line class="fret" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  });

  // Radios del cono central
  let spokes = '';
  for (let k = 0; k < 8; k++) {
    spokes += `<path d="${sector(R_HUB, R_NUM_IN - 4, k * 45 - 5, k * 45 + 5)}" fill="rgba(230,207,122,.20)"/>`;
  }

  // Deflectores fijos de la pista de la bola
  let deflectors = '';
  for (let k = 0; k < 8; k++) {
    const y = C - R_BALL_TRACK;
    deflectors += `<g transform="rotate(${k * 45 + 22.5} ${C} ${C})"><polygon points="${C},${y - 18} ${C + 9},${y} ${C},${y + 18} ${C - 9},${y}" fill="url(#gGold)" stroke="#5a430b" stroke-width="1.5"/></g>`;
  }

  // Brazos de la torreta central
  let arms = '';
  for (let k = 0; k < 4; k++) {
    arms += `<g transform="rotate(${k * 90} ${C} ${C})"><rect x="${C - 7}" y="${C - 106}" width="14" height="106" rx="6" fill="url(#gGold)" stroke="#5a430b" stroke-width="1.5"/><circle cx="${C}" cy="${C - 106}" r="14" fill="url(#gGold)" stroke="#5a430b" stroke-width="1.5"/></g>`;
  }

  return `
<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <defs>
    <linearGradient id="gWood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a1f8a"/><stop offset=".35" stop-color="#1d1450"/>
      <stop offset=".65" stop-color="#0a0720"/><stop offset="1" stop-color="#3a1a70"/>
    </linearGradient>
    <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7e39b"/><stop offset=".5" stop-color="#c9a227"/><stop offset="1" stop-color="#7a5d10"/>
    </linearGradient>
    <radialGradient id="gTrack" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="462">
      <stop offset=".84" stop-color="#0a0807"/><stop offset=".90" stop-color="#2b231d"/>
      <stop offset=".96" stop-color="#15100d"/><stop offset="1" stop-color="#050403"/>
    </radialGradient>
    <radialGradient id="gPocket" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="${R_FRET}">
      <stop offset=".89" stop-color="rgba(0,0,0,.50)"/><stop offset=".94" stop-color="rgba(0,0,0,.05)"/>
      <stop offset="1" stop-color="rgba(0,0,0,.40)"/>
    </radialGradient>
    <radialGradient id="gCone" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="${R_NUM_IN}">
      <stop offset="0" stop-color="#1a0a3a"/><stop offset=".45" stop-color="#3a1a70"/>
      <stop offset=".8" stop-color="#5a2a9a"/><stop offset="1" stop-color="#1a0a3a"/>
    </radialGradient>
    <radialGradient id="gHubDark" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#2a1a60"/><stop offset="1" stop-color="#07050d"/>
    </radialGradient>
    <linearGradient id="gShine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,.20)"/><stop offset=".45" stop-color="rgba(255,255,255,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,.28)"/>
    </linearGradient>
    <radialGradient id="gBall" cx=".35" cy=".3" r=".75">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e8e8e8"/><stop offset="1" stop-color="#8f8f8f"/>
    </radialGradient>
  </defs>

  <!-- marco de madera y pista de la bola (fijos) -->
  <circle cx="${C}" cy="${C}" r="500" fill="url(#gWood)"/>
  <circle cx="${C}" cy="${C}" r="483" fill="none" stroke="url(#gGold)" stroke-width="6"/>
  <circle cx="${C}" cy="${C}" r="465" fill="none" stroke="url(#gGold)" stroke-width="7"/>
  <circle cx="${C}" cy="${C}" r="462" fill="url(#gTrack)"/>
  <circle cx="${C}" cy="${C}" r="${R_BALL_TRACK}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="2"/>
  ${deflectors}

  <!-- parte giratoria: casillas, números, cono y torreta -->
  <g id="rotor">
    <circle cx="${C}" cy="${C}" r="${R_FRET + 4}" fill="url(#gGold)"/>
    ${pockets}
    <circle cx="${C}" cy="${C}" r="${(R_FRET + R_POCKET_IN) / 2}" fill="none" stroke="url(#gPocket)" stroke-width="${R_FRET - R_POCKET_IN}"/>
    ${frets}
    <circle cx="${C}" cy="${C}" r="${R_POCKET_IN}" fill="none" stroke="url(#gGold)" stroke-width="5"/>
    ${numbers}
    <circle cx="${C}" cy="${C}" r="${R_NUM_IN}" fill="url(#gCone)" stroke="url(#gGold)" stroke-width="7"/>
    ${spokes}
    <circle cx="${C}" cy="${C}" r="225" fill="none" stroke="rgba(230,207,122,.38)" stroke-width="2"/>
    <circle cx="${C}" cy="${C}" r="175" fill="none" stroke="rgba(230,207,122,.30)" stroke-width="2"/>
    <circle cx="${C}" cy="${C}" r="${R_HUB}" fill="url(#gGold)" stroke="#5a430b" stroke-width="3"/>
    <circle cx="${C}" cy="${C}" r="${R_HUB - 18}" fill="url(#gHubDark)"/>
    ${arms}
    <circle cx="${C}" cy="${C}" r="40" fill="url(#gGold)" stroke="#5a430b" stroke-width="2"/>
    <circle cx="${C}" cy="${C}" r="16" fill="#fff6cc" opacity=".85"/>
    <path id="winHi" class="win-hi" d="" visibility="hidden"/>
  </g>

  <!-- brillo de cristal -->
  <circle cx="${C}" cy="${C}" r="500" fill="url(#gShine)" pointer-events="none"/>

  <!-- bola -->
  <circle id="ballShadow" r="16" fill="rgba(0,0,0,.45)"/>
  <circle id="ball" r="15" fill="url(#gBall)"/>
</svg>`;
}

const wheel = document.getElementById('wheel');
wheel.innerHTML = buildWheelSVG();
const rotor = wheel.querySelector('#rotor');
const ball = wheel.querySelector('#ball');
const ballShadow = wheel.querySelector('#ballShadow');
const winHi = wheel.querySelector('#winHi');

let wheelAngle = 0;                 // ángulo actual del rotor (grados, horario)
let ballPocketAngle = 0;            // ángulo de la casilla donde descansa la bola (dentro del rotor)

function placeBall(absAngle, radius) {
  const [x, y] = pt(radius, absAngle);
  ball.setAttribute('cx', f(x));
  ball.setAttribute('cy', f(y));
  ballShadow.setAttribute('cx', f(x + 3));
  ballShadow.setAttribute('cy', f(y + 5));
}
function setRotor(deg) {
  rotor.setAttribute('transform', `rotate(${f(deg)} ${C} ${C})`);
}

// estado inicial: la bola descansa en el 0
setRotor(0);
placeBall(0, R_BALL_POCKET);

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutQuad = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t * t * (3 - 2 * t);

function ballRadiusAt(t) {
  if (t < 0.05) return R_BALL_POCKET + (R_BALL_TRACK - R_BALL_POCKET) * easeInOut(t / 0.05); // sale a la pista
  if (t < 0.58) return R_BALL_TRACK;                                                        // gira por la pista
  if (t < 0.84) return R_BALL_TRACK + (R_BALL_POCKET - R_BALL_TRACK) * easeInOut((t - 0.58) / 0.26); // cae
  const q = (t - 0.84) / 0.16;                                                              // rebota en las casillas
  return R_BALL_POCKET + 12 * Math.pow(1 - q, 2) * Math.abs(Math.sin(q * Math.PI * 3));
}

// Anima el giro y la bola; termina exactamente dentro de la casilla del número `landing`
function spinTo(landing, done) {
  const idx = WHEEL_ORDER.indexOf(landing);
  const pocketAngle = idx * STEP;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = reduce ? 400 : 6500;

  winHi.setAttribute('visibility', 'hidden');

  const W0 = wheelAngle;
  const B0 = W0 + ballPocketAngle;
  const Wf = W0 + 1080 + Math.random() * 360;      // la rueda gira en sentido horario
  let Bf = Wf + pocketAngle;                       // la bola gira en sentido contrario
  while (Bf > B0 - 360 * 8) Bf -= 360;

  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / T);
    const w = W0 + (Wf - W0) * easeOutCubic(t);
    const b = B0 + (Bf - B0) * easeOutQuad(t);
    let jitter = 0;
    if (t > 0.84) { const q = (t - 0.84) / 0.16; jitter = 5 * Math.pow(1 - q, 2) * Math.sin(q * Math.PI * 4); }
    setRotor(w);
    placeBall(b + jitter, ballRadiusAt(t));
    if (t < 1) { requestAnimationFrame(frame); return; }

    wheelAngle = ((Wf % 360) + 360) % 360;
    ballPocketAngle = pocketAngle;
    setRotor(wheelAngle);
    placeBall(wheelAngle + pocketAngle, R_BALL_POCKET);
    winHi.setAttribute('d', sector(R_NUM_IN, R_FRET, pocketAngle - STEP / 2, pocketAngle + STEP / 2));
    winHi.setAttribute('visibility', 'visible');
    done();
  }
  requestAnimationFrame(frame);
}

/* ================= Apuestas y lógica de juego ================= */

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

const resultNumber = document.getElementById('resultNumber');
const spinBtn = document.getElementById('spinBtn');
const historyStrip = document.getElementById('historyStrip');
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

  spinTo(landing, () => {
    const c = colorOf(landing);
    resultNumber.textContent = landing;
    resultNumber.className = 'result-number ' + c;
    wheel.setAttribute('aria-label', `Ruleta europea. Salió el ${landing}, ${c === 'red' ? 'rojo' : c === 'black' ? 'negro' : 'verde'}.`);

    let won = false, mult = 0;
    if (currentMode === 'color' && c === currentValue) { won = true; mult = 2; }
    if (currentMode === 'parity') {
      const isEven = landing !== 0 && landing % 2 === 0;
      if ((currentValue === 'par' && isEven) || (currentValue === 'impar' && !isEven)) { won = true; mult = 2; }
    }
    if (currentMode === 'number' && selectedNumber === landing) { won = true; mult = 35; }

    const payout = won ? bet * mult : 0;
    if (payout > 0) RC.addCoins(payout);
    RC.result(won
      ? { type: mult >= 35 ? 'big' : 'win', title: mult >= 35 ? '¡PLENO!' : '¡GANASTE!', amount: payout, text: `Salió el ${landing}.` }
      : { type: 'lose', title: 'SIN PREMIO', amount: bet, text: `Salió el ${landing}.` });
    RC.registerGameResult('Ruleta', won, bet, payout);

    history.unshift(landing);
    history = history.slice(0, 10);
    historyStrip.innerHTML = history.map(n => `<span class="result-number ${colorOf(n)}" style="width:30px;height:30px;font-size:.74rem;">${n}</span>`).join('');

    spinBtn.disabled = false;
  });
});
