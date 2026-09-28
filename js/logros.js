// logros.js — lógica de logros.html (usa RC de app.js)
RC.initHeader();

const u = RC.checkAchievements();

document.getElementById('achvCount').textContent = `${u.achievements.length} de ${RC.ACHIEVEMENTS.length} desbloqueados`;
document.getElementById('achvGrid').innerHTML = RC.ACHIEVEMENTS.map(a => {
  const on = u.achievements.includes(a.name);
  return `<div class="achv ${on ? 'unlocked' : 'locked'}"><span class="ic">${a.icon}</span>${RC.esc(a.name)}</div>`;
}).join('');

// Recompensas por nivel: se entregan solas al subir de nivel
const rows = [];
for (let lv = 2; lv <= 20; lv++) {
  const info = RC.levelInfo(lv);
  rows.push(`<tr><td>${lv}</td><td>${info.icon} ${info.name}</td><td>+${RC.formatNumber(RC.levelReward(lv))} monedas</td>
    <td><span class="rc-badge ${u.level >= lv ? 'win' : 'closed'}">${u.level >= lv ? 'Recibida' : 'Bloqueada'}</span></td></tr>`);
}
document.getElementById('levelRewards').innerHTML = rows.join('');
