// auth.js — protección de rutas y formularios de login / registro / recuperar (usa RC de app.js y RCFire de firebase.js)
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
  const busy = (form, on) => {
    form.dataset.busy = on ? '1' : '';
    form.querySelectorAll('button').forEach(b => { b.disabled = on; });
  };

  // firebase.js es un módulo ES (carga diferida): se espera a que exista window.RCFire.
  // Con file:// los módulos no cargan, así que ahí se trabaja solo con las cuentas locales.
  const fireReady = (ms = 5000) => new Promise(resolve => {
    if (window.RCFire) return resolve(window.RCFire);
    if (location.protocol === 'file:') return resolve(null);
    const t0 = Date.now();
    (function wait() {
      if (window.RCFire) return resolve(window.RCFire);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(wait, 100);
    })();
  });

  // Ninguna llamada a Firebase puede dejar el formulario esperando para siempre
  const limit = (p, ms = 20000) => Promise.race([p, new Promise(res => setTimeout(() => res({ ok: false, network: true,
    error: 'Firebase no respondió a tiempo. Revisa tu conexión y que Authentication y Firestore estén creados y activos en la consola de Firebase.' }), ms))]);

  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* LOGIN: primero Firebase (cuentas registradas). Si la cuenta no existe en la nube (admin de ejemplo,
     cuentas antiguas creadas solo en este navegador) o Firebase no está disponible, se usa la cuenta local. */
  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (loginForm.dataset.busy) return;
    const id = val('identificador'), pass = $('password').value, remember = !!($('recordarme') && $('recordarme').checked);
    if (!id || !pass) return fail(loginForm, 'Completa todos los campos.');

    busy(loginForm, true);
    fail(loginForm, '');
    try {
      const f = await fireReady();
      const idl = id.toLowerCase();
      const local = RC.getAccounts().find(a => [a.username, a.email].some(v => String(v || '').toLowerCase() === idl));

      let nubeError = null;                          // error de Firebase que se muestra si no hay cuenta local de respaldo
      let nubeRed = false;                           // true si el fallo fue de conexión/configuración (no de credenciales)
      if (f) {
        let email = null;
        try { email = idl.includes('@') ? idl : ((local && local.email) || await f.emailOf(id)); } catch (err) { nubeRed = true; }
        if (email && /\.local$/i.test(email)) email = null;   // admin de ejemplo: solo existe en el navegador

        if (email) {
          const c = await limit(f.signIn(email, pass));
          if (c.ok) {
            const r = RC.loginRemote({ username: c.meta.username, name: c.meta.name, email: c.meta.email || email,
              role: c.admin ? 'admin' : 'user' }, pass, remember);
            if (!r.ok) { await f.signOut(); return fail(loginForm, r.error); }
            return void (location.href = RC.HOME);
          }
          nubeError = c.error; nubeRed = !!c.network;
          if (!nubeRed) return fail(loginForm, c.error);       // contraseña incorrecta, cuenta bloqueada, etc.
        }
      }

      // Cuenta local (admin, cuentas antiguas) o respaldo si Firebase no responde
      const l = RC.login(id, pass, remember);
      if (!l.ok) return fail(loginForm, nubeRed && nubeError && !local ? nubeError : l.error);
      location.href = RC.HOME;
    } catch (err) {
      console.error('login:', err);
      fail(loginForm, 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally { busy(loginForm, false); }
  });

  /* REGISTRO: valida en local y crea la cuenta en Firebase (Authentication + reserva de usuario). */
  const regForm = document.querySelector('form[data-form="registro"]');
  if (regForm) regForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (regForm.dataset.busy) return;
    if ($('password').value !== $('password2').value) return fail(regForm, 'Las contraseñas no coinciden.');
    if (!$('acepto').checked) return fail(regForm, 'Debes aceptar que las monedas son ficticias.');

    const d = { name: val('nombre'), username: val('usuario'), email: val('correo'), password: $('password').value };
    busy(regForm, true);
    okMsg(regForm, 'Creando tu cuenta...');
    try {
      const f = await fireReady();
      const r = RC.register(d);
      if (!r.ok) return fail(regForm, r.error);
      if (f) {
        const c = await limit(f.signUp(d));
        if (!c.ok) { RC.discardLocalAccount(d.username); return fail(regForm, c.error); }
      }
      RC.login(r.username, d.password, false);
      if (f) await Promise.race([f.pushAll().catch(() => {}), new Promise(r => setTimeout(r, 5000))]);   // sube datos iniciales (máx. 5 s)
      location.href = RC.HOME;
    } catch (err) {
      console.error('registro:', err);
      fail(regForm, 'No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally { busy(regForm, false); }
  });

  /* RECUPERAR: Firebase envía un enlace al correo para crear una contraseña nueva. */
  const recForm = document.querySelector('form[data-form="recuperar"]');
  if (recForm) recForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (recForm.dataset.busy) return;
    const correo = val('correo');
    if (!RE_CORREO.test(correo)) return fail(recForm, 'Correo no válido.');

    busy(recForm, true);
    try {
      const f = await fireReady();
      if (!f) return fail(recForm, 'Firebase no está disponible. Abre el sitio con http(s):// (Live Server, hosting) y revisa tu conexión.');
      const r = await limit(f.reset(correo), 15000);
      if (!r.ok) return fail(recForm, r.error);
      okMsg(recForm, 'Si el correo existe, te enviamos un enlace para cambiar la contraseña.');
    } finally { busy(recForm, false); }
  });
})();
