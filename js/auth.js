// auth.js — protección de rutas y formularios de login / registro / recuperar (usa RC de app.js y RCRemote de firebase_auth.js: cuentas en Firebase Realtime Database)
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

  // Evita envíos dobles mientras se espera a Firebase
  const busy = (form, on) => { form.dataset.busy = on ? '1' : ''; form.querySelectorAll('button').forEach(b => { b.disabled = on; }); };
  // Ninguna llamada a Firebase puede dejar el formulario esperando para siempre
  const limit = (p, ms = 20000) => Promise.race([p, new Promise(res => setTimeout(() => res({ ok: false, network: true,
    error: 'Firebase no respondió a tiempo. Revisa tu conexión.' }), ms))]);

  /* LOGIN: primero Firebase (cuentas registradas). El admin de ejemplo solo existe en memoria: si Firebase dice
     que la cuenta no existe (o no hay conexión) se prueba la cuenta local. */
  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (loginForm.dataset.busy) return;
    const id = val('identificador'), pass = $('password').value;
    if (!id || !pass) return fail(loginForm, 'Completa todos los campos.');
    busy(loginForm, true); fail(loginForm, '');
    try {
      const c = window.RCRemote ? await limit(RCRemote.login(id, pass)) : { ok: false, network: true, error: 'Firebase no está disponible.' };
      if (c.ok) {
        const r = RC.adoptAccount(c.account);
        if (!r.ok) return fail(loginForm, r.error);
        return void (location.href = RC.HOME);
      }
      if (!c.notFound && !c.network) return fail(loginForm, c.error);          // contraseña incorrecta, cuenta bloqueada...
      const l = RC.login(id, pass);                                             // admin de ejemplo (o sin conexión)
      if (!l.ok) return fail(loginForm, c.network ? c.error : l.error);
      location.href = RC.HOME;
    } catch (err) {
      console.error('login:', err);
      fail(loginForm, 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally { busy(loginForm, false); }
  });

  /* REGISTRO: crea usuarios/{id} y correos/{correo} en Firebase y abre sesión. */
  const regForm = document.querySelector('form[data-form="registro"]');
  if (regForm) regForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (regForm.dataset.busy) return;
    if ($('password').value !== $('password2').value) return fail(regForm, 'Las contraseñas no coinciden.');
    if (!$('acepto').checked) return fail(regForm, 'Debes aceptar que las monedas son ficticias.');
    const d = { name: val('nombre'), username: val('usuario'), email: val('correo'), password: $('password').value };
    busy(regForm, true); okMsg(regForm, 'Creando tu cuenta...');
    try {
      if (!window.RCRemote) return fail(regForm, 'Firebase no está disponible.');
      const c = await limit(RCRemote.register(d));
      if (!c.ok) return fail(regForm, c.error);
      const r = RC.adoptAccount({ username: c.username, name: d.name, email: d.email.toLowerCase(), role: 'user' });
      if (!r.ok) return fail(regForm, r.error);
      location.href = RC.HOME;
    } catch (err) {
      console.error('registro:', err);
      fail(regForm, 'No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally { busy(regForm, false); }
  });

  /* RECUPERAR: no hay servidor de correo, así que se guarda directamente la contraseña nueva (salt + hash). */
  const recForm = document.querySelector('form[data-form="recuperar"]');
  if (recForm) recForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (recForm.dataset.busy) return;
    busy(recForm, true);
    try {
      if (!window.RCRemote) return fail(recForm, 'Firebase no está disponible.');
      const r = await limit(RCRemote.recover(val('correo'), $('nuevaPassword').value), 15000);
      if (!r.ok) return fail(recForm, r.notFound ? 'No existe ninguna cuenta con ese correo.' : r.error);
      okMsg(recForm, 'Contraseña cambiada. Ya puedes iniciar sesión.');
    } finally { busy(recForm, false); }
  });
})();
