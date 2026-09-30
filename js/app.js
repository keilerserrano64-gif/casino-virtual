/* ============================================================
   ROYAL CASINO — núcleo compartido (versión multiusuario)
   Cuentas, sesión, monedas virtuales, XP, logros, notificaciones,
   billetera, ranking, noticias, soporte y ajustes.
   Todo persiste en localStorage. Monedas 100% ficticias.
   NOTA: sin servidor no hay seguridad real (los datos se pueden
   editar desde la consola); es una simulación para practicar.
   ============================================================ */

const RC = (() => {

  const K = { ACC: 'rc_accounts', SESSION: 'rc_session', NEWS: 'rc_news', TICKETS: 'rc_tickets', OFF: 'rc_disabled_games' };
  const START_COINS = 10000;
  const inAdmin = location.pathname.includes('/admin/');
  // Rutas absolutas calculadas desde la ubicación real de este archivo (js/app.js):
  // funcionan igual desde la raíz (index.html), html/ y html/admin/, en local o publicado en cualquier carpeta.
  const ROOT = (() => {
    try { return new URL('../', document.currentScript.src).href; }
    catch (e) { return inAdmin ? '../../' : (location.pathname.includes('/html/') ? '../' : ''); }
  })();
  const PAGES = ROOT + 'html/';          // carpeta de las páginas
  const HOME = ROOT + 'index.html';      // portada pública
  const BASE = PAGES;                    // alias histórico: prefijo para enlazar páginas de html/
  const GAMES = ['Tragamonedas', 'Ruleta', 'Blackjack', 'Poker', 'Dados', 'Carreras', 'Bingo'];

  const GAME_INFO = {
    Tragamonedas: { href: 'tragamonedas.html', icon: '🎰', desc: '3 carretes y multiplicadores.' },
    Ruleta: { href: 'ruleta.html', icon: '🎡', desc: 'Ruleta europea.' },
    Blackjack: { href: 'Blackjack.html', icon: '🃏', desc: 'Pide o plántate.' },
    Poker: { href: 'poker.html', icon: '♠️', desc: "Texas Hold'em simplificado." },
    Dados: { href: 'dados.html', icon: '🎲', desc: 'Craps con mesa completa.' },
    Carreras: { href: 'carreras.html', icon: '🏇', desc: 'Elige tu caballo.' },
    Bingo: { href: 'bingo.html', icon: '🎱', desc: 'Completa líneas y gana.' },
    Torneo: { href: 'torneos.html', icon: '🏆', desc: 'Compite contra otros jugadores.' },
  };

  const NAV_ITEMS = [
    { href: 'torneos.html', label: 'Torneos' }, { href: 'ranking.html', label: 'Ranking' }, { href: 'amigos.html', label: 'Amigos' },
    { href: 'billetera.html', label: 'Billetera' }, { href: 'bonificasiones.html', label: 'Bonificaciones' },
    { href: 'noticias.html', label: 'Noticias' }, { href: 'historial.html', label: 'Historial' },
  ];

  const LEVEL_TITLES = [
    { min: 1, max: 4, name: 'Principiante', icon: '🥉' }, { min: 5, max: 9, name: 'Jugador', icon: '🥈' },
    { min: 10, max: 14, name: 'Experto', icon: '🥇' }, { min: 15, max: 19, name: 'Maestro', icon: '💎' },
    { min: 20, max: Infinity, name: 'Leyenda', icon: '👑' },
  ];

  const ACHIEVEMENTS = [
    { icon: '🎮', name: '10 partidas', test: u => u.gamesPlayed >= 10 },
    { icon: '🎰', name: '50 partidas', test: u => u.gamesPlayed >= 50 },
    { icon: '🏅', name: '10 victorias', test: u => u.wins >= 10 },
    { icon: '💰', name: '20.000 monedas', test: u => u.coins >= 20000 },
    { icon: '🥈', name: 'Nivel 5', test: u => u.level >= 5 },
    { icon: '🥇', name: 'Nivel 10', test: u => u.level >= 10 },
    { icon: '💎', name: 'Nivel 15', test: u => u.level >= 15 },
    { icon: '🔥', name: 'Racha de 3 días', test: u => (u.streak || 0) >= 3 },
    { icon: '⚡', name: '5 victorias seguidas', test: u => (u.bestWinStreak || 0) >= 5 },
    { icon: '📦', name: 'Abre un cofre', test: u => (u.chestsOpened || 0) >= 1 },
  ];

  // Jugadores de ejemplo para que el ranking y las estadísticas no estén vacíos
  const DEMO = [
    { name: 'PlayerOne', level: 25, xp: 400, week: 5200, month: 14800, games: 1240, won: 88000 },
    { name: 'GamerX', level: 22, xp: 300, week: 4100, month: 12100, games: 980, won: 61000 },
    { name: 'LuckyLuna', level: 19, xp: 150, week: 3300, month: 9800, games: 760, won: 47000 },
    { name: 'DadoLoco', level: 16, xp: 420, week: 2500, month: 7400, games: 610, won: 33000 },
    { name: 'AsDePicas', level: 13, xp: 90, week: 1800, month: 5200, games: 450, won: 21000 },
    { name: 'Mariposa', level: 9, xp: 210, week: 900, month: 3100, games: 300, won: 12000 },
    { name: 'NovatoPro', level: 5, xp: 60, week: 400, month: 1500, games: 140, won: 5000 },
  ];
  const DEMO_COUNTS = { Tragamonedas: 420, Ruleta: 310, Blackjack: 380, Poker: 190, Dados: 150, Carreras: 120, Bingo: 60 };

  const DEFAULT_NEWS = [
    { id: 1, icon: '🎰', title: 'Nuevo juego disponible', text: 'Hemos agregado el Bingo virtual. ¡Pruébalo en la sección de juegos!', date: '2026-09-27' },
    { id: 2, icon: '🎁', title: 'Evento de fin de semana', text: 'Doble XP en todos los juegos durante el sábado y el domingo.', date: '2026-09-26' },
    { id: 3, icon: '🛠️', title: 'Actualización', text: 'Mejoras de rendimiento y nuevas estadísticas en tu perfil.', date: '2026-09-25' },
  ];

  /* ---------- Utilidades ---------- */

  const read = (key, fb) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fb; } catch (e) { return fb; } };
  const write = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatNumber = n => Math.round(n).toLocaleString('es-ES');
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + formatNumber(Math.abs(n));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => dateKey(new Date());          // fecha LOCAL (corrige el desfase UTC)
  const monthKey = () => todayKey().slice(0, 7);
  const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); };
  const isWeekend = () => [0, 6].includes(new Date().getDay());
  const fmtDate = iso => { const d = new Date(iso); return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
  const dk = (t, u) => `rc_${t}_${String(u).toLowerCase()}`;   // u=datos, h=historial, n=notificaciones, m=movimientos, s=ajustes, l=última vez visto

  function hash(s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const pw = p => hash('rc|' + p);

  /* ---------- Cuentas y sesión ---------- */

  const getAccounts = () => read(K.ACC, []);
  const saveAccounts = list => write(K.ACC, list);
  const findAccount = id => { const x = String(id || '').toLowerCase(); return getAccounts().find(a => a.username.toLowerCase() === x || a.email.toLowerCase() === x) || null; };

  function getSession() { return sessionStorage.getItem(K.SESSION) || localStorage.getItem(K.SESSION) || null; }
  function setSession(u, remember) { clearSession(); (remember ? localStorage : sessionStorage).setItem(K.SESSION, u); }
  function clearSession() { sessionStorage.removeItem(K.SESSION); localStorage.removeItem(K.SESSION); }
  const cu = () => { const s = getSession(); return s && findAccount(s) ? findAccount(s).username : null; };
  const isLoggedIn = () => !!cu();
  const isAdmin = () => { const a = cu() && findAccount(cu()); return !!a && a.role === 'admin'; };

  function register({ name, username, email, password }) {
    if (!name || name.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
    if (!/^[a-zA-Z0-9_]{3,18}$/.test(username || '')) return { ok: false, error: 'El usuario debe tener 3-18 caracteres (letras, números o _).' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return { ok: false, error: 'Correo no válido.' };
    if (!password || password.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    if (findAccount(username)) return { ok: false, error: 'Ese usuario ya existe.' };
    if (findAccount(email)) return { ok: false, error: 'Ese correo ya está registrado.' };
    const list = getAccounts();
    list.push({ username, name, email, hash: pw(password), role: 'user', banned: false, created: new Date().toISOString() });
    saveAccounts(list);
    write(dk('u', username), { ...defaultUser(), name });
    notify('Bienvenido a Royal Casino. Recibiste ' + formatNumber(START_COINS) + ' monedas virtuales.', '🎁', username);
    return { ok: true, username };
  }

  function login(id, password, remember) {
    const a = findAccount(id);
    if (!a || a.hash !== pw(password || '')) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    if (a.banned) return { ok: false, error: 'Tu cuenta está bloqueada. Contacta con soporte.' };
    setSession(a.username, remember);
    return { ok: true };
  }

  function logout() { clearSession(); location.href = PAGES + 'login.html'; }

  function recover(email, newPass) {
    const list = getAccounts(); const a = list.find(x => x.email.toLowerCase() === String(email).toLowerCase());
    if (!a) return { ok: false, error: 'No existe ninguna cuenta con ese correo.' };
    if (!newPass || newPass.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    a.hash = pw(newPass); saveAccounts(list);
    return { ok: true };
  }

  function updateAccount({ newUser, oldPass, newPass }) {
    const list = getAccounts(); const me = list.find(a => a.username === cu());
    if (!me || me.hash !== pw(oldPass || '')) return { ok: false, error: 'La contraseña actual no es correcta.' };
    if (newPass && newPass.length < 6) return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    if (newUser && newUser !== me.username) {
      if (!/^[a-zA-Z0-9_]{3,18}$/.test(newUser)) return { ok: false, error: 'Usuario no válido (3-18 caracteres: letras, números o _).' };
      if (findAccount(newUser)) return { ok: false, error: 'Ese usuario ya existe.' };
      ['u', 'h', 'n', 'm', 's', 'l', 'p', 'f'].forEach(t => { const v = localStorage.getItem(dk(t, me.username)); if (v !== null) localStorage.setItem(dk(t, newUser), v); localStorage.removeItem(dk(t, me.username)); });
      const tk = getTickets(); tk.forEach(t => { if (t.user === me.username) t.user = newUser; }); write(K.TICKETS, tk);
      const remember = !!localStorage.getItem(K.SESSION);
      me.username = newUser; setSession(newUser, remember);
    }
    if (newPass) me.hash = pw(newPass);
    saveAccounts(list);
    return { ok: true };
  }

  function setBanned(username, banned) { const l = getAccounts(); const a = l.find(x => x.username === username); if (a && a.role !== 'admin') { a.banned = banned; saveAccounts(l); } }
  function deleteAccount(username) {
    const a = findAccount(username); if (!a || a.role === 'admin') return;
    saveAccounts(getAccounts().filter(x => x.username !== a.username));
    ['u', 'h', 'n', 'm', 's', 'l'].forEach(t => localStorage.removeItem(dk(t, a.username)));
  }

  /* ---------- Datos del jugador ---------- */

  function defaultUser() {
    return {
      name: 'Jugador', coins: START_COINS, xp: 0, level: 1, wins: 0, losses: 0, gamesPlayed: 0, streak: 0,
      lastDailyBonus: null, missionDate: null, missionCount: 0, missionClaimed: false,
      achievements: [], gameCounts: {}, coinsWon: 0, coinsLost: 0, winStreak: 0, bestWinStreak: 0,
      chests: 0, chestsOpened: 0, xpWeekKey: null, xpWeek: 0, xpMonthKey: null, xpMonth: 0,
    };
  }

  function getUser(u = cu()) {
    if (!u) return defaultUser();
    const raw = read(dk('u', u), null);
    if (!raw) { const d = defaultUser(); write(dk('u', u), d); return d; }
    return { ...defaultUser(), ...raw };
  }

  function saveUser(user, u = cu()) {
    if (!u) return;
    write(dk('u', u), user);
    if (u === cu()) refreshHeaderDisplay(user);
  }

  const xpForLevel = level => level * 500;
  const totalXp = (level, xp) => 500 * level * (level - 1) / 2 + xp;
  const levelReward = level => level * 100;
  const levelInfo = level => LEVEL_TITLES.find(t => level >= t.min && level <= t.max) || LEVEL_TITLES[0];
  const canBet = amount => getUser().coins >= amount;

  function logMove(concept, amount, type, balance, u = cu()) {
    if (!u) return;
    const l = read(dk('m', u), []);
    l.unshift({ date: new Date().toISOString(), concept, amount, type, balance: balance ?? getUser(u).coins });
    write(dk('m', u), l.slice(0, 200));
  }

  // concept opcional: si se indica, el movimiento aparece en la billetera (bonos, recompensas)
  function addCoins(amount, concept, type) {
    const user = getUser();
    user.coins = Math.max(0, user.coins + amount);
    saveUser(user);
    if (concept) logMove(concept, amount, type || 'bono', user.coins);
    return user;
  }

  function addXP(amount) {
    const user = getUser();
    amount = Math.round(amount * (isWeekend() ? 2 : 1));   // evento: fin de semana XP x2
    user.xp += amount;
    if (user.xpWeekKey !== weekKey()) { user.xpWeekKey = weekKey(); user.xpWeek = 0; }
    if (user.xpMonthKey !== monthKey()) { user.xpMonthKey = monthKey(); user.xpMonth = 0; }
    user.xpWeek += amount; user.xpMonth += amount;
    const ups = [];
    while (user.xp >= xpForLevel(user.level)) {
      user.xp -= xpForLevel(user.level); user.level += 1;
      const r = levelReward(user.level); user.coins += r; ups.push([user.level, r]);
    }
    saveUser(user);
    ups.forEach(([lv, r]) => {
      const info = levelInfo(lv);
      toast('info', `¡Subiste a nivel ${lv}! ${info.icon} ${info.name} (+${formatNumber(r)} monedas)`);
      notify(`Subiste al nivel ${lv}. Recompensa: ${formatNumber(r)} monedas.`, '⭐');
      logMove('Recompensa nivel ' + lv, r, 'recompensa', user.coins);
    });
    return user;
  }

  function registerGameResult(game, won, wager, payout) {
    const user = getUser();
    user.gamesPlayed += 1;
    if (won) { user.wins += 1; user.winStreak += 1; user.bestWinStreak = Math.max(user.bestWinStreak, user.winStreak); }
    else { user.losses += 1; user.winStreak = 0; }
    const gname = String(game).split(' · ')[0];
    user.gameCounts[gname] = (user.gameCounts[gname] || 0) + 1;
    const net = payout - wager;
    if (net > 0) user.coinsWon += net; else user.coinsLost += -net;
    registerMissionPlay(user);
    const newChest = user.gamesPlayed % 5 === 0;
    if (newChest) user.chests += 1;
    saveUser(user);
    addXP(won ? 25 : 8);
    logHistory(game, won, wager, payout);
    if (net > 0) pushLiveWin(gname, payout);
    touchPresence();
    if (newChest) { toast('info', '📦 ¡Ganaste un cofre virtual!'); notify('Ganaste un cofre virtual. Ábrelo en Bonificaciones.', '📦'); }
    checkAchievements();
  }

  /* ---------- Jugadores activos y ganadores en tiempo real (compartido entre pestañas del mismo navegador) ---------- */

  const PAGE_GAME = { 'tragamonedas.html': 'Tragamonedas', 'ruleta.html': 'Ruleta', 'Blackjack.html': 'Blackjack', 'poker.html': 'Poker', 'dados.html': 'Dados', 'carreras.html': 'Carreras', 'bingo.html': 'Bingo', 'torneos.html': 'Torneo' };
  const ACTIVE_MS = 2 * 60 * 1000;
  let presenceTimer = null;

  function touchPresence() {
    const u = cu(); if (!u) return;
    const page = pageFile();
    write(dk('p', u), { game: PAGE_GAME[page] || null, ts: Date.now() });
    write(dk('l', u), Date.now());
  }
  function startPresence() {
    touchPresence();
    if (presenceTimer) return;
    presenceTimer = setInterval(() => { if (!document.hidden) touchPresence(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) touchPresence(); });
  }
  function playersNow() {
    return getAccounts().filter(a => a.role !== 'admin' && !a.banned).map(a => ({ name: a.username, ...read(dk('p', a.username), { game: null, ts: 0 }) }))
      .filter(p => Date.now() - p.ts < ACTIVE_MS).sort((a, b) => b.ts - a.ts);
  }
  function pushLiveWin(game, amount) {
    const u = cu(); if (!u || !(amount > 0)) return;
    const l = read('rc_live_wins', []); l.unshift({ user: u, game, amount, ts: Date.now() });
    write('rc_live_wins', l.slice(0, 40));
  }
  // ganadores recientes (última hora) de jugadores que siguen activos ahora
  function liveWins(limit = 8) {
    const active = new Set(playersNow().map(p => p.name));
    return read('rc_live_wins', []).filter(w => active.has(w.user) && Date.now() - w.ts < 3600000).slice(0, limit);
  }

  /* ---------- Amigos: buscar, agregar y ver quién está conectado (datos del mismo navegador) ---------- */

  const isPlayer = a => a && a.role !== 'admin' && !a.banned;
  const findPlayer = id => { const a = findAccount(id); return isPlayer(a) ? a : null; };
  function getSocial(u = cu()) {
    const raw = read(dk('f', u || ''), {});
    const ok = n => isPlayer(findAccount(n));                       // descarta cuentas borradas o bloqueadas
    return { friends: (raw.friends || []).filter(ok), incoming: (raw.incoming || []).filter(ok), outgoing: (raw.outgoing || []).filter(ok) };
  }
  const saveSocial = (soc, u = cu()) => write(dk('f', u), soc);
  const addTo = (list, n) => { if (!list.includes(n)) list.push(n); };
  const without = (list, n) => list.filter(x => x !== n);

  function relation(name) {                                          // 'friend' | 'incoming' | 'outgoing' | 'none'
    const s = getSocial();
    return s.friends.includes(name) ? 'friend' : s.incoming.includes(name) ? 'incoming' : s.outgoing.includes(name) ? 'outgoing' : 'none';
  }
  function makeFriends(a, b) {
    [[a, b], [b, a]].forEach(([x, y]) => { const s = getSocial(x); s.friends = [...new Set([...s.friends, y])]; s.incoming = without(s.incoming, y); s.outgoing = without(s.outgoing, y); saveSocial(s, x); });
  }
  function sendFriendRequest(name) {
    const me = cu(); const t = findPlayer(name);
    if (!me) return { ok: false, error: 'Inicia sesión para agregar amigos.' };
    if (!t) return { ok: false, error: 'Ese jugador no existe.' };
    if (t.username === me) return { ok: false, error: 'No puedes agregarte a ti mismo.' };
    const mine = getSocial();
    if (mine.friends.includes(t.username)) return { ok: false, error: 'Ya son amigos.' };
    if (mine.outgoing.includes(t.username)) return { ok: false, error: 'Ya enviaste una solicitud.' };
    if (mine.incoming.includes(t.username)) { makeFriends(me, t.username); notify(`${me} aceptó tu solicitud de amistad.`, '🤝', t.username); return { ok: true, status: 'friends', username: t.username }; }
    addTo(mine.outgoing, t.username); saveSocial(mine);
    const theirs = getSocial(t.username); addTo(theirs.incoming, me); saveSocial(theirs, t.username);
    notify(`${me} quiere ser tu amigo. Respóndele en Amigos.`, '👥', t.username);
    return { ok: true, status: 'sent', username: t.username };
  }
  function acceptFriend(name) {
    const me = cu(); if (!me || !getSocial().incoming.includes(name)) return { ok: false, error: 'No hay solicitud de ese jugador.' };
    makeFriends(me, name); notify(`${me} aceptó tu solicitud de amistad.`, '🤝', name); return { ok: true };
  }
  function dropRequest(name) {                                       // rechazar o cancelar: limpia ambos lados
    const me = cu(); if (!me) return;
    const a = getSocial(); a.incoming = without(a.incoming, name); a.outgoing = without(a.outgoing, name); saveSocial(a);
    const b = getSocial(name); b.incoming = without(b.incoming, me); b.outgoing = without(b.outgoing, me); saveSocial(b, name);
  }
  function removeFriend(name) {
    const me = cu(); if (!me) return;
    const a = getSocial(); a.friends = without(a.friends, name); saveSocial(a);
    const b = getSocial(name); b.friends = without(b.friends, me); saveSocial(b, name);
  }
  function presenceOf(name) {
    const p = read(dk('p', name), null); const ts = p ? p.ts : read(dk('l', name), 0);
    const online = Date.now() - ts < ACTIVE_MS;
    return { name, online, game: online && p ? p.game : null, ts };
  }
  const friendsStatus = () => getSocial().friends.map(presenceOf).sort((a, b) => (b.online - a.online) || (b.ts - a.ts));
  function searchPlayers(q) {
    const me = cu(), x = String(q || '').trim().toLowerCase();
    return getAccounts().filter(a => isPlayer(a) && a.username !== me && (!x || a.username.toLowerCase().includes(x) || String(a.name || '').toLowerCase().includes(x)))
      .map(a => ({ username: a.username, name: a.name, level: getUser(a.username).level, rel: relation(a.username), ...presenceOf(a.username) }))
      .sort((a, b) => (b.online - a.online) || a.username.localeCompare(b.username));
  }

  function registerMissionPlay(user) {
    const tk = todayKey();
    if (user.missionDate !== tk) { user.missionDate = tk; user.missionCount = 0; user.missionClaimed = false; }
    user.missionCount += 1;
  }

  function checkAchievements(u = cu()) {
    const user = getUser(u); let changed = false;
    ACHIEVEMENTS.forEach(a => {
      if (!user.achievements.includes(a.name) && a.test(user)) {
        user.achievements.push(a.name); changed = true;
        if (u === cu()) toast('win', `Logro desbloqueado: ${a.name}`);
        notify(`Nuevo logro desbloqueado: ${a.name}`, '🏆', u);
      }
    });
    if (changed) saveUser(user, u);
    return user;
  }

  function resetAccount() {
    const u = cu(); const old = getUser();
    write(dk('u', u), { ...defaultUser(), name: old.name });
    [ 'h', 'm', 'n' ].forEach(t => localStorage.removeItem(dk(t, u)));
    refreshBell();
  }

  /* ---------- Historial y billetera ---------- */

  function logHistory(game, won, wager, payout) {
    const u = cu(); if (!u) return;
    const list = getHistory();
    list.unshift({ date: new Date().toISOString(), game, result: won ? 'win' : 'lose', wager, payout, balance: getUser().coins });
    write(dk('h', u), list.slice(0, 200));
  }
  const getHistory = (u = cu()) => (u ? read(dk('h', u), []) : []);
  const clearHistory = () => { if (cu()) write(dk('h', cu()), []); };

  function getMovements() {
    const u = cu(); if (!u) return [];
    const games = getHistory(u).map(h => ({ date: h.date, concept: h.game, amount: h.payout - h.wager, balance: h.balance, type: 'juego' }));
    return [...games, ...read(dk('m', u), [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /* ---------- Notificaciones ---------- */

  function notify(text, icon, u = cu()) {
    if (!u || getSettings(u).notif === false) return;
    const l = read(dk('n', u), []);
    l.unshift({ id: Date.now() + Math.random(), icon: icon || '🔔', text, date: new Date().toISOString(), read: false });
    write(dk('n', u), l.slice(0, 60));
    if (u === cu()) refreshBell();
  }
  const getNotifications = () => (cu() ? read(dk('n', cu()), []) : []);
  const unreadCount = () => getNotifications().filter(n => !n.read).length;
  const markAllRead = () => { write(dk('n', cu()), getNotifications().map(n => ({ ...n, read: true }))); refreshBell(); };
  const clearNotifications = () => { write(dk('n', cu()), []); refreshBell(); };

  /* ---------- Ajustes ---------- */

  const DEFAULT_SETTINGS = { theme: 'oscuro', lang: 'es', sound: true, anim: true, notif: true };
  const getSettings = (u = cu()) => ({ ...DEFAULT_SETTINGS, ...read(dk('s', u || 'guest'), {}) });
  function saveSettings(patch) { write(dk('s', cu() || 'guest'), { ...getSettings(), ...patch }); applySettings(); }
  function applySettings() {
    const s = getSettings(); const el = document.documentElement;
    el.dataset.theme = s.theme === 'claro' ? 'light' : 'dark';
    el.dataset.anim = s.anim ? 'on' : 'off';
    el.lang = s.lang;
  }

  /* ---------- Noticias, soporte y juegos activos ---------- */

  const getNews = () => read(K.NEWS, DEFAULT_NEWS);
  const addNews = (title, text) => { const l = getNews(); l.unshift({ id: Date.now(), icon: '📰', title, text, date: todayKey() }); write(K.NEWS, l); };
  const deleteNews = id => write(K.NEWS, getNews().filter(n => n.id !== id));

  const getTickets = () => read(K.TICKETS, []);
  function addTicket(category, description) {
    const l = getTickets(); const id = l.reduce((m, t) => Math.max(m, t.id), 0) + 1;
    l.unshift({ id, user: cu(), category, description, status: 'open', date: new Date().toISOString() });
    write(K.TICKETS, l); return id;
  }
  const setTicketStatus = (id, status) => { const l = getTickets(); const t = l.find(x => x.id === id); if (t) { t.status = status; write(K.TICKETS, l); if (status === 'closed') notify(`Tu solicitud #${id} fue resuelta.`, '📞', t.user); } };
  const deleteTicket = id => write(K.TICKETS, getTickets().filter(t => t.id !== id));

  const disabledGames = () => read(K.OFF, []);
  const isGameEnabled = name => !disabledGames().includes(name);
  const setGameEnabled = (name, on) => { const s = new Set(disabledGames()); on ? s.delete(name) : s.add(name); write(K.OFF, [...s]); };

  /* ---------- Ranking y estadísticas globales ---------- */

  function getRanking(period) {
    const me = cu();
    const real = getAccounts().filter(a => a.role !== 'admin' && !a.banned).map(a => {
      const d = getUser(a.username);
      const xp = period === 'semanal' ? (d.xpWeekKey === weekKey() ? d.xpWeek : 0)
        : period === 'mensual' ? (d.xpMonthKey === monthKey() ? d.xpMonth : 0) : totalXp(d.level, d.xp);
      return { name: a.username, level: d.level, xp, me: a.username === me };
    });
    const demo = DEMO.map(p => ({ name: p.name, level: p.level, me: false,
      xp: period === 'semanal' ? p.week : period === 'mensual' ? p.month : totalXp(p.level, p.xp) }));
    return [...real, ...demo].sort((a, b) => b.xp - a.xp || b.level - a.level);
  }

  function globalStats() {
    const accs = getAccounts().filter(a => a.role !== 'admin');
    let games = DEMO.reduce((s, p) => s + p.games, 0), prizes = DEMO.reduce((s, p) => s + p.won, 0), coins = 0, online = 0, ach = 0;
    const counts = { ...DEMO_COUNTS };
    accs.forEach(a => {
      const d = getUser(a.username);
      games += d.gamesPlayed; prizes += d.coinsWon; coins += d.coins; ach += d.achievements.length;
      Object.entries(d.gameCounts).forEach(([g, n]) => { counts[g] = (counts[g] || 0) + n; });
      if (Date.now() - (read(dk('l', a.username), 0)) < 5 * 60 * 1000) online += 1;
    });
    return { users: accs.length + DEMO.length, realUsers: accs.length, games, prizes, coins, online, ach, counts };
  }

  function adminGrant(username, amount) {
    const a = findAccount(username);
    if (!a) return { ok: false, error: 'Ese usuario no existe.' };
    if (!(amount > 0)) return { ok: false, error: 'Indica una cantidad válida.' };
    const d = getUser(a.username); d.coins += amount; saveUser(d, a.username);
    logMove('Recompensa del administrador', amount, 'recompensa', d.coins, a.username);
    notify(`Recibiste ${formatNumber(amount)} monedas del administrador.`, '🎁', a.username);
    return { ok: true, username: a.username };
  }

  /* ---------- Gráficos simples ---------- */

  function barChart(el, items) {
    if (!el) return;
    const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
    el.innerHTML = items.length ? items.map(i => `
      <div class="bar-row"><span class="bar-label">${esc(i.label)}</span>
      <div class="bar-track"><div class="bar-fill ${i.cls || ''}" style="width:${Math.abs(i.value) / max * 100}%"></div></div>
      <span class="bar-val">${formatNumber(i.value)}</span></div>`).join('') : '<div class="rc-empty">Aún no hay datos.</div>';
  }

  /* ---------- Header / nav ---------- */

  // Nombre de la página actual ('index.html' en la portada). Tolera servidores que ocultan la extensión (/html/juegos).
  function pageFile() {
    const f = decodeURIComponent(location.pathname.split('/').pop() || '');
    if (!f) return 'index.html';
    return /\.[a-z0-9]+$/i.test(f) ? f : f + '.html';
  }

  function initHeader(rootId) {
    applySettings();
    startPresence();
    const root = document.getElementById(rootId || 'rc-header-root');
    if (!root) return;
    const u = cu();
    const user = getUser(); const info = levelInfo(user.level); const current = pageFile();
    const adm = isAdmin();
    // El administrador usa el botón Administración de la barra superior (sin perfil de jugador)
    const items = NAV_ITEMS;
    const href = i => BASE + i.href;
    const adminBtn = `<a class="rc-btn rc-btn-gold rc-btn-sm rc-admin-btn${inAdmin ? ' active' : ''}" href="${PAGES}admin/admin.html" title="Panel de administración">Administración</a>`;
    const profileBtn = `<a class="rc-avatar-link" href="${BASE}mi_perfil.html" title="Mi perfil (${esc(u || '')})">👤</a>`;

    root.innerHTML = `
      <header class="rc-header">
        <a class="rc-brand" href="${HOME}"><span class="crown">♛</span><span class="rc-b1">ROYAL</span><span class="rc-b2">CASINO</span></a>
        <nav class="rc-nav">
          <a class="rc-home-btn${current === 'index.html' ? ' active' : ''}" href="${HOME}" title="Volver al inicio">🏠 Inicio</a>
          <a class="rc-casino-btn${current === 'juegos.html' ? ' active' : ''}" href="${BASE}juegos.html" title="Ver todos los juegos">🎰 Casino</a>
          ${items.map(i => `<a href="${href(i)}" class="${i.href === current ? 'active' : ''}">${esc(i.label)}</a>`).join('')}
        </nav>
        <div class="rc-user">
          <span class="rc-level-pill">${info.icon} Nv. ${user.level}</span>
          <a class="rc-coins" href="${BASE}billetera.html" title="Billetera">💰 <span id="rc-coin-display">${formatNumber(user.coins)}</span></a>
          <a class="rc-avatar-link" href="${BASE}notificaciones.html" title="Notificaciones" style="position:relative">🔔<span id="rc-bell" style="display:none;position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#c0392b;color:#fff;font-size:.65rem;font-weight:700;align-items:center;justify-content:center"></span></a>
          ${adm ? adminBtn : profileBtn}
          <button class="rc-btn rc-btn-ghost rc-btn-sm" id="rc-logout" type="button">Salir</button>
        </div>
      </header>
      <div class="rc-toast-wrap" id="rc-toast-wrap"></div>
    `;
    root.querySelector('#rc-logout').addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) logout(); });
    refreshBell();
    // Flecha para volver al lobby de juegos (solo en las páginas de cada juego)
    if (['tragamonedas.html', 'ruleta.html', 'Blackjack.html', 'poker.html', 'dados.html', 'carreras.html', 'bingo.html'].includes(current)) {
      const main = document.querySelector('.rc-main');
      if (main && !main.querySelector('.rc-back-games')) main.insertAdjacentHTML('afterbegin', `<a class="rc-back-games" href="${BASE}juegos.html" title="Volver a los juegos" aria-label="Volver a los juegos"><span aria-hidden="true">←</span> Juegos</a>`);
    }
  }

  function refreshHeaderDisplay(user) {
    const el = document.getElementById('rc-coin-display');
    if (el) el.textContent = formatNumber(user.coins);
    const pill = document.querySelector('.rc-level-pill');
    if (pill) { const info = levelInfo(user.level); pill.textContent = `${info.icon} Nv. ${user.level}`; }
  }

  function refreshBell() {
    const b = document.getElementById('rc-bell'); if (!b) return;
    const n = unreadCount();
    b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'flex' : 'none';
  }

  function toast(type, message) {
    const wrap = document.getElementById('rc-toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `rc-toast ${type}`; el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------- Arranque ---------- */

  if (!getAccounts().some(a => a.username === 'admin')) {     // cuenta de administrador de ejemplo
    const l = getAccounts();
    l.push({ username: 'admin', name: 'Administrador', email: 'admin@royalcasino.local', hash: pw('admin123'), role: 'admin', banned: false, created: new Date().toISOString() });
    saveAccounts(l);
  }
  applySettings();

  return {
    // cuentas
    register, login, logout, recover, updateAccount, getSession, isLoggedIn, isAdmin, currentUser: cu,
    getAccounts, setBanned, deleteAccount, adminGrant,
    // juego
    getUser, saveUser, addCoins, canBet, addXP, registerGameResult, checkAchievements, resetAccount,
    getHistory, logHistory, clearHistory, getMovements, logMove,
    // datos
    ACHIEVEMENTS, GAMES, GAME_INFO, NAV_ITEMS, DEMO,
    getRanking, globalStats, getNews, addNews, deleteNews, getTickets, addTicket, setTicketStatus, deleteTicket,
    isGameEnabled, setGameEnabled, notify, getNotifications, unreadCount, markAllRead, clearNotifications,
    getSettings, saveSettings, applySettings,
    // interfaz
    playersNow, liveWins, touchPresence,
    getSocial, sendFriendRequest, acceptFriend, dropRequest, removeFriend, friendsStatus, searchPlayers,
    initHeader, toast, barChart, formatNumber, signed, esc, fmtDate,
    // rutas
    ROOT, PAGES, HOME, pageFile,
    levelInfo, xpForLevel, levelReward, totalXp, todayKey, isWeekend, START_COINS,
  };
})();
