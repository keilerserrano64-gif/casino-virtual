// bonificasiones.js — lógica de bonificasiones.html (usa RC de app.js)
RC.initHeader();

const $ = id => document.getElementById(id);
const claimBonusBtn = $('claimBonusBtn'), bonusDesc = $('bonusDesc'), streakNum = $('streakNum');
const missionText = $('missionText'), missionBar = $('missionBar'), claimMissionBtn = $('claimMissionBtn');

// "ayer" se calcula con la misma fecha LOCAL que RC.todayKey()
function prevKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
const nextStreakOf = (user, today) => (user.lastDailyBonus === prevKey(today) ? (user.streak || 0) + 1 : 1);
const rewardFor = streak => 300 + Math.min(streak, 10) * 100; // tope: 1.300

/* ---- Cofres virtuales (uno cada 5 partidas) ---- */
function renderChests() {
  const u = RC.getUser();
  const grid = $('chestGrid');
  if (u.chests > 0) {
    grid.innerHTML = Array.from({ length: Math.min(u.chests, 6) }, () =>
      '<div class="rc-panel bonus-card chest"><div class="big">📦</div><h3>Cofre virtual</h3><p class="desc">Toca para abrir</p></div>').join('');
    grid.querySelectorAll('.chest').forEach(c => c.addEventListener('click', openChest));
  } else {
    const left = 5 - (u.gamesPlayed % 5);
    grid.innerHTML = `<div class="rc-panel bonus-card chest locked"><div class="big">🔒</div><h3>Sin cofres</h3><p class="desc">Juega ${left} partida${left > 1 ? 's' : ''} más para ganar uno.</p></div>`;
  }
}

function openChest() {
  const u = RC.getUser();
  if (u.chests < 1) return;
  u.chests -= 1; u.chestsOpened += 1;
  RC.saveUser(u);
  const roll = Math.random();
  let text;
  if (roll < 0.6) { const c = 100 + Math.floor(Math.random() * 9) * 100; RC.addCoins(c, 'Cofre virtual', 'recompensa'); text = `¡El cofre tenía ${RC.formatNumber(c)} monedas!`; }
  else if (roll < 0.95) { const x = 50 + Math.floor(Math.random() * 4) * 50; RC.addXP(x); text = `¡El cofre tenía ${x} XP!`; }
  else { RC.addCoins(2500, 'Cofre virtual (premio gordo)', 'recompensa'); text = '¡PREMIO GORDO! 2.500 monedas.'; }
  $('chestMsg').textContent = text;
  RC.toast('win', text);
  RC.notify(text, '📦');
  RC.checkAchievements();
  renderChests();
  syncAchievementsUI();
}

/* ---- Eventos y recompensas por nivel ---- */
function renderEvents() {
  const events = [
    { icon: '⚡', name: 'Fin de semana XP x2', desc: 'Doble XP los sábados y domingos.', live: RC.isWeekend() },
    { icon: '🔥', name: 'Racha diaria', desc: 'Reclama tu bono cada día para subir la racha.', live: true },
    { icon: '📦', name: 'Cofres virtuales', desc: 'Un cofre cada 5 partidas jugadas.', live: true },
    { icon: '🎱', name: 'Estreno: Bingo', desc: 'Prueba el nuevo juego de Bingo.', live: true },
  ];
  $('eventList').innerHTML = events.map(e =>
    `<li><span class="ic">${e.icon}</span><span><strong>${e.name}</strong><br><small>${e.desc}</small></span>
     <time>${e.live ? '<span class="badge-live">Activo</span>' : 'No activo hoy'}</time></li>`).join('');
}

function renderLevelRewards() {
  const u = RC.getUser();
  $('levelRewardGrid').innerHTML = Array.from({ length: 10 }, (_, i) => i + 2).map(lv =>
    `<div class="achv ${u.level >= lv ? 'unlocked' : 'locked'}"><span class="ic">🏅</span>Nivel ${lv}<small>+${RC.formatNumber(RC.levelReward(lv))} monedas</small></div>`).join('');
}

/* ---- Logros (los desbloquea RC automáticamente) ---- */
function syncAchievementsUI() {
  const user = RC.checkAchievements();
  $('achvGrid').innerHTML = RC.ACHIEVEMENTS.map(a =>
    `<div class="achv ${user.achievements.includes(a.name) ? 'unlocked' : 'locked'}"><span class="ic">${a.icon}</span>${RC.esc(a.name)}</div>`).join('');
}

function refreshBonusUI() {
  const user = RC.getUser();
  const today = RC.todayKey();
  streakNum.textContent = user.streak || 0;

  if (user.lastDailyBonus === today) {
    claimBonusBtn.disabled = true;
    bonusDesc.textContent = 'Ya reclamaste tu bono de hoy. Vuelve mañana.';
    claimBonusBtn.textContent = 'Reclamado ✓';
  } else {
    const next = nextStreakOf(user, today);
    const reward = rewardFor(next);
    claimBonusBtn.disabled = false;
    claimBonusBtn.textContent = `Reclamar +${RC.formatNumber(reward)}`;
    bonusDesc.textContent = `Racha día ${next}: gana ${RC.formatNumber(reward)} monedas.`;
  }

  if (user.missionDate === today) {
    const count = Math.min(user.missionCount || 0, 3);
    missionText.textContent = `${count}/3`;
    missionBar.style.width = (count / 3 * 100) + '%';
    claimMissionBtn.disabled = !(count >= 3 && !user.missionClaimed);
    claimMissionBtn.textContent = user.missionClaimed ? 'Recompensa reclamada ✓' : 'Reclamar recompensa';
  } else {
    missionText.textContent = '0/3';
    missionBar.style.width = '0%';
    claimMissionBtn.disabled = true;
    claimMissionBtn.textContent = 'Reclamar recompensa';
  }

  syncAchievementsUI();
  renderLevelRewards();
}

claimBonusBtn.addEventListener('click', () => {
  const user = RC.getUser();
  const today = RC.todayKey();
  if (user.lastDailyBonus === today) return;
  const next = nextStreakOf(user, today);
  const reward = rewardFor(next);
  user.streak = next;
  user.lastDailyBonus = today;
  RC.saveUser(user);
  RC.addCoins(reward, `Bono diario (racha ${next})`, 'bono');
  RC.addXP(50);
  RC.toast('win', `Bono diario reclamado: +${RC.formatNumber(reward)} monedas`);
  RC.notify(`Has recibido tu bono diario: +${RC.formatNumber(reward)} monedas.`, '🎁');
  RC.checkAchievements();
  refreshBonusUI();
});

claimMissionBtn.addEventListener('click', () => {
  const user = RC.getUser();
  if (user.missionDate !== RC.todayKey() || (user.missionCount || 0) < 3 || user.missionClaimed) return;
  user.missionClaimed = true;
  RC.saveUser(user);
  RC.addCoins(500, 'Misión diaria completada', 'recompensa');
  RC.addXP(100);
  RC.toast('win', 'Misión completada: +500 monedas, +100 XP');
  RC.notify('Misión del día completada: +500 monedas y +100 XP.', '🎯');
  refreshBonusUI();
});

renderEvents();
renderChests();
refreshBonusUI();
