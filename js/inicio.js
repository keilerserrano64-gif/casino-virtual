// inicio.js — lógica de inicio.html (usa RC de app.js)
RC.initHeader();

const u = RC.getUser();
const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
set('st-coins', RC.formatNumber(u.coins));
set('st-level', u.level);
set('st-wins', u.wins);
set('st-games', u.gamesPlayed);

/* Estadísticas generales del casino */
const g = RC.globalStats();
set('g-users', RC.formatNumber(g.users));
set('g-games', RC.formatNumber(g.games));
set('g-online', RC.formatNumber(Math.max(g.online, 1)));
set('g-prizes', RC.formatNumber(g.prizes));

/* Juegos populares: los 3 más jugados (solo los activos) */
const box = document.getElementById('popularGames');
if (box) {
  const top = Object.entries(g.counts).filter(([n]) => RC.GAME_INFO[n] && RC.isGameEnabled(n))
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  box.innerHTML = '<div class="rc-game-grid">' + top.map(([n, c]) => {
    const i = RC.GAME_INFO[n];
    return `<a class="rc-game-card" href="${i.href}"><span class="icon">${i.icon}</span><span class="name">${n}</span><span class="desc">${RC.formatNumber(c)} partidas · ${i.desc}</span></a>`;
  }).join('') + '</div>';
}
