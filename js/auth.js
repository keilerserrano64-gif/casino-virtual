// auth.js — protección de rutas y formularios de login / registro / recuperar (usa RC de app.js)
(() => {
  const page = RC.pageFile();                        // 'index.html' en la portada
  const isHome = page === 'index.html';
  const go = url => { document.documentElement.style.display = 'none'; location.replace(url); };

  const GAME_PAGES = { 'tragamonedas.html': 'Tragamonedas', 'ruleta.html': 'Ruleta', 'Blackjack.html': 'Blackjack',
    'poker.html': 'Poker', 'dados.html': 'Dados', 'carreras.html': 'Carreras', 'bingo.html': 'Bingo' };

  /* ---- Protección de rutas ---- */
  if (document.body.hasAttribute('data-public')) {
    if (RC.isLoggedIn() && page !== 'recuperar.html') return go(RC.HOME);
  } else if (!RC.isLoggedIn() && !isHome) {          // la portada es pública
    return go(RC.PAGES + 'login.html');
  } else if (document.body.hasAttribute('data-admin') && !RC.isAdmin()) {
    return go(RC.HOME);
  } else if (GAME_PAGES[page] && !RC.isGameEnabled(GAME_PAGES[page]) && !RC.isAdmin()) {
    alert('Este juego está desactivado temporalmente por el administrador.');
    return go(RC.HOME);
  }

  /* ---- Formularios ---- */
  const $ = id => document.getElementById(id);
  const val = id => ($(id) ? $(id).value.trim() : '');
  const fail = (form, msg) => { const e = form.querySelector('#formError'); if (e) { e.textContent = msg; e.classList.remove('form-ok'); } };
  const okMsg = (form, msg) => { const e = form.querySelector('#formError'); if (e) { e.textContent = msg; e.classList.add('form-ok'); } };

  const fire = () => window.RCFire;
  const busy = (form, on) => form.querySelectorAll('button').forEach(b => { b.disabled = on; });

  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id = val('identificador'), pass = $('password').value, remember = $('recordarme').checked;
    if (!id || !pass) return fail(loginForm, 'Completa todos los campos.');
    busy(loginForm, true);
    try {
      const local = RC.getAccounts().find(a => a.username.toLowerCase() === id.toLowerCase() || a.email.toLowerCase() === id.toLowerCase());
      if (fire() && !(local && local.role === 'admin')) {      // el admin de ejemplo sigue siendo local
        const email = id.includes('@') ? id : (local ? local.email : await fire().emailOf(id));
        if (!email) return fail(loginForm, 'Usuario o contraseña incorrectos.');
        const c = await fire().signIn(email, pass);
        if (!c.ok) return fail(loginForm, c.error);
        RC.adoptAccount(c.meta, pass);
        id2 = c.meta.username;
      } else id2 = id;
      const r = RC.login(id2, pass, remember);
      if (!r.ok) return fail(loginForm, r.error);
      location.href = RC.HOME;
    } finally { busy(loginForm, false); }
  });
  let id2 = '';

  const regForm = document.querySelector('form[data-form="registro"]');
  if (regForm) regForm.addEventListener('submit', async e => {
    e.preventDefault();
    if ($('password').value !== $('password2').value) return fail(regForm, 'Las contraseñas no coinciden.');
    if (!$('acepto').checked) return fail(regForm, 'Debes aceptar que las monedas son ficticias.');
    const d = { name: val('nombre'), username: val('usuario'), email: val('correo'), password: $('password').value };
    const r = RC.register(d);
    if (!r.ok) return fail(regForm, r.error);
    busy(regForm, true);
    try {
      if (fire()) {
        const c = await fire().signUp(d);
        if (!c.ok) { RC.deleteAccount(d.username); return fail(regForm, c.error); }
      }
      RC.login(r.username, d.password, false);
      if (fire()) fire().pushAll();
      location.href = RC.HOME;
    } finally { busy(regForm, false); }
  });

  const recForm = document.querySelector('form[data-form="recuperar"]');
  if (recForm) recForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!fire()) return fail(recForm, 'Firebase no está disponible.');
    busy(recForm, true);
    const r = await fire().reset(val('correo'));
    busy(recForm, false);
    if (!r.ok) return fail(recForm, r.error);
    okMsg(recForm, 'Si el correo existe, te enviamos un enlace para cambiar la contraseña.');
  });
})();
