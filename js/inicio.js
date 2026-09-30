// inicio.js — portada estilo Las Vegas (usa RC de app.js). El inicio es público: sin sesión muestra Registrarse / Iniciar sesión.
(() => {
  RC.initHeader('lv-legacy');                       // conserva ajustes y "en línea"; se usa el header propio
  const wrap = document.getElementById('rc-toast-wrap'); if (wrap) document.body.appendChild(wrap);
  const legacy = document.getElementById('lv-legacy'); if (legacy) legacy.remove();

  const $ = id => document.getElementById(id);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => RC.formatNumber(n);
  const logged = RC.isLoggedIn();

  /* ---- Sesión: botones de usuario o de registro ---- */
  $('lvUser').hidden = !logged; $('lvGuest').hidden = logged;
  if (logged) {
    RC.saveUser(RC.getUser());                      // refresca monedas y nivel
    const n = RC.unreadCount(), b = $('lvBell'); if (n) { b.textContent = n > 9 ? '9+' : n; b.hidden = false; }
    $('lvLogout').addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) RC.logout(); });
    const cta = document.querySelector('[data-guest]');
    if (cta) { cta.href = RC.PAGES + 'bonificasiones.html'; cta.firstElementChild.textContent = 'Reclamar bono'; }
  }

  /* ---- Sonido (opcional, con silenciar) ---- */
  let ctx = null, soundOn = RC.getSettings().sound !== false;
  const sBtn = $('lvSound');
  const paintSound = () => { sBtn.textContent = soundOn ? '🔊' : '🔇'; sBtn.setAttribute('aria-pressed', soundOn); sBtn.title = soundOn ? 'Silenciar' : 'Activar sonido'; };
  paintSound();
  sBtn.addEventListener('click', () => { soundOn = !soundOn; RC.saveSettings({ sound: soundOn }); paintSound(); if (soundOn) coin(); });
  function coin() {                                 // tintineo de monedas sintetizado; solo suena tras una interacción del usuario
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (ctx.state !== 'running') return;
      [1318, 1760, 2093].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .08;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .35);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + .4);
      });
    } catch (e) { /* sin audio */ }
  }
  document.addEventListener('click', e => { if (e.target.closest('.lv-slotbtn, .lv-tile')) coin(); }, true);

  /* ---- Jackpots en vivo: suben cada instante; se calculan según el reloj, así continúan entre visitas ---- */
  const JACKS = [
    { id: 'mega', name: 'MEGA JACKPOT', base: 1250000, range: 900000, rate: 37.5 },
    { id: 'major', name: 'MAJOR', base: 84000, range: 60000, rate: 6.8 },
    { id: 'minor', name: 'MINOR', base: 12500, range: 9000, rate: 1.9 },
    { id: 'mini', name: 'MINI', base: 2400, range: 1800, rate: 0.6 },
  ];
  $('lvJackpots').innerHTML = JACKS.map(j => `<div class="lv-jack ${j.id}"><h3>${j.name}</h3><span class="amt" id="jk-${j.id}">0</span><span class="unit">monedas virtuales</span></div>`).join('');
  const T0 = Date.UTC(2026, 0, 1) / 1000;
  const tickJack = () => { const t = Date.now() / 1000 - T0; JACKS.forEach(j => { $('jk-' + j.id).textContent = fmt(j.base + (t * j.rate) % j.range); }); };
  tickJack(); setInterval(tickJack, 150);

  /* ---- Casino en vivo: mesas VIP con crupier virtual ---- */
  const on = g => RC.isGameEnabled(g);             // solo se muestran los juegos que el administrador tiene activos
  const VIP = [['Blackjack', 'Blackjack VIP', '#0d5a36', '🃏', RC.PAGES + 'Blackjack.html', 5], ['Ruleta', 'Ruleta Europea VIP', '#7a0f22', '🎡', RC.PAGES + 'ruleta.html', 7], ['Poker', 'Póker Royal', '#0d3f6a', '♠️', RC.PAGES + 'poker.html', 4]].filter(v => on(v[0]));
  $('lvVip').innerHTML = VIP.map(([, t, felt, ico, href, seats], i) => `<article class="lv-vip"><div class="lv-table" style="--felt:${felt}">
      <div class="badge"><span class="lv-live"><i></i>EN VIVO</span></div><span class="vip-tag">VIP</span><div class="lv-dealer" aria-hidden="true">🤵</div><span class="tico" aria-hidden="true">${ico}</span></div>
    <div class="lv-vip-body"><div><b>${t}</b><small><span id="vp-${i}">${seats * 3}</span> jugadores · crupier virtual</small></div><a class="lv-slotbtn lv-gold" href="${href}"><span>Unirse</span></a></div></article>`).join('');
  const seats = VIP.map(v => v[5] * 3);
  setInterval(() => VIP.forEach((_, i) => { seats[i] = Math.max(3, seats[i] + (Math.random() < .5 ? -1 : 1)); const e = $('vp-' + i); if (e) e.textContent = seats[i]; }), 3500);

  /* ---- Jugadores activos y ganadores en tiempo real (datos reales de las cuentas de este navegador) ---- */
  const me = RC.currentUser();
  const mask = u => u === me ? 'Tú' : (u.length <= 2 ? u[0] : u.slice(0, 2)).replace(/^./, c => c.toUpperCase()) + '***';
  const ago = ts => { const s = Math.max(0, Math.round((Date.now() - ts) / 1000)); return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`; };
  const nowList = $('lvNowList'), winList = $('lvWinList');
  const seen = new Set(RC.liveWins(40).map(w => w.ts)); let first = true, sig = '';

  function renderLive() {
    const players = RC.playersNow();
    $('lvNowCount').textContent = players.length;
    nowList.innerHTML = players.length ? players.slice(0, 8).map(p =>
      `<div class="lv-now"><i></i><b>${RC.esc(mask(p.name))}</b><span>${p.game ? 'jugando ' + RC.esc(p.game) : 'en el lobby'}</span></div>`).join('')
      : '<div class="lv-empty">Nadie conectado ahora mismo.</div>';

    const wins = RC.liveWins(7);
    winList.innerHTML = wins.length ? wins.map(w =>
      `<div class="lv-win ${seen.has(w.ts) ? '' : 'new'}"><span class="amt">+${fmt(w.amount)}</span>${RC.esc(mask(w.user))} · ${RC.esc(w.game)}<time>${ago(w.ts)}</time></div>`).join('')
      : '<div class="lv-empty">Aún no hay premios de jugadores activos. ¡Sé el primero!</div>';
    if (!first && wins.some(w => !seen.has(w.ts))) coin();          // tintineo cuando entra un premio nuevo
    wins.forEach(w => seen.add(w.ts)); first = false;

    // cinta superior: solo se reconstruye si cambian los premios (evita reiniciar el desplazamiento)
    const s2 = wins.map(w => w.ts).join(',');
    if (s2 !== sig) {
      sig = s2;
      const items = wins.length ? wins.map(w => `<span>🎰 <b>${RC.esc(mask(w.user))}</b> acaba de ganar <b>${fmt(w.amount)}</b> monedas en ${RC.esc(w.game)}</span>`).join('')
        : '<span>🎰 Los premios de los jugadores activos aparecerán aquí en tiempo real</span>';
      const rep = items.repeat(wins.length > 2 ? 2 : 6);
      $('lvTicker').innerHTML = rep;
    }
  }
  function renderFriends() {
    if (!logged) return;
    $('lvFriendsBox').hidden = false;
    const fr = RC.friendsStatus(), req = RC.getSocial().incoming.length;
    $('lvFrCount').textContent = fr.filter(f => f.online).length;
    $('lvFriends').innerHTML = fr.length ? fr.map(f => `<div class="lv-now"><i style="${f.online ? '' : 'background:#6b6b6b;box-shadow:none'}"></i><b>${RC.esc(f.name)}</b><span>${f.online ? (f.game ? 'jugando ' + RC.esc(f.game) : 'en línea') : 'desconectado'}</span></div>`).join('')
      : '<div class="lv-empty">Aún no tienes amigos.</div>';
    const bd = $('lvFrBadge'); bd.textContent = req; bd.hidden = !req;
  }
  const renderAll = () => { renderLive(); renderFriends(); };
  renderAll();
  setInterval(renderAll, 3000);                                     // refresco continuo
  window.addEventListener('storage', renderAll);                    // otras pestañas: actualización inmediata

  /* ---- Carrusel ---- */
  const slides = [...document.querySelectorAll('.lv-slide')], dots = $('lvDots');
  let cur = 0, timer;
  dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Diapositiva ${i + 1}"></button>`).join('');
  const db = [...dots.children];
  const show = i => { cur = (i + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('is-on', k === cur)); db.forEach((d, k) => d.classList.toggle('on', k === cur)); };
  const auto = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(cur + 1), 6500); };
  db.forEach((d, k) => d.addEventListener('click', () => { show(k); auto(); }));
  document.querySelector('.lv-prev').addEventListener('click', () => { show(cur - 1); auto(); });
  document.querySelector('.lv-next').addEventListener('click', () => { show(cur + 1); auto(); });
  show(0); auto();
})();
