// configuracion.js — lógica de configuracion.html (usa RC de app.js)
RC.initHeader();

const $ = id => document.getElementById(id);
const s = RC.getSettings();

/* Preferencias: se guardan y se aplican al instante */
$('theme').value = s.theme;
$('lang').value = s.lang;
$('prefSound').checked = s.sound;
$('prefAnim').checked = s.anim;
$('prefNotif').checked = s.notif;

$('theme').addEventListener('change', e => RC.saveSettings({ theme: e.target.value }));
$('lang').addEventListener('change', e => { RC.saveSettings({ lang: e.target.value }); RC.toast('info', 'Idioma guardado.'); });
$('prefSound').addEventListener('change', e => RC.saveSettings({ sound: e.target.checked }));
$('prefAnim').addEventListener('change', e => RC.saveSettings({ anim: e.target.checked }));
$('prefNotif').addEventListener('change', e => RC.saveSettings({ notif: e.target.checked }));

/* Cuenta: cambiar usuario y/o contraseña (exige la contraseña actual) */
const form = document.querySelector('form[data-form="cuenta"]');
const msg = (text, ok) => { const e = $('formError'); e.textContent = text; e.classList.toggle('form-ok', !!ok); };

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.dataset.busy) return;
  const me = RC.currentUser();
  let newUser = $('newUser').value.trim();
  const newPass = $('newPass').value;
  if (newUser.toLowerCase() === String(me).toLowerCase()) newUser = '';    // solo cambia mayúsculas: no es un cambio de usuario
  if (!newUser && !newPass) return msg('Escribe un usuario o una contraseña nueva.');
  if (!$('oldPass').value) return msg('Escribe tu contraseña actual.');
  if (newPass && newPass !== $('newPass2').value) return msg('Las contraseñas nuevas no coinciden.');
  if (!confirm('¿Guardar los cambios de tu cuenta?')) return;

  // Con la cuenta en la nube no se puede renombrar: se avisa antes de cambiar nada (evita dejar la contraseña a medias)
  if (newUser && window.RCFire) return msg('El cambio de nombre de usuario no está disponible con la cuenta en la nube.');

  form.dataset.busy = '1';
  try {
    // 1) Firebase: comprueba la contraseña actual y guarda la nueva. Si la cuenta solo existe en este navegador
    //    (admin de ejemplo, cuentas antiguas) no hay sesión en la nube (notSignedIn) y se sigue solo en local.
    let trusted = false;
    if (newPass && window.RCFire) {
      const c = await RCFire.changePassword($('oldPass').value, newPass);
      if (c.ok) trusted = true;
      else if (!c.notSignedIn) return msg(c.error);
    }
    // 2) Copia local (sesión, datos del jugador)
    const r = RC.updateAccount({ newUser, oldPass: $('oldPass').value, newPass, trusted });
    if (!r.ok) return msg(r.error);
    form.reset();
    msg('Cambios guardados.', true);
    RC.initHeader();
  } finally { form.dataset.busy = ''; }
});

$('logoutBtn').addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) RC.logout(); });
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Esto borrará tus monedas, nivel, historial y logros. ¿Continuar?')) return;
  RC.resetAccount();
  RC.toast('info', 'Cuenta reiniciada.');
  RC.initHeader();
});
