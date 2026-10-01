// ayuda.js — ayuda.html: barra superior como el inicio, una pregunta abierta a la vez y buscador que filtra al escribir
(() => {
  RC.initHeader('lv-legacy');                       // conserva ajustes y "en línea"; se usa el header propio del inicio
  const wrap = document.getElementById('rc-toast-wrap'); if (wrap) document.body.appendChild(wrap);
  const legacy = document.getElementById('lv-legacy'); if (legacy) legacy.remove();

  const $ = id => document.getElementById(id);

  /* ---- Sesión: monedas, nivel, notificaciones ---- */
  RC.saveUser(RC.getUser());                        // refresca monedas y nivel
  const n = RC.unreadCount(), bell = $('lvBell');
  if (n) { bell.textContent = n > 9 ? '9+' : n; bell.hidden = false; }
  $('lvLogout').addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) RC.logout(); });

  /* ---- Sonido (igual que el inicio) ---- */
  let ctx = null, soundOn = RC.getSettings().sound !== false;
  const sBtn = $('lvSound');
  const paintSound = () => { sBtn.textContent = soundOn ? '🔊' : '🔇'; sBtn.setAttribute('aria-pressed', soundOn); sBtn.title = soundOn ? 'Silenciar' : 'Activar sonido'; };
  paintSound();
  function coin() {
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
  sBtn.addEventListener('click', () => { soundOn = !soundOn; RC.saveSettings({ sound: soundOn }); paintSound(); if (soundOn) coin(); });
  document.addEventListener('click', e => { if (e.target.closest('.lv-slotbtn, .lv-topic')) coin(); }, true);

  /* ---- Preguntas: abre una a la vez ---- */
  const items = [...document.querySelectorAll('.faq details')];
  const groups = [...document.querySelectorAll('.faq-group')];
  const topics = $('faqTopics'), search = $('faqSearch'), none = $('faqNone'), term = $('faqTerm');

  items.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
  }));

  // Quita tildes y mayúsculas para que «contrasena» encuentre «contraseña»
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function filter() {
    const q = norm(search.value.trim());
    let shown = 0, last = null;
    items.forEach(d => {
      const match = !q || norm(d.textContent).includes(q);
      d.hidden = !match;
      if (match) { shown++; last = d; }
    });
    groups.forEach(g => { g.hidden = ![...g.querySelectorAll('details')].some(d => !d.hidden); });
    topics.hidden = !!q;                              // al buscar, se ocultan las tarjetas de tema
    none.hidden = shown > 0;
    term.textContent = search.value.trim();
    if (q && shown === 1) last.open = true;           // un único resultado: se muestra la respuesta directamente
  }
  search.addEventListener('input', filter);
})();
