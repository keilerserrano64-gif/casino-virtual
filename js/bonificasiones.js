// bonificasiones.js — lógica de bonificasiones.html (usa RC de app.js)
RC.initHeader();

const claimBonusBtn = document.getElementById('claimBonusBtn');
const bonusDesc = document.getElementById('bonusDesc');
const streakNum = document.getElementById('streakNum');
const missionText = document.getElementById('missionText');
const missionBar = document.getElementById('missionBar');
const claimMissionBtn = document.getElementById('claimMissionBtn');

// "ayer" se calcula a partir de RC.todayKey() para que ambos usen siempre el mismo formato/huso
function prevKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function nextStreakOf(user, today) {
  return user.lastDailyBonus === prevKey(today) ? (user.streak || 0) + 1 : 1;
}
const rewardFor = streak => 300 + Math.min(streak, 10) * 100; // tope: 1.300

const ACHIEVEMENTS = [
  { icon: '🎮', name: '10 partidas', test: u => u.gamesPlayed >= 10 },
  { icon: '🏅', name: '10 victorias', test: u => u.wins >= 10 },
  { icon: '💰', name: '20.000 monedas', test: u => u.coins >= 20000 },
  { icon: '🥈', name: 'Nivel 5', test: u => u.level >= 5 },
  { icon: '🥇', name: 'Nivel 10', test: u => u.level >= 10 },
  { icon: '🔥', name: 'Racha de 3 días', test: u => (u.streak || 0) >= 3 },
];

// Los logros se guardan: una vez desbloqueados no se vuelven a bloquear
function syncAchievements(user) {
  user.achievements = user.achievements || [];
  let changed = false;
  ACHIEVEMENTS.forEach(a => {
    if (!user.achievements.includes(a.name) && a.test(user)) {
      user.achievements.push(a.name);
      changed = true;
      RC.toast('win', `Logro desbloqueado: ${a.name}`);
    }
  });
  if (changed) RC.saveUser(user);
}

function renderAchievements(user) {
  document.getElementById('achvGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = user.achievements.includes(a.name);
    return `<div class="achv ${unlocked ? 'unlocked' : 'locked'}"><span class="ic">${a.icon}</span>${a.name}</div>`;
  }).join('');
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

  syncAchievements(user);
  renderAchievements(user);
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
  RC.addCoins(reward);
  RC.addXP(50);
  RC.toast('win', `Bono diario reclamado: +${RC.formatNumber(reward)} monedas`);
  refreshBonusUI();
});

claimMissionBtn.addEventListener('click', () => {
  const user = RC.getUser();
  if (user.missionDate !== RC.todayKey() || (user.missionCount || 0) < 3 || user.missionClaimed) return;
  user.missionClaimed = true;
  RC.saveUser(user);
  RC.addCoins(500);
  RC.addXP(100);
  RC.toast('win', 'Misión completada: +500 monedas, +100 XP');
  refreshBonusUI();
});

refreshBonusUI();