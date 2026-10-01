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

  // Abre sesión con una cuenta ya verificada en Firebase (firebase_auth.js).
  // Crea o actualiza la copia local que usa el resto del sitio (monedas, historial, etc.).
  function loginRemote(acc, password, remember) {
    if (!acc || !acc.username) return { ok: false, error: 'Cuenta no válida.' };
    const list = getAccounts();
    const i = list.findIndex(a => a.username.toLowerCase() === String(acc.username).toLowerCase());
    const prev = i >= 0 ? list[i] : null;
    if (prev && prev.banned) return { ok: false, error: 'Tu cuenta está bloqueada. Contacta con soporte.' };
    const rec = {
      username: acc.username, name: acc.name || acc.username, email: acc.email || '',
      hash: pw(password),                              // permite el login sin conexión y la comprobación local de la contraseña actual
      role: (acc.role === 'admin' || (prev && prev.role === 'admin')) ? 'admin' : 'user',
      banned: false, created: prev ? prev.created : new Date().toISOString(),
    };
    if (prev) list[i] = rec; else list.push(rec);
    saveAccounts(list);
    if (!read(dk('u', rec.username), null)) {
      write(dk('u', rec.username), { ...defaultUser(), name: rec.name });
      notify('Bienvenido a Royal Casino. Recibiste ' + formatNumber(START_COINS) + ' monedas virtuales.', '🎁', rec.username);
    }
    setSession(rec.username, remember);
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

  // trusted: la contraseña actual ya fue verificada contra Firebase (configuracion.js), no se vuelve a comprobar en local
  function updateAccount({ newUser, oldPass, newPass, trusted }) {
    const list = getAccounts(); const me = list.find(a => a.username === cu());
    if (!me || (!trusted && me.hash !== pw(oldPass || ''))) return { ok: false, error: 'La contraseña actual no es correcta.' };
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
      toast('win', `¡Subiste a nivel ${lv}! ${info.icon} ${info.name} (+${formatNumber(r)} monedas)`, '⭐');
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
    if (newChest) { chestFound(); notify('Ganaste un cofre virtual. Ábrelo en Bonificaciones.', '📦'); }
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
        if (u === cu()) toast('win', `Logro desbloqueado: ${a.name}`, '🏆');
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

  /* ---------- Avisos pequeños (toasts) ---------- */
  // toast(tipo, mensaje[, icono]) — tipos: 'info' | 'win' | 'lose' (o 'error'). Para el resultado de una jugada usa result().
  const TOAST_ICON = { info: 'ℹ️', win: '✅', lose: '⚠️' };
  function toast(type, message, icon) {
    let wrap = document.getElementById('rc-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'rc-toast-wrap'; wrap.id = 'rc-toast-wrap'; document.body.appendChild(wrap); }
    const kind = type === 'error' ? 'lose' : (TOAST_ICON[type] ? type : 'info');
    const life = 3800;
    const el = document.createElement('div');
    el.className = `rc-toast ${kind}`;
    el.setAttribute('role', kind === 'lose' ? 'alert' : 'status');
    const ic = document.createElement('span'); ic.className = 'rc-toast-ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = icon || TOAST_ICON[kind];
    const tx = document.createElement('span'); tx.className = 'rc-toast-tx'; tx.textContent = message;
    const bar = document.createElement('i'); bar.className = 'rc-toast-bar'; bar.style.animationDuration = life + 'ms';
    el.append(ic, tx, bar);
    wrap.appendChild(el);
    while (wrap.children.length > 4) wrap.firstElementChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 280); }, life);
  }

  /* ---------- Cartel central de resultado (ganas / pierdes) ---------- */
  // result({ type: 'win'|'big'|'lose'|'push', title, amount, text, icon, duration, sound })
  //   win  = victoria · big = gran premio · lose = derrota · push = empate/recuperas apuesta
  //   amount = monedas ganadas o perdidas (siempre positivo; el signo lo pone el tipo)
  //   sound:false si el juego ya tiene sus propios sonidos.
  const RESULT_DEF = {
    win:  { icon: '🏆', title: '¡GANASTE!',     ms: 2900, sign: '+' },
    big:  { icon: '👑', title: '¡GRAN PREMIO!', ms: 4200, sign: '+' },
    lose: { icon: '💔', title: 'PERDISTE',      ms: 2200, sign: '−' },
    push: { icon: '🤝', title: 'EMPATE',        ms: 2000, sign: '' },
  };
  let resNode = null, resTimer = 0, resStop = null, resCount = 0, resKey = null, resAudio = null;

  function closeResult(now) {
    clearTimeout(resTimer); if (resStop) { resStop(); resStop = null; } cancelAnimationFrame(resCount);
    if (resKey) { document.removeEventListener('keydown', resKey); resKey = null; }
    const node = resNode; resNode = null;
    if (!node) return;
    if (now) { node.remove(); return; }
    node.classList.add('out');
    setTimeout(() => node.remove(), 400);
  }

  function resultSound(type) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      resAudio = resAudio || new AC();
      if (resAudio.state === 'suspended') resAudio.resume();
      const t0 = resAudio.currentTime + 0.02;
      const seq = {
        win:  [[523, 0], [659, .11], [784, .22], [1047, .33]],
        big:  [[523, 0], [659, .1], [784, .2], [1047, .3], [784, .45], [1047, .55], [1319, .67], [1568, .8]],
        lose: [[392, 0], [349, .2], [311, .4], [262, .65]],
        push: [[440, 0], [440, .18]],
      }[type];
      const bad = type === 'lose', dur = bad ? .34 : .22;
      seq.forEach(([f, d]) => {
        const o = resAudio.createOscillator(), g = resAudio.createGain();
        o.type = bad ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(bad ? .04 : .08, t0 + d + .02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + dur);
        o.connect(g); g.connect(resAudio.destination);
        o.start(t0 + d); o.stop(t0 + d + dur + .05);
      });
    } catch (e) { /* sin audio: no pasa nada */ }
  }

  // Confeti y monedas (ganar) · lluvia y ceniza (perder) · polvo plateado (empate)
  function startParticles(canvas, type, ms) {
    const ctx = canvas.getContext('2d'); if (!ctx) return () => {};
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
    ctx.scale(dpr, dpr);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const small = vw < 600, big = type === 'big', win = type === 'win' || big;
    const COLORS = ['#ffd84a', '#ffb703', '#ff4d6d', '#4ade80', '#5eb5ff', '#ffffff', '#c77dff'];
    const vmax = Math.sqrt(vh) * .8, parts = [];
    const q = (small ? .6 : 1) * (big ? 1.6 : 1);

    function shoot(n, x, y, ang, spread) {
      for (let i = 0; i < n; i++) {
        const a = ang + rnd(-spread, spread), v = rnd(vmax * .5, vmax);
        parts.push({ k: Math.random() < .2 ? 'coin' : 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: rnd(.2, .32), r: rnd(0, 6.28), vr: rnd(-.3, .3), w: rnd(7, 13), h: rnd(5, 9), c: COLORS[(Math.random() * COLORS.length) | 0], sp: rnd(0, 6.28), vsp: rnd(.1, .3), age: 0, max: rnd(150, 230) });
      }
    }
    const cannons = () => {
      shoot(Math.round(45 * q), vw * .08, vh + 10, -Math.PI / 2 + .5, .35);
      shoot(Math.round(45 * q), vw * .92, vh + 10, -Math.PI / 2 - .5, .35);
    };
    function dust(n, c, rising) {
      for (let i = 0; i < n; i++) parts.push({ k: 'ash', x: rnd(0, vw), y: rising ? rnd(vh * .5, vh) : rnd(-vh * .4, vh * .6), vx: rnd(-.4, .4), vy: rising ? -rnd(.4, 1.2) : rnd(.6, 1.6), w: rnd(2, 5), c, sp: rnd(0, 6.28), age: 0, max: 400 });
    }

    let emitEnd = 0, acc = 0, volley = false;
    if (win) {
      cannons();
      shoot(Math.round(40 * q), vw / 2, vh * .45, -Math.PI / 2, 1.7);   // estallido desde el cartel
      emitEnd = big ? 2400 : 1500;
    } else if (type === 'lose') {
      dust(small ? 24 : 44, 'rgba(210,205,215,.5)', false);
      emitEnd = ms * .85;
    } else {
      dust(small ? 20 : 36, 'rgba(200,215,255,.7)', true);
    }

    function emit(el, dt) {
      if (win) {
        if (!volley && el > 650) { volley = true; cannons(); }
        if (el < emitEnd) {
          acc += (small ? 1 : 1.8) * (big ? 1.5 : 1) * dt;
          while (acc >= 1) {
            acc--;
            parts.push({ k: Math.random() < .2 ? 'coin' : 'conf', x: rnd(0, vw), y: -12, vx: rnd(-1, 1), vy: rnd(1, 3), g: .05, r: rnd(0, 6.28), vr: rnd(-.3, .3), w: rnd(7, 13), h: rnd(5, 9), c: COLORS[(Math.random() * COLORS.length) | 0], sp: rnd(0, 6.28), vsp: rnd(.1, .3), age: 0, max: 260 });
          }
        }
      } else if (type === 'lose' && el < emitEnd) {
        acc += (small ? 2 : 3.5) * dt;
        while (acc >= 1) { acc--; parts.push({ k: 'drop', x: rnd(-30, vw + 30), y: -24, vx: -3, vy: rnd(14, 22), age: 0, max: 0 }); }
      }
    }

    const t0 = performance.now(); let last = t0, raf = 0;
    function frame(now) {
      const dt = Math.min(2.5, (now - last) / 16.667); last = now;
      const el = now - t0;
      emit(el, dt);
      ctx.clearRect(0, 0, vw, vh);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.k === 'drop') { p.x += p.vx * dt; p.y += p.vy * dt; }
        else if (p.k === 'ash') { p.x += (p.vx + Math.sin(p.age * .05 + p.sp) * .4) * dt; p.y += p.vy * dt; }
        else { p.vy = Math.min(p.vy + p.g * dt, 6.5); p.vx *= 1 - .012 * dt; p.x += p.vx * dt + Math.sin(p.sp) * .5; p.y += p.vy * dt; p.r += p.vr * dt; p.sp += p.vsp * dt; }
        if (p.y > vh + 30 || p.y < -vh || p.x < -40 || p.x > vw + 40 || (p.max && p.age > p.max)) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = p.max ? Math.max(0, Math.min(1, (p.max - p.age) / 30)) : 1;
        if (p.k === 'drop') {
          ctx.strokeStyle = 'rgba(175,195,235,.5)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4); ctx.stroke();
        } else if (p.k === 'ash') {
          ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.w, p.w);
        } else if (p.k === 'coin') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(.12, Math.abs(Math.cos(p.sp))), 1);
          ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(0, 0, p.w * .55, 0, 6.283); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-1, -1, p.w * .22, 0, 6.283); ctx.fill();
          ctx.restore();
        } else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.sp));
          ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (el < emitEnd || parts.length) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  function result(opts) {
    const o = typeof opts === 'string' ? { type: opts } : (opts || {});
    const type = RESULT_DEF[o.type] ? o.type : 'win';
    const def = RESULT_DEF[type];
    const st = getSettings();
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const animOn = st.anim !== false && !reduced;
    const ms = Math.max(900, o.duration || def.ms);
    const amt = Number(o.amount), hasAmt = Number.isFinite(amt) && amt > 0;
    const fmtN = v => def.sign + formatNumber(Math.round(v));

    closeResult(true);
    const node = document.createElement('div');
    node.className = `rc-res ${type}${animOn ? '' : ' calm'}`;
    node.setAttribute('role', 'status');
    node.innerHTML = `
      ${animOn && type !== 'lose' && type !== 'push' ? '<div class="rc-res-rays" aria-hidden="true"></div>' : ''}
      <div class="rc-res-card" title="Toca para cerrar">
        <div class="rc-res-bulbs" aria-hidden="true"></div>
        <div class="rc-res-icon" aria-hidden="true">${esc(o.icon || def.icon)}</div>
        <h2 class="rc-res-title">${esc(o.title || def.title)}</h2>
        ${hasAmt ? `<div class="rc-res-amount"><span class="n">${fmtN(animOn && type !== 'lose' ? 0 : amt)}</span><span class="u">monedas</span></div>` : ''}
        ${o.text ? `<p class="rc-res-text">${esc(o.text)}</p>` : ''}
        <div class="rc-res-bulbs" aria-hidden="true"></div>
      </div>
      ${animOn ? '<canvas class="rc-res-fx" aria-hidden="true"></canvas>' : ''}`;
    document.body.appendChild(node);
    resNode = node;

    resKey = e => { if (e.key === 'Escape') closeResult(); };
    document.addEventListener('keydown', resKey);
    node.querySelector('.rc-res-card').addEventListener('click', () => closeResult());

    const nEl = node.querySelector('.rc-res-amount .n');
    if (nEl && animOn && type !== 'lose') {        // cuenta las monedas hacia arriba
      const s = performance.now(), dur = Math.min(1400, 500 + Math.log10(amt + 1) * 180);
      const step = now => {
        const k = Math.max(0, Math.min(1, (now - s - 280) / dur));
        nEl.textContent = fmtN(amt * (1 - Math.pow(1 - k, 3)));
        if (k < 1) resCount = requestAnimationFrame(step);
      };
      resCount = requestAnimationFrame(step);
    }
    if (animOn) resStop = startParticles(node.querySelector('canvas'), type, ms);
    if (o.sound !== false && st.sound !== false) resultSound(type);
    resTimer = setTimeout(() => closeResult(), ms);
  }

  /* ---------- Cofres virtuales ---------- */
  // Un cofre cada 5 partidas. openChest() abre uno de los guardados y devuelve el premio.
  function openChest() {
    const u = getUser();
    if (!u || u.chests < 1) return null;
    u.chests -= 1; u.chestsOpened += 1;
    saveUser(u);
    const roll = Math.random();
    let text, coins = 0, xp = 0;
    if (roll < 0.6) { coins = 100 + Math.floor(Math.random() * 9) * 100; addCoins(coins, 'Cofre virtual', 'recompensa'); text = `¡El cofre tenía ${formatNumber(coins)} monedas!`; }
    else if (roll < 0.95) { xp = 50 + Math.floor(Math.random() * 4) * 50; addXP(xp); text = `¡El cofre tenía ${xp} XP!`; }
    else { coins = 2500; addCoins(coins, 'Cofre virtual (premio gordo)', 'recompensa'); text = '¡PREMIO GORDO! 2.500 monedas.'; }
    const res = { text, coins, xp, jackpot: roll >= 0.95 };
    notify(text, '📦');
    checkAchievements();
    window.dispatchEvent(new CustomEvent('rc:chest', { detail: res }));
    return res;
  }

  const CHEST_SVG = `
<svg class="rc-chest-svg" viewBox="0 0 260 230" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="rcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6330"/><stop offset=".55" stop-color="#6b4020"/><stop offset="1" stop-color="#3d2410"/></linearGradient>
    <linearGradient id="rcWoodLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bd803f"/><stop offset=".6" stop-color="#7d4c24"/><stop offset="1" stop-color="#5a3518"/></linearGradient>
    <linearGradient id="rcIron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#262a31"/><stop offset=".35" stop-color="#8790a0"/><stop offset=".62" stop-color="#4a505c"/><stop offset="1" stop-color="#20242b"/></linearGradient>
    <linearGradient id="rcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2ae"/><stop offset=".5" stop-color="#e0ac26"/><stop offset="1" stop-color="#8a5f0a"/></linearGradient>
    <linearGradient id="rcVelvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c1c36"/><stop offset="1" stop-color="#4a0a1a"/></linearGradient>
    <radialGradient id="rcGlowIn" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffc83d" stop-opacity=".92"/><stop offset="1" stop-color="#ff9d00" stop-opacity="0"/></radialGradient>
    <clipPath id="rcClipLid"><path d="M30 116 L30 88 C30 46 68 30 130 30 C192 30 230 46 230 88 L230 116 Z"/></clipPath>
    <clipPath id="rcClipLidIn"><path d="M40 114 L40 94 C40 62 74 50 130 50 C186 50 220 62 220 94 L220 114 Z"/></clipPath>
  </defs>

  <!-- tapa abierta (se ve el interior, de terciopelo) -->
  <g class="lid-open" style="transform-origin:130px 114px">
    <path d="M40 114 L40 94 C40 62 74 50 130 50 C186 50 220 62 220 94 L220 114 Z" fill="url(#rcWoodLid)" stroke="#2a170a" stroke-width="3"/>
    <g clip-path="url(#rcClipLidIn)"><rect x="56" y="44" width="14" height="72" fill="url(#rcIron)"/><rect x="190" y="44" width="14" height="72" fill="url(#rcIron)"/></g>
    <path d="M52 110 L52 95 C52 73 82 63 130 63 C178 63 208 73 208 95 L208 110 Z" fill="url(#rcVelvet)" stroke="#e0ac26" stroke-width="2.5"/>
    <path d="M70 100 C70 82 96 74 130 74" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- luz y tesoro del interior -->
  <ellipse class="c-glow" cx="130" cy="112" rx="96" ry="26" fill="url(#rcGlowIn)"/>
  <g class="c-pile">
    <path d="M42 122 Q54 92 86 98 Q104 70 138 90 Q168 76 192 98 Q214 104 218 122 Z" fill="url(#rcGold)" stroke="#8a5f0a" stroke-width="2"/>
    <g fill="#fff2ae" stroke="#b8860b" stroke-width="1.5"><circle cx="82" cy="100" r="7"/><circle cx="104" cy="90" r="7"/><circle cx="130" cy="84" r="8"/><circle cx="156" cy="90" r="7"/><circle cx="180" cy="100" r="7"/><circle cx="118" cy="102" r="7"/><circle cx="146" cy="104" r="7"/></g>
    <circle cx="134" cy="82" r="3" fill="#e63b5a"/><circle cx="98" cy="96" r="2.6" fill="#3bd6e6"/><circle cx="168" cy="96" r="2.6" fill="#7cf08a"/>
  </g>

  <!-- cuerpo -->
  <rect x="30" y="112" width="200" height="88" rx="8" fill="url(#rcWood)" stroke="#2a170a" stroke-width="3"/>
  <g stroke="rgba(0,0,0,.32)" stroke-width="2"><path d="M33 135 H227"/><path d="M33 158 H227"/><path d="M33 181 H227"/></g>
  <g stroke="rgba(255,255,255,.08)" stroke-width="1.5"><path d="M33 137 H227"/><path d="M33 160 H227"/><path d="M33 183 H227"/></g>
  <g stroke="rgba(0,0,0,.2)" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M78 122 q10 4 20 0"/><path d="M158 146 q12 5 24 0"/><path d="M84 168 q9 4 18 0"/><path d="M196 124 q8 4 16 0"/></g>
  <rect x="50" y="112" width="18" height="88" fill="url(#rcIron)" stroke="#14161a" stroke-width="1.5"/>
  <rect x="192" y="112" width="18" height="88" fill="url(#rcIron)" stroke="#14161a" stroke-width="1.5"/>
  <rect x="25" y="190" width="210" height="14" rx="4" fill="url(#rcIron)" stroke="#14161a" stroke-width="2"/>
  <g fill="#c4cad6" stroke="#14161a" stroke-width="1"><circle cx="59" cy="124" r="3"/><circle cx="59" cy="150" r="3"/><circle cx="59" cy="176" r="3"/><circle cx="201" cy="124" r="3"/><circle cx="201" cy="150" r="3"/><circle cx="201" cy="176" r="3"/><circle cx="40" cy="197" r="2.6"/><circle cx="130" cy="197" r="2.6"/><circle cx="220" cy="197" r="2.6"/></g>
  <g class="c-lock">
    <rect x="106" y="112" width="48" height="44" rx="7" fill="url(#rcGold)" stroke="#6a4607" stroke-width="2.5"/>
    <circle cx="130" cy="130" r="6.5" fill="#1a1008"/><path d="M126.5 132 H133.5 L136 146 H124 Z" fill="#1a1008"/>
    <g fill="#8a5f0a"><circle cx="113" cy="119" r="2.2"/><circle cx="147" cy="119" r="2.2"/><circle cx="113" cy="149" r="2.2"/><circle cx="147" cy="149" r="2.2"/></g>
  </g>

  <!-- rendija de luz entre tapa y cuerpo -->
  <rect class="c-slit" x="34" y="108" width="192" height="7" rx="3.5" fill="#fff0a0"/>

  <!-- tapa cerrada -->
  <g class="lid-closed" style="transform-origin:130px 116px">
    <path d="M30 116 L30 88 C30 46 68 30 130 30 C192 30 230 46 230 88 L230 116 Z" fill="url(#rcWoodLid)" stroke="#2a170a" stroke-width="3"/>
    <g stroke="rgba(0,0,0,.26)" stroke-width="2" fill="none"><path d="M33 72 C45 48 80 36 130 36 C180 36 215 48 227 72"/><path d="M31 96 H229"/></g>
    <path d="M44 82 C48 58 82 44 130 44" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="4" stroke-linecap="round"/>
    <g clip-path="url(#rcClipLid)">
      <rect x="50" y="26" width="18" height="92" fill="url(#rcIron)" stroke="#14161a" stroke-width="1.5"/>
      <rect x="192" y="26" width="18" height="92" fill="url(#rcIron)" stroke="#14161a" stroke-width="1.5"/>
      <rect x="24" y="102" width="212" height="16" fill="url(#rcIron)" stroke="#14161a" stroke-width="2"/>
    </g>
    <g fill="#c4cad6" stroke="#14161a" stroke-width="1"><circle cx="59" cy="60" r="3"/><circle cx="59" cy="88" r="3"/><circle cx="201" cy="60" r="3"/><circle cx="201" cy="88" r="3"/><circle cx="40" cy="110" r="2.6"/><circle cx="220" cy="110" r="2.6"/></g>
    <path d="M118 98 H142 V126 Q130 134 118 126 Z" fill="url(#rcGold)" stroke="#6a4607" stroke-width="2.5"/>
    <circle cx="130" cy="108" r="3.2" fill="#6a4607"/>
  </g>
</svg>`;

  let chestNode = null, chestWait = 0, chestKey = null, chestRaf = 0, chestStop = null, chestTimers = [];

  function chestTone(f0, t, d, o = {}) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      resAudio = resAudio || new AC();
      if (resAudio.state === 'suspended') resAudio.resume();
      const s = resAudio.currentTime + t, osc = resAudio.createOscillator(), g = resAudio.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f0, s);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, s + d);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(o.vol || .1, s + Math.min(.03, d / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      osc.connect(g); g.connect(resAudio.destination);
      osc.start(s); osc.stop(s + d + .05);
    } catch (e) { /* sin audio */ }
  }

  function chestClose(now) {
    chestTimers.forEach(clearTimeout); chestTimers = [];
    cancelAnimationFrame(chestRaf); if (chestStop) { chestStop(); chestStop = null; }
    if (chestKey) { document.removeEventListener('keydown', chestKey); chestKey = null; }
    const node = chestNode; chestNode = null;
    if (!node) return;
    if (now) { node.remove(); return; }
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 420);
  }

  // Aviso de cofre nuevo: espera a que termine el cartel de resultado y luego lo deja caer.
  function chestFound() {
    if (chestNode || chestWait) return;
    let tries = 0;
    chestWait = setTimeout(function check() {
      const busy = resNode || document.querySelector('.bigwin:not([hidden])');
      if (busy && ++tries < 40) { chestWait = setTimeout(check, 250); return; }
      chestWait = setTimeout(() => { chestWait = 0; chestShow({}); }, 350);
    }, 600);
  }

  // chestShow({ autoOpen }) — sin opciones: cae del cielo y deja elegir. autoOpen: aparece y se abre solo.
  function chestShow(opts = {}) {
    if (chestNode) return;
    const st = getSettings();
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const animOn = st.anim !== false && !reduced, soundOn = st.sound !== false;
    const auto = !!opts.autoOpen;
    let state = 'falling';

    const node = document.createElement('div');
    node.className = `rc-chest-ov${animOn ? '' : ' calm'}${auto ? ' appear' : ''}`;
    node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); node.setAttribute('aria-label', 'Cofre virtual');
    node.innerHTML = `
      <div class="rc-chest-stars" aria-hidden="true"></div>
      <div class="rc-chest-beam" aria-hidden="true"></div>
      <div class="rc-chest-rays" aria-hidden="true"></div>
      <div class="rc-chest-stage">
        <h2 class="rc-chest-title">${auto ? '¡Abriendo cofre!' : '¡Un cofre cayó del cielo!'}</h2>
        <div class="rc-chest-box">
          <div class="rc-chest-halo" aria-hidden="true"></div>
          <div class="rc-chest-shadow" aria-hidden="true"></div>
          <span class="rc-chest-ring" aria-hidden="true"></span><span class="rc-chest-ring r2" aria-hidden="true"></span>
          ${CHEST_SVG}
          <span class="rc-chest-spark" aria-hidden="true">✦</span><span class="rc-chest-spark" aria-hidden="true">✦</span><span class="rc-chest-spark" aria-hidden="true">✦</span><span class="rc-chest-spark" aria-hidden="true">✦</span><span class="rc-chest-spark" aria-hidden="true">✦</span>
        </div>
        <div class="rc-chest-info" aria-live="polite">
          <p class="rc-chest-hint">Ábrelo ahora o guárdalo para más tarde.</p>
          <div class="rc-chest-prize"><span class="n"></span><span class="u"></span></div>
        </div>
        <div class="rc-chest-actions"></div>
      </div>
      <canvas class="rc-chest-fx" aria-hidden="true"></canvas>`;
    document.body.appendChild(node);
    chestNode = node;

    const $q = s => node.querySelector(s);
    const after = (ms, fn) => chestTimers.push(setTimeout(fn, ms));
    const actions = $q('.rc-chest-actions');
    const setActions = list => {
      actions.replaceChildren(...list.map(([label, act, gold]) => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'rc-chest-btn' + (gold ? ' gold' : ''); b.dataset.a = act; b.textContent = label; return b;
      }));
    };

    function ready() {
      state = 'ready'; node.classList.add('ready');
      if (auto) { setActions([]); return; }
      setActions([['🗝️ Abrir ahora', 'open', true], ['🎒 Guardar para después', 'save', false]]);
      const first = actions.querySelector('button'); if (first) first.focus({ preventScroll: true });
      if (animOn && soundOn) { chestTone(150, 1.65, .5, { type: 'sawtooth', to: 260, vol: .025 }); chestTone(240, 4.45, .45, { type: 'sawtooth', to: 130, vol: .025 }); }
    }

    function doSave() {
      if (state !== 'ready') return;
      state = 'saving'; node.classList.add('saving');
      if (soundOn) { chestTone(500, 0, .35, { type: 'triangle', to: 900, vol: .06 }); }
      after(animOn ? 720 : 200, () => {
        const n = getUser().chests;
        chestClose(true);
        toast('info', `Cofre guardado. Tienes ${n} en Bonificaciones para abrir cuando quieras.`, '🎒');
      });
    }

    function reveal(r) {
      state = 'revealed';
      node.classList.remove('opening'); node.classList.add('revealed');
      if (r.jackpot) node.classList.add('jackpot');
      $q('.rc-chest-title').textContent = r.jackpot ? '¡PREMIO GORDO!' : '¡Cofre abierto!';
      const amt = r.coins || r.xp, n = $q('.rc-chest-prize .n'), u = $q('.rc-chest-prize .u');
      u.textContent = r.coins ? 'monedas' : 'XP';
      const fmtN = v => '+' + formatNumber(Math.round(v));
      if (animOn) {
        const s0 = performance.now(), dur = Math.min(1500, 600 + Math.log10(amt + 1) * 200);
        const step = now => { const k = Math.max(0, Math.min(1, (now - s0) / dur)); n.textContent = fmtN(amt * (1 - Math.pow(1 - k, 3))); if (k < 1) chestRaf = requestAnimationFrame(step); };
        n.textContent = fmtN(0); chestRaf = requestAnimationFrame(step);
        startChestFx(r.jackpot ? 'big' : 'win', r.jackpot ? 4200 : 3000);
      } else n.textContent = fmtN(amt);
      if (soundOn) [[523, 0], [659, .1], [784, .2], [1047, .3], r.jackpot ? [1319, .42] : null, r.jackpot ? [1568, .54] : null].filter(Boolean).forEach(([f, d]) => chestTone(f, d, .26, { type: 'triangle', vol: .08 }));
      const left = getUser().chests;
      setActions([['¡Genial!', 'done', true]].concat(left > 0 ? [[`📦 Abrir otro (${left})`, 'again', false]] : []));
      const first = actions.querySelector('button'); if (first) first.focus({ preventScroll: true });
    }

    function startChestFx(kind, ms) {
      const cv = $q('.rc-chest-fx'); if (!cv) return;
      if (chestStop) chestStop();
      chestStop = startParticles(cv, kind, ms);
    }

    function doOpen() {
      if (state !== 'ready') return;
      state = 'opening'; node.classList.add('opening', 'open');
      if (soundOn) { chestTone(120, 0, .55, { type: 'sawtooth', to: 340, vol: .035 }); chestTone(70, .6, .3, { type: 'sine', to: 50, vol: .12 }); }
      after(animOn ? 760 : 150, () => {
        const r = openChest();
        if (!r) { chestClose(true); toast('info', 'Este cofre ya fue abierto.', '📦'); return; }
        reveal(r);
      });
    }

    actions.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'open') doOpen();
      else if (b.dataset.a === 'save') doSave();
      else if (b.dataset.a === 'done') chestClose();
      else if (b.dataset.a === 'again') { chestClose(true); setTimeout(() => chestShow({ autoOpen: true }), 120); }
    });
    chestKey = e => {
      if (e.key !== 'Escape') return;
      if (state === 'ready' && !auto) doSave(); else if (state === 'revealed') chestClose();
    };
    document.addEventListener('keydown', chestKey);

    if (auto) {
      after(animOn ? 650 : 100, () => { ready(); after(animOn ? 450 : 50, doOpen); });
    } else {
      if (animOn && soundOn) { chestTone(900, 0.05, .7, { type: 'triangle', to: 140, vol: .04 }); chestTone(110, .75, .35, { type: 'sine', to: 38, vol: .2 }); chestTone(95, 1.05, .2, { type: 'sine', to: 40, vol: .1 }); }
      after(animOn ? 1550 : 250, ready);
    }
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
    register, login, loginRemote, logout, recover, updateAccount, getSession, isLoggedIn, isAdmin, currentUser: cu,
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
    initHeader, toast, result, openChest, chestShow, barChart, formatNumber, signed, esc, fmtDate,
    // rutas
    ROOT, PAGES, HOME, pageFile,
    levelInfo, xpForLevel, levelReward, totalXp, todayKey, isWeekend, START_COINS,
  };
})();
