// estadisticas.js — lógica de estadisticas.html (usa RC de app.js)
RC.initHeader();

const u = RC.getUser();
const set = (id, v) => { document.getElementById(id).textContent = v; };
const counts = Object.entries(u.gameCounts).sort((a, b) => b[1] - a[1]);
const net = u.coinsWon - u.coinsLost;

set('sGames', u.gamesPlayed);
set('sWins', u.wins);
set('sLosses', u.losses);
set('sFav', counts.length ? counts[0][0] : '—');
set('sStreak', u.bestWinStreak || 0);
set('sXp', RC.formatNumber(RC.totalXp(u.level, u.xp)));
set('sNet', RC.signed(net));
document.getElementById('sNet').style.color = net >= 0 ? '#7fd39a' : '#f0a0a8';

RC.barChart(document.getElementById('chartGames'), counts.map(([label, value]) => ({ label, value })));
RC.barChart(document.getElementById('chartResults'), u.gamesPlayed ? [
  { label: 'Victorias', value: u.wins, cls: 'win' },
  { label: 'Derrotas', value: u.losses, cls: 'lose' },
] : []);
