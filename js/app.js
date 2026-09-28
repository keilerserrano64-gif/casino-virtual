/* ============================================================
   ROYAL CASINO — núcleo compartido
   Maneja usuario, monedas virtuales, XP, nivel, navegación,
   historial y misiones. Todo persiste en localStorage.
   IMPORTANTE: monedas 100% ficticias, sin dinero real.
   ============================================================ */

const RC = (() => {

  const USER_KEY = 'royalCasinoUser';
  const HISTORY_KEY = 'royalCasinoHistory';
  const START_COINS = 10000;

  const NAV_ITEMS = [
    { href: 'inicio.html', label: 'Inicio' },
    { href: 'tragamonedas.html', label: 'Tragamonedas' },
    { href: 'ruleta.html', label: 'Ruleta' },
    { href: 'Blackjack.html', label: 'Blackjack' },
    { href: 'poker.html', label: 'Poker' },
    { href: 'dados.html', label: 'Dados' },
    { href: 'carreras.html', label: 'Carreras' },
    { href: 'torneos.html', label: 'Torneos' },
    { href: 'bonificasiones.html', label: 'Bonificaciones' },
    { href: 'mi_perfil.html', label: 'Mi perfil' },
    { href: 'historial.html', label: 'Historial' },
  ];

  const LEVEL_TITLES = [
    { min: 1, max: 4, name: 'Principiante', icon: '🥉' },
    { min: 5, max: 9, name: 'Jugador', icon: '🥈' },
    { min: 10, max: 14, name: 'Experto', icon: '🥇' },
    { min: 15, max: 19, name: 'Maestro', icon: '💎' },
    { min: 20, max: Infinity, name: 'Leyenda', icon: '👑' },
  ];

  function defaultUser() {
    return {
      name: 'Jugador',
      coins: START_COINS,
      xp: 0,
      level: 1,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      streak: 0,
      lastDailyBonus: null,   // fecha ISO (solo día) del último bono reclamado
      missionDate: null,      // fecha ISO del día en curso para la misión
      missionCount: 0,        // partidas jugadas hoy para la misión
      missionClaimed: false,
    };
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) {
        const u = defaultUser();
        saveUser(u);
        return u;
      }
      return { ...defaultUser(), ...JSON.parse(raw) };
    } catch (e) {
      return defaultUser();
    }
  }

  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    refreshHeaderDisplay(user);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function xpForLevel(level) {
    return level * 500;
  }

  function levelInfo(level) {
    return LEVEL_TITLES.find(t => level >= t.min && level <= t.max) || LEVEL_TITLES[0];
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString('es-ES');
  }

  /* ---------- Monedas y XP ---------- */

  function addCoins(amount) {
    const user = getUser();
    user.coins = Math.max(0, user.coins + amount);
    saveUser(user);
    return user;
  }

  function canBet(amount) {
    return getUser().coins >= amount;
  }

  function addXP(amount) {
    const user = getUser();
    user.xp += amount;
    let leveled = false;
    while (user.xp >= xpForLevel(user.level)) {
      user.xp -= xpForLevel(user.level);
      user.level += 1;
      leveled = true;
    }
    saveUser(user);
    if (leveled) {
      const info = levelInfo(user.level);
      toast('info', `¡Subiste a nivel ${user.level}! ${info.icon} ${info.name}`);
    }
    return user;
  }

  function registerGameResult(game, won, wager, payout) {
    const user = getUser();
    user.gamesPlayed += 1;
    if (won) { user.wins += 1; } else { user.losses += 1; }
    registerMissionPlay(user);
    saveUser(user);
    addXP(won ? 25 : 8);
    logHistory(game, won, wager, payout);
  }

  function registerMissionPlay(user) {
    const tk = todayKey();
    if (user.missionDate !== tk) {
      user.missionDate = tk;
      user.missionCount = 0;
      user.missionClaimed = false;
    }
    user.missionCount += 1;
  }

  /* ---------- Historial ---------- */

  function logHistory(game, won, wager, payout) {
    const list = getHistory();
    list.unshift({
      date: new Date().toISOString(),
      game,
      result: won ? 'win' : 'lose',
      wager,
      payout,
      balance: getUser().coins,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 200)));
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  /* ---------- Header / nav ---------- */

  function pageFile() {
    return location.pathname.split('/').pop() || 'inicio.html';
  }

  function initHeader(rootId) {
    const root = document.getElementById(rootId || 'rc-header-root');
    if (!root) return;
    const user = getUser();
    const info = levelInfo(user.level);
    const current = pageFile();

    root.innerHTML = `
      <header class="rc-header">
        <a class="rc-brand" href="inicio.html">
          <span class="crown">👑</span> ROYAL CASINO
        </a>
        <div class="rc-user">
          <span class="rc-level-pill">${info.icon} Nv. ${user.level}</span>
          <span class="rc-coins">💰 <span id="rc-coin-display">${formatNumber(user.coins)}</span></span>
          <a class="rc-avatar-link" href="mi_perfil.html" title="Mi perfil">👤</a>
        </div>
      </header>
      <nav class="rc-nav">
        ${NAV_ITEMS.map(item => `<a href="${item.href}" class="${item.href === current ? 'active' : ''}">${item.label}</a>`).join('')}
      </nav>
      <div class="rc-toast-wrap" id="rc-toast-wrap"></div>
    `;
  }

  function refreshHeaderDisplay(user) {
    const el = document.getElementById('rc-coin-display');
    if (el) el.textContent = formatNumber(user.coins);
    const pill = document.querySelector('.rc-level-pill');
    if (pill) {
      const info = levelInfo(user.level);
      pill.textContent = `${info.icon} Nv. ${user.level}`;
    }
  }

  /* ---------- Toast ---------- */

  function toast(type, message) {
    const wrap = document.getElementById('rc-toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `rc-toast ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  return {
    getUser, saveUser, addCoins, canBet, addXP, registerGameResult,
    getHistory, logHistory, initHeader, toast, formatNumber,
    levelInfo, xpForLevel, todayKey, START_COINS,
  };
})();