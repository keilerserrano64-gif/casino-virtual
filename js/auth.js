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

  // Evita envíos dobles mientras se espera a la base de datos
  const busy = (form, on) => {
    form.dataset.busy = on ? '1' : '';
    const b = form.querySelector('button[type="submit"]'); if (b) b.disabled = on;
  };
  const sinBD = form => fail(form, 'No se pudo cargar el módulo de la base de datos. Recarga la página.');

  /* LOGIN: primero se valida contra Firebase (usuarios registrados). Si la cuenta no existe allí
     (admin de ejemplo, cuentas antiguas creadas solo en el navegador) o no hay conexión, se usa la cuenta local. */
  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (loginForm.dataset.busy) return;
    const id = val('identificador'), pass = $('password').value, remember = $('recordarme').checked;
    if (!id || !pass) return fail(loginForm, 'Completa todos los campos.');

    busy(loginForm, true);
    try {
      const remoto = window.RCRemote ? await RCRemote.login(id, pass) : { ok: false, network: true, error: 'No se pudo cargar el módulo de la base de datos.' };

      if (remoto.ok) {
        const r = RC.loginRemote(remoto.account, pass, remember);
        if (!r.ok) return fail(loginForm, r.error);
        return void (location.href = RC.HOME);
      }
      if (remoto.banned || remoto.noPassword) return fail(loginForm, remoto.error);

      const local = RC.login(id, pass, remember);
      if (!local.ok) {
        if (remoto.network) return fail(loginForm, remoto.error);
        const hayLocal = !!RC.getAccounts().find(x => [x.username, x.email].some(v => String(v).toLowerCase() === id.toLowerCase()));
        return fail(loginForm, remoto.notFound && !hayLocal ? 'No existe ninguna cuenta con ese usuario o correo.' : local.error);
      }

      // Cuenta antigua que solo existía en este navegador: se copia a la base de datos para que la contraseña quede guardada allí
      if (window.RCRemote && remoto.notFound) {
        const me = RC.getAccounts().find(a => a.username.toLowerCase() === String(RC.currentUser()).toLowerCase());
        if (me && me.role !== 'admin') {
          await RCRemote.register({ name: me.name, username: me.username, email: me.email, password: pass, saldo: RC.getUser(me.username).coins });
        }
      }
      location.href = RC.HOME;
    } finally { busy(loginForm, false); }
  });

  /* REGISTRO: crea la cuenta en Firebase (usuario + salt + hash de la contraseña). */
  const regForm = document.querySelector('form[data-form="registro"]');
  if (regForm) regForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (regForm.dataset.busy) return;
    if (!window.RCRemote) return sinBD(regForm);
    if ($('password').value !== $('password2').value) return fail(regForm, 'Las contraseñas no coinciden.');
    if (!$('acepto').checked) return fail(regForm, 'Debes aceptar que las monedas son ficticias.');

    busy(regForm, true);
    okMsg(regForm, 'Creando tu cuenta...');
    const r = await RCRemote.register({ name: val('nombre'), username: val('usuario'), email: val('correo'), password: $('password').value });
    if (!r.ok) { busy(regForm, false); return fail(regForm, r.error); }
    okMsg(regForm, '¡Cuenta creada! Recibiste 10.000 monedas virtuales. Redirigiendo al inicio de sesión...');
    setTimeout(() => { location.href = RC.PAGES + 'login.html'; }, 1500);
  });

  /* RECUPERAR: cambia la contraseña en Firebase y, si la cuenta también existe en este navegador, en local. */
  const recForm = document.querySelector('form[data-form="recuperar"]');
  if (recForm) recForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (recForm.dataset.busy) return;
    if ($('password').value !== $('password2').value) return fail(recForm, 'Las contraseñas no coinciden.');

    busy(recForm, true);
    try {
      const remoto = window.RCRemote ? await RCRemote.recover(val('correo'), $('password').value) : { ok: false, network: true, error: 'No se pudo cargar el módulo de la base de datos.' };
      if (remoto.network) return fail(recForm, remoto.error);          // sin conexión: no se cambia nada para no desincronizar
      const local = RC.recover(val('correo'), $('password').value);     // mantiene la copia local en sincronía (o recupera cuentas antiguas)

      if (remoto.ok || local.ok) {
        okMsg(recForm, 'Contraseña cambiada. Redirigiendo al inicio de sesión...');
        return void setTimeout(() => { location.href = RC.PAGES + 'login.html'; }, 1500);
      }
      fail(recForm, remoto.error || local.error);
    } finally { busy(recForm, false); }
  });
})();
