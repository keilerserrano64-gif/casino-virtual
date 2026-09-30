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

  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) loginForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!val('identificador') || !$('password').value) return fail(loginForm, 'Completa todos los campos.');
    const r = RC.login(val('identificador'), $('password').value, $('recordarme').checked);
    if (!r.ok) return fail(loginForm, r.error);
    location.href = RC.HOME;
  });

  const regForm = document.querySelector('form[data-form="registro"]');
  if (regForm) regForm.addEventListener('submit', e => {
    e.preventDefault();
    if ($('password').value !== $('password2').value) return fail(regForm, 'Las contraseñas no coinciden.');
    if (!$('acepto').checked) return fail(regForm, 'Debes aceptar que las monedas son ficticias.');
    const r = RC.register({ name: val('nombre'), username: val('usuario'), email: val('correo'), password: $('password').value });
    if (!r.ok) return fail(regForm, r.error);
    RC.login(r.username, $('password').value, false);
    location.href = RC.HOME;
  });

  const recForm = document.querySelector('form[data-form="recuperar"]');
  if (recForm) recForm.addEventListener('submit', e => {
    e.preventDefault();
    if ($('password').value !== $('password2').value) return fail(recForm, 'Las contraseñas no coinciden.');
    const r = RC.recover(val('correo'), $('password').value);
    if (!r.ok) return fail(recForm, r.error);
    okMsg(recForm, 'Contraseña cambiada. Redirigiendo al inicio de sesión...');
    setTimeout(() => { location.href = RC.PAGES + 'login.html'; }, 1500);
  });
})();
