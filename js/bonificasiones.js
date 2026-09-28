// bonificasiones.js — lógica de bonificasiones.html (usa RC de app.js)

RC.initHeader();

const claimBonusBtn = document.getElementById('claimBonusBtn');
const bonusDesc = document.getElementById('bonusDesc');
const streakNum = document.getElementById('streakNum');
const missionText = document.getElementById('missionText');
const missionBar = document.getElementById('missionBar');
const claimMissionBtn = document.getElementById('claimMissionBtn');

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
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
    const nextStreak = user.lastDailyBonus === yesterdayKey() ? (user.streak || 0) + 1 : 1;
    const reward = 300 + nextStreak * 100;
    claimBonusBtn.disabled = false;
    claimBonusBtn.textContent = `Reclamar +${RC.formatNumber(reward)}`;
    bonusDesc.textContent = `Racha día ${nextStreak}: gana ${RC.formatNumber(reward)} monedas.`;
  }

  if (user.missionDate === today) {
    const count = Math.min(user.missionCount, 3);
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

  renderAchievements(user);
}

claimBonusBtn.addEventListener('click', () => {
  const user = RC.getUser();
  const today = RC.todayKey();
  if (user.lastDailyBonus === today) return;
  const nextStreak = user.lastDailyBonus === yesterdayKey() ? (user.streak || 0) + 1 : 1;
  const reward = 300 + nextStreak * 100;
  user.streak = nextStreak;
  user.lastDailyBonus = today;
  RC.saveUser(user);
  RC.addCoins(reward);
  RC.addXP(50);
  RC.toast('win', `Bono diario reclamado: +${RC.formatNumber(reward)} monedas`);
  refreshBonusUI();
});

claimMissionBtn.addEventListener('click', () => {
  const user = RC.getUser();
  const today = RC.todayKey();
  if (user.missionDate !== today || user.missionCount < 3 || user.missionClaimed) return;
  user.missionClaimed = true;
  RC.saveUser(user);
  RC.addCoins(500);
  RC.addXP(100);
  RC.toast('win', 'Misión completada: +500 monedas, +100 XP');
  refreshBonusUI();
});

const ACHIEVEMENTS = [
  { icon: '🎮', name: '10 partidas', test: u => u.gamesPlayed >= 10 },
  { icon: '🏅', name: '10 victorias', test: u => u.wins >= 10 },
  { icon: '💰', name: '20.000 monedas', test: u => u.coins >= 20000 },
  { icon: '🥈', name: 'Nivel 5', test: u => u.level >= 5 },
  { icon: '🥇', name: 'Nivel 10', test: u => u.level >= 10 },
  { icon: '🔥', name: 'Racha de 3 días', test: u => (u.streak || 0) >= 3 },
];

function renderAchievements(user) {
  const grid = document.getElementById('achvGrid');
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.test(user);
    return `<div class="achv ${unlocked ? '' : 'locked'}"><span class="ic">${a.icon}</span>${a.name}</div>`;
  }).join('');
}

refreshBonusUI();