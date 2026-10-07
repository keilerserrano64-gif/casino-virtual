/* ============================================================
   firebase_auth.js — credenciales de usuario en Firebase Realtime Database.
   Lo usan registro, login, recuperar contraseña y Configuración.

   Estructura en la base de datos (la misma que ya usaba registro.html):
     usuarios/{usuario en minúsculas} -> { nombre, usuario, correo, salt, hash,
                                           saldo_billetera, rol, baneado, fecha_registro }
     correos/{correo codificado}      -> usuario en minúsculas (índice para login/recuperar)

   La contraseña NUNCA se guarda en texto plano: se guarda `salt` (aleatorio, 16 bytes)
   y `hash` = SHA-256(salt + ':' + contraseña). Para comprobar un login se recalcula
   el hash con el salt guardado y se compara.

   Es un script clásico (no módulo) que carga el SDK de Firebase con import() dinámico,
   así funciona igual con Live Server, hosting estático o abriendo el archivo con doble clic.
   Expone window.RCRemote. Todas las funciones devuelven { ok, ... } y no lanzan errores:
     - notFound: true  -> la cuenta no existe en Firebase
     - network: true   -> no se pudo hablar con la base de datos (sin conexión, reglas, etc.)
   ============================================================ */
(() => {
  'use strict';

  const FB_URL = 'https://www.gstatic.com/firebasejs/13.0.0/';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA60wNSk5UDdKdRiX7IdTcvm9wUJvYgzQE',
    authDomain: 'royal--casino.firebaseapp.com',
    databaseURL: 'https://royal--casino-default-rtdb.firebaseio.com',
    projectId: 'royal--casino',
    storageBucket: 'royal--casino.firebasestorage.app',
    messagingSenderId: '569261854142',
    appId: '1:569261854142:web:30e21745a2d0bde0733def'
  };

  const SALDO_INICIAL = 10000;
  const RESERVADOS = ['admin'];                       // la cuenta admin de ejemplo vive solo en memoria
  const RE_USUARIO = /^[a-zA-Z0-9_]{3,18}$/;
  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MSG_CREDENCIALES = 'Usuario o contraseña incorrectos.';
  const MSG_BANEADO = 'Tu cuenta está bloqueada. Contacta con soporte.';
  const MSG_SIN_CLAVE = 'Esta cuenta existe pero no tiene contraseña guardada. Usa «¿Olvidaste tu contraseña?» con tu correo para crear una.';
  const ID_VALIDO_FB = id => id !== '' && !/[.$#\[\]\/]/.test(id);          // caracteres que Firebase no admite en una clave
  const tieneClave = u => !!(u && u.salt && u.hash);

  /* ---------- Conexión (se carga solo la primera vez que hace falta) ---------- */

  let backend = null;
  function cargarFirebase() {
    if (!backend) {
      backend = (async () => {
        const [appM, dbM] = await Promise.all([import(FB_URL + 'firebase-app.js'), import(FB_URL + 'firebase-database.js')]);
        return {
          ref: dbM.ref, get: dbM.get, set: dbM.set, update: dbM.update, remove: dbM.remove,
          runTransaction: dbM.runTransaction, db: dbM.getDatabase(appM.initializeApp(FIREBASE_CONFIG))
        };
      })();
      backend.catch(() => { backend = null; });       // si falla la carga, se reintenta en la próxima operación
    }
    return backend;
  }
  const useBackend = fake => { backend = Promise.resolve(fake); };   // para pruebas (tests/firebase_auth.test.js)

  /* ---------- Contraseñas: salt + hash ---------- */

  const aHex = bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  function nuevoSalt() { const a = new Uint8Array(16); crypto.getRandomValues(a); return aHex(a); }
  async function hashPassword(password, salt) {
    if (!(globalThis.crypto && crypto.subtle)) throw new Error('SIN_CRYPTO');
    const datos = new TextEncoder().encode(salt + ':' + password);
    return aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', datos)));
  }
  const coincide = async (password, u) => !!(u && u.salt && u.hash) && (await hashPassword(password || '', u.salt)) === u.hash;

  // Las claves de Firebase no pueden contener . $ # [ ] /  -> se codifica el correo
  const claveCorreo = correo => encodeURIComponent(correo).replace(/\./g, '%2E');

  function fallo(error) {
    console.error('[RCRemote]', error);
    const msg = String((error && (error.code || error.message)) || '').toLowerCase();
    let texto = 'No se pudo conectar con la base de datos. Revisa tu conexión e inténtalo de nuevo.';
    if (msg.includes('sin_crypto')) texto = 'Abre el sitio con http://localhost o HTTPS para poder continuar.';
    else if (msg.includes('permission')) texto = 'La base de datos rechazó la operación. Revisa las reglas de Firebase.';
    return { ok: false, network: true, error: texto };
  }

  /* ---------- Registro ---------- */

  async function register({ name, username, email, password, saldo }) {
    const nombre = String(name || '').trim();
    const usuario = String(username || '').trim();
    const correo = String(email || '').trim().toLowerCase();
    password = String(password || '');

    if (nombre.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
    if (!RE_USUARIO.test(usuario)) return { ok: false, error: 'El usuario debe tener 3-18 caracteres (letras, números o _).' };
    if (!RE_CORREO.test(correo)) return { ok: false, error: 'Correo no válido.' };
    if (password.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    const id = usuario.toLowerCase();
    if (RESERVADOS.includes(id)) return { ok: false, error: 'Ese usuario ya existe.' };

    try {
      const f = await cargarFirebase();
      const refCorreo = f.ref(f.db, 'correos/' + claveCorreo(correo));
      const refUsuario = f.ref(f.db, 'usuarios/' + id);

      // 1) Reserva el correo de forma atómica (si ya es de otra cuenta, se cancela)
      const rc = await f.runTransaction(refCorreo, actual => (actual === null ? id : undefined));
      if (!rc.committed) {
        const dueno = rc.snapshot.val();
        const sd = dueno && ID_VALIDO_FB(String(dueno)) ? await f.get(f.ref(f.db, 'usuarios/' + dueno)) : null;
        if (sd && sd.exists()) return { ok: false, error: tieneClave(sd.val()) ? 'Ese correo ya está registrado. Inicia sesión.' : MSG_SIN_CLAVE };
        await f.set(refCorreo, id);                   // índice huérfano de un intento anterior: se reutiliza
      }

      // 2) Crea el usuario con salt + hash (nunca la contraseña en claro)
      const salt = nuevoSalt();
      const datos = {
        nombre, usuario, correo, salt,
        hash: await hashPassword(password, salt),
        saldo_billetera: Number.isFinite(saldo) ? saldo : SALDO_INICIAL,
        rol: 'user',
        baneado: false,
        fecha_registro: new Date().toISOString()
      };
      let ru;
      try { ru = await f.runTransaction(refUsuario, actual => (actual === null ? datos : undefined)); }
      catch (e) { await f.remove(refCorreo).catch(() => {}); throw e; }
      if (!ru.committed) {
        await f.remove(refCorreo).catch(() => {});    // libera el correo reservado en el paso 1
        return { ok: false, error: tieneClave(ru.snapshot.val()) ? 'Ese usuario ya existe.' : MSG_SIN_CLAVE };
      }
      return { ok: true, username: usuario };
    } catch (e) { return fallo(e); }
  }

  /* ---------- Login ---------- */

  async function login(identificador, password) {
    const ident = String(identificador || '').trim().toLowerCase();
    if (!ident) return { ok: false, notFound: true };
    try {
      let id = ident;
      const f = await cargarFirebase();
      if (ident.includes('@')) {                      // entra con el correo -> busca su usuario en el índice
        const sc = await f.get(f.ref(f.db, 'correos/' + claveCorreo(ident)));
        if (!sc.exists()) return { ok: false, notFound: true };
        id = String(sc.val());
      }
      // El id que viene del índice de correos se acepta tal cual (puede venir de versiones anteriores); el escrito a mano debe ser un usuario válido
      const valido = ident.includes('@') ? ID_VALIDO_FB(id) : /^[a-z0-9_]{3,18}$/.test(id);
      if (!valido || RESERVADOS.includes(id)) return { ok: false, notFound: true };

      const su = await f.get(f.ref(f.db, 'usuarios/' + id));
      if (!su.exists()) { console.warn('[RCRemote] login: no hay registro en usuarios/' + id); return { ok: false, notFound: true }; }
      const u = su.val();
      if (!tieneClave(u)) { console.warn('[RCRemote] login: usuarios/' + id + ' no tiene salt/hash'); return { ok: false, noPassword: true, error: MSG_SIN_CLAVE }; }

      if (!(await coincide(password, u))) return { ok: false, wrongPassword: true, error: MSG_CREDENCIALES };
      if (u.baneado) return { ok: false, banned: true, error: MSG_BANEADO };
      return { ok: true, account: { username: u.usuario || id, name: u.nombre || u.usuario || id, email: u.correo || '', role: u.rol === 'admin' ? 'admin' : 'user' } };
    } catch (e) { return fallo(e); }
  }

  /* ---------- Recuperar contraseña (por correo) ---------- */

  async function recover(email, newPassword) {
    const correo = String(email || '').trim().toLowerCase();
    if (!RE_CORREO.test(correo)) return { ok: false, error: 'Correo no válido.' };
    if (String(newPassword || '').length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    try {
      const f = await cargarFirebase();
      const sc = await f.get(f.ref(f.db, 'correos/' + claveCorreo(correo)));
      if (!sc.exists()) return { ok: false, notFound: true };
      const refU = f.ref(f.db, 'usuarios/' + sc.val());
      if (!(await f.get(refU)).exists()) return { ok: false, notFound: true };
      const salt = nuevoSalt();
      await f.update(refU, { salt, hash: await hashPassword(newPassword, salt) });
      return { ok: true };
    } catch (e) { return fallo(e); }
  }

  /* ---------- Configuración: cambiar usuario y/o contraseña ---------- */

  async function updateAccount({ username, oldPass, newUser, newPass }) {
    const id = String(username || '').toLowerCase();
    if (!id || RESERVADOS.includes(id)) return { ok: false, notFound: true };
    try {
      const f = await cargarFirebase();
      const refU = f.ref(f.db, 'usuarios/' + id);
      const su = await f.get(refU);
      if (!su.exists()) return { ok: false, notFound: true };
      const u = su.val();
      if (!(await coincide(oldPass, u))) return { ok: false, error: 'La contraseña actual no es correcta.' };
      if (newPass && newPass.length < 6) return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };

      const datos = { ...u };
      if (newPass) { datos.salt = nuevoSalt(); datos.hash = await hashPassword(newPass, datos.salt); }

      const nuevoId = newUser ? newUser.toLowerCase() : id;
      if (newUser && nuevoId !== id) {                // cambio de nombre de usuario: se mueve el registro
        if (!RE_USUARIO.test(newUser)) return { ok: false, error: 'Usuario no válido (3-18 caracteres: letras, números o _).' };
        if (RESERVADOS.includes(nuevoId)) return { ok: false, error: 'Ese usuario ya existe.' };
        datos.usuario = newUser;
        const r = await f.runTransaction(f.ref(f.db, 'usuarios/' + nuevoId), actual => (actual === null ? datos : undefined));
        if (!r.committed) return { ok: false, error: 'Ese usuario ya existe.' };
        if (u.correo) await f.set(f.ref(f.db, 'correos/' + claveCorreo(u.correo)), nuevoId);
        await f.remove(refU);
      } else if (newPass) {
        await f.update(refU, { salt: datos.salt, hash: datos.hash });
      }
      return { ok: true };
    } catch (e) { return fallo(e); }
  }

  window.RCRemote = { register, login, recover, updateAccount, hashPassword, useBackend };
})();
