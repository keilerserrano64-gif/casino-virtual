// escena.js — crea las siluetas de jugadores, pantallas y brillos sobre la foto del casino (css/escena.css)
(() => {
  const stage = document.getElementById('escenaStage'); if (!stage) return;
  const $$ = (cls, style, html = '') => { const d = document.createElement('div'); d.className = cls; d.style.cssText = style; d.innerHTML = html; stage.appendChild(d); return d; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COLS = ['#ff2bd6', '#2bd4ff', '#ffd34d', '#ff6a3d', '#7a5cff'];

  // luces de neón
  ['sign', 'ring1', 'ring2', 'ring3'].forEach(c => $$('glow ' + c, ''));

  // pantallas de tragamonedas (bancos de la foto)
  const banks = [[0.5, 19, 39.6], [21, 31, 40.6], [46.5, 96, 40.4]];
  banks.forEach(([x0, x1, y]) => { for (let x = x0; x < x1; x += 3.15) {
    $$('scr', `left:${x.toFixed(1)}%;top:${(y + rnd(-.4, .4)).toFixed(1)}%;background:${COLS[Math.floor(Math.random() * COLS.length)]};animation-delay:${rnd(0, 1.4).toFixed(2)}s;animation-duration:${rnd(.9, 2).toFixed(2)}s`);
  } });

  // ruleta y brillos de fichas / vasos
  $$('wheel', '');
  [[38, 69], [46, 70], [56, 71], [63, 72], [73, 75], [30, 66]].forEach(([x, y], i) => $$('glint', `left:${x}%;top:${y}%;animation-delay:${(i * .55).toFixed(2)}s`));

  // polvo de luz
  for (let i = 0; i < 26; i++) $$('spk', `left:${rnd(2, 98).toFixed(1)}%;top:${rnd(30, 95).toFixed(1)}%;animation-delay:${rnd(0, 9).toFixed(1)}s;animation-duration:${rnd(6, 12).toFixed(1)}s`);

  // jugador de espaldas: cabeza, hombros y dos brazos (la animación mueve cabeza y brazos)
  const SVG = `<svg viewBox="0 0 60 80" aria-hidden="true"><rect class="sh arm l" x="2" y="36" width="10" height="34" rx="5"/><rect class="sh arm r" x="48" y="36" width="10" height="34" rx="5"/><path class="sh" d="M6 80C6 52 14 35 30 33c16 2 24 19 24 47z"/><g class="head"><rect class="sh" x="26" y="22" width="8" height="14" rx="3"/><ellipse class="sh" cx="30" cy="14" rx="10.5" ry="12"/></g></svg>`;
  // x, y (arriba de la cabeza), ancho, tipo — colocados sobre las sillas y taburetes de la foto
  const PEOPLE = [
    [4, 47, 5.2, 'slot'], [14, 46.5, 4.8, 'slot'], [25, 47.5, 4.4, 'slot'], [35, 46.2, 4, 'mesa'],
    [48, 45.6, 3.6, 'mesa'], [60, 48.4, 5.6, 'mesa'], [68, 49.6, 6.2, 'mesa'], [77, 44.6, 3.6, 'slot'],
    [84, 44.4, 3.4, 'slot'], [92, 50.6, 7, 'slot'], [56, 43.8, 3, 'slot'], [41, 44.8, 3.2, 'slot'],
  ];
  const people = PEOPLE.map(([x, y, w, t], i) => {
    const p = $$('ply ' + t, `left:${x}%;top:${y}%;width:${w}%;--rim:${COLS[i % COLS.length]};animation-delay:${rnd(-5, 0).toFixed(1)}s`, SVG);
    p.querySelector('.head').style.animationDelay = rnd(-4, 0).toFixed(1) + 's';
    p.querySelectorAll('.arm.r').forEach(a => { a.style.animationDelay = rnd(-4, 0).toFixed(1) + 's'; });
    return p;
  });

  // de vez en cuando alguien gana: salta, levanta los brazos y salen monedas
  function win() {
    const p = people[Math.floor(Math.random() * people.length)];
    if (p.classList.contains('win')) return;
    p.classList.add('win');
    const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
    for (let i = 0; i < 9; i++) {
      const c = $$('coin', `left:${x}%;top:${y}%;--dx:${rnd(-6, 6).toFixed(1)}vw;--dy:${rnd(-9, -3).toFixed(1)}vh;animation-delay:${(i * .07).toFixed(2)}s`);
      setTimeout(() => c.remove(), 2400);
    }
    setTimeout(() => p.classList.remove('win'), 1900);
  }
  const loop = () => { win(); setTimeout(loop, rnd(3200, 6500)); };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(loop, 2000);
})();
