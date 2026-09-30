// lobby.js — página de juegos con buscador (usa RC de app.js)
RC.initHeader();
const $ = id => document.getElementById(id);
const on = n => RC.isGameEnabled(n);
const CLASSIC = [
  ['Tragamonedas', 'Slots', 'linear-gradient(160deg,#d6218a,#3a0a4a)', '3 carretes y multiplicadores'],
  ['Ruleta', 'Ruleta', 'linear-gradient(160deg,#c4162e,#3b0710)', 'Ruleta europea'],
  ['Blackjack', 'Blackjack', 'linear-gradient(160deg,#0f9d58,#053a20)', 'Pide o plántate'],
  ['Poker', 'Póker', 'linear-gradient(160deg,#2a64d6,#0a1a4a)', "Texas Hold'em"],
  ['Dados', 'Dados', 'linear-gradient(160deg,#f28c1a,#4a1f04)', 'Craps con mesa completa'],
  ['Carreras', 'Carreras', 'linear-gradient(160deg,#12b5b0,#053a3a)', 'Elige tu caballo'],
  ['Bingo', 'Bingo', 'linear-gradient(160deg,#8a3ff0,#25094f)', 'Completa líneas y gana'],
  ['Torneo', 'Torneos', 'linear-gradient(160deg,#e0b422,#4a3604)', 'Compite contra otros jugadores'],
].filter(c => c[0] === 'Torneo' || on(c[0]));
const norm = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const searchEl = $('gameSearch');

function render() {
  const q = norm(searchEl.value.trim());
  const hit = (...t) => !q || norm(t.join(' ')).includes(q);
  const big = CLASSIC.filter(([n, t, , d]) => hit(n, t, d));
  $('lbGrid').innerHTML = big.map(([n, t, bg, d]) => `<a class="lb-tile" href="${RC.GAME_INFO[n].href}" style="--bg:${bg}"><span class="ico">${RC.GAME_INFO[n].icon}</span><b>${t}</b><span>${d}</span><span class="go">JUGAR</span></a>`).join('');
  $('lbEmpty').hidden = big.length > 0;
}
searchEl.addEventListener('input', render);
render();
searchEl.focus({ preventScroll: true });
