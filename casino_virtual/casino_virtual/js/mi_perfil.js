// mi_perfil.js — lógica de mi_perfil.html (usa RC de app.js)

RC.initHeader();

function render() {
  const u = RC.getUser();
  const info = RC.levelInfo(u.level);
  document.getElementById('pName').textContent = u.name || 'Jugador';
  document.getElementById('pTitle').textContent = `${info.icon} ${info.name}`;
  document.getElementById('pLevel').textContent = u.level;
  document.getElementById('pXpText').textContent = `${u.xp} / ${RC.xpForLevel(u.level)} XP`;
  document.getElementById('pXpBar').style.width = Math.min(100, (u.xp / RC.xpForLevel(u.level)) * 100) + '%';
  document.getElementById('pCoins').textContent = RC.formatNumber(u.coins);
  document.getElementById('pWins').textContent = u.wins;
  document.getElementById('pLosses').textContent = u.losses;
  document.getElementById('pGames').textContent = u.gamesPlayed;
  document.getElementById('pWinRate').textContent = u.gamesPlayed ? Math.round((u.wins / u.gamesPlayed) * 100) + '%' : '0%';
  document.getElementById('pStreak').textContent = u.streak || 0;
  document.getElementById('nameInput').value = u.name || '';
}

document.getElementById('saveNameBtn').addEventListener('click', () => {
  const val = document.getElementById('nameInput').value.trim();
  if (!val) return;
  const u = RC.getUser();
  u.name = val;
  RC.saveUser(u);
  RC.toast('info', 'Nombre actualizado');
  render();
});

render();