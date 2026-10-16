// lobby.js — página de juegos: categorías, buscador y secciones (usa RC de app.js y RCCatalog de catalogo.js)
RC.initHeader();
const $ = id => document.getElementById(id);
const { CATS, list, tile } = RCCatalog;
const ALL = list();
const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const searchEl = $('gameSearch'), catsEl = $('lbCats');
const inCat = (g, c) => c === 'todos' || (c === 'populares' ? g.pop : g.cat === c);
let cat = CATS.some(c => c.id === location.hash.slice(1)) ? location.hash.slice(1) : 'todos';

$('lbCount').textContent = ALL.filter(g => g.key !== 'Torneo').length;
catsEl.innerHTML = CATS.map(c => `<button type="button" class="gt-cat" data-cat="${c.id}">${c.icon} ${c.label} <em>${ALL.filter(g => inCat(g, c.id)).length}</em></button>`).join('');

const section = (title, games, more) => `<section class="gt-sec"><div class="gt-sec-head"><h2>${title}</h2>${more ? `<button type="button" data-go="${more}">Ver todos →</button>` : ''}</div><div class="gt-grid">${games.map(tile).join('')}</div></section>`;

function render() {
  const q = norm(searchEl.value.trim());
  catsEl.querySelectorAll('.gt-cat').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat));
  let html = '', n = 0;
  if (q) {                                              // búsqueda: una sola cuadrícula con todo lo que coincide
    const hit = ALL.filter(g => inCat(g, cat) && norm([g.key, g.title, g.sub, g.cat].join(' ')).includes(q));
    n = hit.length; if (n) html = section(`Resultados para “${RC.esc(searchEl.value.trim())}”`, hit);
  } else if (cat === 'todos') {                         // vista general: una fila por categoría (cada juego aparece una sola vez)
    html = CATS.slice(2).map(c => { const g = ALL.filter(x => inCat(x, c.id)); n += g.length; return g.length ? section(c.label, g, c.id) : ''; }).join('');
  } else {
    const g = ALL.filter(x => inCat(x, cat)), c = CATS.find(x => x.id === cat);
    n = g.length; if (n) html = section(c.label, g);
  }
  $('lbGrid').innerHTML = html;
  $('lbEmpty').hidden = n > 0;
}
const setCat = c => { cat = c; history.replaceState(null, '', c === 'todos' ? location.pathname : '#' + c); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
catsEl.addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); });
$('lbGrid').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) setCat(b.dataset.go); });
searchEl.addEventListener('input', render);
render();
