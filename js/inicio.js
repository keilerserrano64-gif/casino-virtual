// inicio.js — lógica de inicio.html (usa RC de app.js)
RC.initHeader();
const u = RC.getUser();
document.getElementById('st-coins').textContent = RC.formatNumber(u.coins);
document.getElementById('st-level').textContent = u.level;
document.getElementById('st-wins').textContent = u.wins;
document.getElementById('st-games').textContent = u.gamesPlayed;