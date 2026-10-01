// Pruebas de registro / login / recuperar / cambio de contraseña con una base de datos Firebase simulada en memoria.
// Ejecutar:  node tests/firebase_auth.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- Firebase simulado (mismas operaciones que usa firebase_auth.js) ---------- */
function crearFakeFirebase() {
  const datos = new Map();                                   // ruta -> valor
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const snap = v => ({ exists: () => v !== undefined && v !== null, val: () => clone(v ?? null) });
  return {
    datos,
    db: {},
    ref: (_db, ruta) => ({ ruta }),
    get: async r => snap(datos.get(r.ruta)),
    set: async (r, v) => { datos.set(r.ruta, clone(v)); },
    update: async (r, v) => { datos.set(r.ruta, { ...(datos.get(r.ruta) || {}), ...clone(v) }); },
    remove: async r => { datos.delete(r.ruta); },
    runTransaction: async (r, fn) => {
      const actual = datos.has(r.ruta) ? clone(datos.get(r.ruta)) : null;
      const nuevo = fn(actual);
      if (nuevo === undefined) return { committed: false, snapshot: snap(datos.get(r.ruta)) };
      datos.set(r.ruta, clone(nuevo));
      return { committed: true, snapshot: snap(nuevo) };
    },
  };
}

/* ---------- Entorno mínimo de navegador ---------- */
function crearStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function crearEntorno(pagina) {
  const noop = () => {};
  const el = new Proxy(function () {}, { get: (_, k) => (k === 'style' || k === 'classList' || k === 'dataset' ? el : noop), apply: () => el, set: () => true });
  const sandbox = {
    console, crypto: globalThis.crypto, TextEncoder, Math, Date, JSON, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: crearStorage(), sessionStorage: crearStorage(),
    location: { pathname: '/html/' + (pagina || 'login') + '.html', href: '', replace(u) { this.href = u; } },
    document: { currentScript: { src: 'http://localhost/js/app.js' }, documentElement: el, body: el, head: el, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => el },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    addEventListener: noop,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const cargar = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8') + (f === 'app.js' ? '\n;globalThis.RC = RC;' : ''), sandbox, { filename: f });
  cargar('app.js'); cargar('firebase_auth.js');
  sandbox.cargar = cargar;
  return sandbox;
}

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

test('registro guarda salt + hash (nunca la contraseña en claro) y los índices', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  const r = await w.RCRemote.register({ name: 'Ana', username: 'Ana_01', email: 'Ana@Mail.com', password: 'secreto1' });
  assert.deepStrictEqual({ ok: r.ok, username: r.username }, { ok: true, username: 'Ana_01' });
  const u = fb.datos.get('usuarios/ana_01');
  assert.ok(u && u.salt && u.hash, 'debe existir salt y hash');
  assert.strictEqual(u.salt.length, 32);
  assert.strictEqual(u.hash, await w.RCRemote.hashPassword('secreto1', u.salt));
  assert.ok(!JSON.stringify(u).includes('secreto1'), 'la contraseña no debe aparecer en claro');
  assert.strictEqual(u.correo, 'ana@mail.com'); assert.strictEqual(u.saldo_billetera, 10000); assert.strictEqual(u.rol, 'user');
  assert.strictEqual(fb.datos.get('correos/ana@mail%2Ecom'.replace('@', '%40')), 'ana_01');
});

test('registro valida datos y rechaza duplicados sin dejar el correo bloqueado', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  const base = { name: 'Ana', username: 'ana', email: 'ana@mail.com', password: 'secreto1' };
  assert.match((await w.RCRemote.register({ ...base, name: 'A' })).error, /nombre/);
  assert.match((await w.RCRemote.register({ ...base, username: 'a!' })).error, /usuario/i);
  assert.match((await w.RCRemote.register({ ...base, email: 'x' })).error, /Correo/);
  assert.match((await w.RCRemote.register({ ...base, password: '123' })).error, /6 caracteres/);
  assert.match((await w.RCRemote.register({ ...base, username: 'Admin' })).error, /ya existe/);
  assert.ok((await w.RCRemote.register(base)).ok);
  assert.match((await w.RCRemote.register({ ...base, username: 'otro' })).error, /correo ya está registrado/);
  assert.match((await w.RCRemote.register({ ...base, email: 'otra@mail.com' })).error, /usuario ya existe/);
  assert.ok((await w.RCRemote.register({ ...base, username: 'tercero', email: 'otra@mail.com' })).ok, 'el correo no debe quedar bloqueado tras el fallo');
});

test('login por usuario y por correo con la contraseña correcta; falla con la incorrecta', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'Ana', email: 'ana@mail.com', password: 'secreto1' });
  const a = await w.RCRemote.login('ANA', 'secreto1'); assert.ok(a.ok); assert.strictEqual(a.account.username, 'Ana');
  const b = await w.RCRemote.login('ana@mail.com', 'secreto1'); assert.ok(b.ok);
  const c = await w.RCRemote.login('ana', 'mala'); assert.ok(!c.ok && c.wrongPassword && /incorrectos/.test(c.error));
  const d = await w.RCRemote.login('nadie', 'x'); assert.ok(!d.ok && d.notFound);
  const e = await w.RCRemote.login('admin', 'admin123'); assert.ok(!e.ok && e.notFound, 'admin no se resuelve en Firebase');
});

test('cuenta baneada no entra', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'ana', email: 'ana@mail.com', password: 'secreto1' });
  await fb.update(fb.ref(null, 'usuarios/ana'), { baneado: true });
  const r = await w.RCRemote.login('ana', 'secreto1'); assert.ok(!r.ok && r.banned);
});

test('RC.loginRemote crea la sesión y los datos locales del jugador', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'Ana', email: 'ana@mail.com', password: 'secreto1' });
  const r = await w.RCRemote.login('ana', 'secreto1');
  assert.ok(w.RC.loginRemote(r.account, 'secreto1', false).ok);
  assert.ok(w.RC.isLoggedIn()); assert.strictEqual(w.RC.currentUser(), 'Ana');
  assert.strictEqual(w.RC.getUser().coins, 10000);
  assert.ok(w.RC.login('ana', 'secreto1', false).ok, 'el login local (sin conexión) también funciona después');
});

test('loginRemote respeta bloqueo local y no degrada al admin local', async () => {
  const w = crearEntorno();
  w.RC.setBanned('x', true);                                 // no existe: no hace nada
  assert.ok(w.RC.loginRemote({ username: 'Pepe', name: 'Pepe', email: 'p@p.com', role: 'user' }, 'abcdef', false).ok);
  w.RC.setBanned('Pepe', true);
  assert.ok(!w.RC.loginRemote({ username: 'Pepe', name: 'Pepe', email: 'p@p.com', role: 'user' }, 'abcdef', false).ok);
  assert.ok(w.RC.login('admin', 'admin123', false).ok && w.RC.isAdmin());
});

test('recuperar contraseña actualiza el hash en Firebase y el login usa la nueva', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'ana', email: 'ana@mail.com', password: 'secreto1' });
  const antes = fb.datos.get('usuarios/ana');
  assert.ok(!(await w.RCRemote.recover('nadie@mail.com', 'nueva123')).ok);
  assert.match((await w.RCRemote.recover('ana@mail.com', '123')).error, /6 caracteres/);
  assert.ok((await w.RCRemote.recover('ANA@mail.com', 'nueva123')).ok);
  const despues = fb.datos.get('usuarios/ana');
  assert.notStrictEqual(antes.hash, despues.hash); assert.notStrictEqual(antes.salt, despues.salt);
  assert.strictEqual(despues.nombre, 'Ana', 'no se pierden los demás datos');
  assert.ok(!(await w.RCRemote.login('ana', 'secreto1')).ok);
  assert.ok((await w.RCRemote.login('ana', 'nueva123')).ok);
});

test('Configuración: cambio de contraseña y de usuario sincronizados', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'ana', email: 'ana@mail.com', password: 'secreto1' });
  await w.RCRemote.register({ name: 'Bob', username: 'bob', email: 'bob@mail.com', password: 'secreto1' });
  w.RC.loginRemote((await w.RCRemote.login('ana', 'secreto1')).account, 'secreto1', false);

  assert.match((await w.RCRemote.updateAccount({ username: 'ana', oldPass: 'mala', newPass: 'nueva123' })).error, /actual no es correcta/);
  assert.match((await w.RCRemote.updateAccount({ username: 'ana', oldPass: 'secreto1', newUser: 'Bob' })).error, /ya existe/);
  assert.ok((await w.RCRemote.updateAccount({ username: 'ana', oldPass: 'secreto1', newPass: 'nueva123' })).ok);
  assert.ok(w.RC.updateAccount({ oldPass: 'secreto1', newPass: 'nueva123', trusted: true }).ok);
  assert.ok((await w.RCRemote.login('ana', 'nueva123')).ok && !(await w.RCRemote.login('ana', 'secreto1')).ok);

  assert.ok((await w.RCRemote.updateAccount({ username: 'ana', oldPass: 'nueva123', newUser: 'AnaNueva' })).ok);
  assert.ok(w.RC.updateAccount({ newUser: 'AnaNueva', oldPass: 'nueva123', trusted: true }).ok);
  assert.strictEqual(w.RC.currentUser(), 'AnaNueva');
  assert.ok(!fb.datos.has('usuarios/ana') && fb.datos.has('usuarios/ananueva'));
  assert.strictEqual(fb.datos.get('correos/ana%40mail%2Ecom'), 'ananueva', 'el índice de correo apunta al usuario nuevo');
  const r = await w.RCRemote.login('ana@mail.com', 'nueva123'); assert.ok(r.ok && r.account.username === 'AnaNueva');
  assert.ok((await w.RCRemote.updateAccount({ username: 'admin', oldPass: 'admin123' })).notFound, 'admin sigue siendo solo local');
});

test('errores de red / permisos se devuelven como network (para el respaldo local)', async () => {
  const w = crearEntorno(); const roto = crearFakeFirebase();
  roto.get = async () => { const e = new Error('PERMISSION_DENIED: Permission denied'); e.code = 'PERMISSION_DENIED'; throw e; };
  w.RCRemote.useBackend(roto);
  const origErr = console.error; console.error = () => {};
  const r = await w.RCRemote.login('ana', 'x');
  console.error = origErr;
  assert.ok(!r.ok && r.network && /reglas de Firebase/.test(r.error));
});


/* ---------- Formularios reales de auth.js con un DOM simulado ---------- */
function montarFormulario(pagina, tipo, campos, fb) {
  const w = crearEntorno(pagina);
  w.RCRemote.useBackend(fb);
  const els = {}; Object.entries(campos).forEach(([id, v]) => { els[id] = typeof v === 'boolean' ? { checked: v } : { value: v }; });
  const err = { textContent: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle() {} } };
  const boton = { disabled: false };
  const form = { dataset: {}, handler: null, addEventListener(ev, fn) { if (ev === 'submit') this.handler = fn; }, querySelector: sel => (sel === '#formError' ? err : sel.startsWith('button') ? boton : null) };
  w.document.body = { hasAttribute: n => n === 'data-public' };
  w.document.getElementById = id => els[id] || null;
  w.document.querySelector = sel => (sel === `form[data-form="${tipo}"]` ? form : null);
  const temporizadores = []; w.setTimeout = (fn, ms) => temporizadores.push({ fn, ms });
  w.cargar('auth.js');
  assert.ok(form.handler, 'auth.js debe enganchar el formulario ' + tipo);
  return { w, err, boton, temporizadores, enviar: () => form.handler({ preventDefault() {} }) };
}

test('formulario de registro: crea la cuenta en la BD y redirige al login', async () => {
  const fb = crearFakeFirebase();
  const f = montarFormulario('registro', 'registro', { nombre: 'Ana', usuario: 'ana', correo: 'ana@mail.com', password: 'secreto1', password2: 'secreto1', acepto: true }, fb);
  await f.enviar();
  assert.ok(fb.datos.get('usuarios/ana').hash, 'la contraseña (hash) debe quedar guardada en la BD');
  assert.match(f.err.textContent, /Cuenta creada/); assert.ok(f.err.classList._s.has('form-ok'));
  assert.strictEqual(f.temporizadores.length, 1); f.temporizadores[0].fn();
  assert.match(f.w.location.href, /html\/login\.html$/);
});

test('formulario de registro: contraseñas distintas / términos sin aceptar no tocan la BD', async () => {
  const fb = crearFakeFirebase();
  const base = { nombre: 'Ana', usuario: 'ana', correo: 'ana@mail.com', password: 'secreto1', password2: 'secreto1', acepto: true };
  let f = montarFormulario('registro', 'registro', { ...base, password2: 'otra' }, fb); await f.enviar();
  assert.match(f.err.textContent, /no coinciden/);
  f = montarFormulario('registro', 'registro', { ...base, acepto: false }, fb); await f.enviar();
  assert.match(f.err.textContent, /ficticias/);
  assert.strictEqual(fb.datos.size, 0);
});

test('formulario de login: usuario registrado en la BD entra (usuario o correo) y queda la sesión', async () => {
  const fb = crearFakeFirebase();
  const r = montarFormulario('registro', 'registro', { nombre: 'Ana', usuario: 'Ana', correo: 'ana@mail.com', password: 'secreto1', password2: 'secreto1', acepto: true }, fb); await r.enviar();
  for (const ident of ['ana', 'ana@mail.com']) {
    const f = montarFormulario('login', 'login', { identificador: ident, password: 'secreto1', recordarme: false }, fb);
    await f.enviar();
    assert.strictEqual(f.err.textContent, ''); assert.match(f.w.location.href, /index\.html$/);
    assert.strictEqual(f.w.RC.currentUser(), 'Ana'); assert.strictEqual(f.boton.disabled, false);
  }
});

test('formulario de login: contraseña incorrecta, usuario inexistente y campos vacíos', async () => {
  const fb = crearFakeFirebase();
  const r = montarFormulario('registro', 'registro', { nombre: 'Ana', usuario: 'ana', correo: 'ana@mail.com', password: 'secreto1', password2: 'secreto1', acepto: true }, fb); await r.enviar();
  let f = montarFormulario('login', 'login', { identificador: 'ana', password: 'mala', recordarme: false }, fb); await f.enviar();
  assert.strictEqual(f.err.textContent, 'Usuario o contraseña incorrectos.'); assert.ok(!f.w.RC.isLoggedIn());
  f = montarFormulario('login', 'login', { identificador: 'nadie', password: 'x', recordarme: false }, fb); await f.enviar();
  assert.match(f.err.textContent, /No existe ninguna cuenta/);
  f = montarFormulario('login', 'login', { identificador: '', password: '', recordarme: false }, fb); await f.enviar();
  assert.strictEqual(f.err.textContent, 'Completa todos los campos.');
});

test('formulario de login: el admin de ejemplo sigue entrando (respaldo local) y no se copia a la BD', async () => {
  const fb = crearFakeFirebase();
  const f = montarFormulario('login', 'login', { identificador: 'admin', password: 'admin123', recordarme: false }, fb); await f.enviar();
  assert.match(f.w.location.href, /index\.html$/); assert.ok(f.w.RC.isAdmin()); assert.strictEqual(fb.datos.size, 0);
});

test('formulario de login: cuenta antigua solo-local entra y se migra a la BD con su contraseña', async () => {
  const fb = crearFakeFirebase();
  const f = montarFormulario('login', 'login', { identificador: 'vieja', password: 'clave123', recordarme: false }, fb);
  f.w.RC.register({ name: 'Vieja', username: 'vieja', email: 'vieja@mail.com', password: 'clave123' });   // misma cuenta local en este navegador
  await f.enviar();
  assert.match(f.w.location.href, /index\.html$/);
  const u = fb.datos.get('usuarios/vieja'); assert.ok(u && u.hash && u.salt, 'debe copiarse a la BD con salt + hash');
  assert.ok((await f.w.RCRemote.login('vieja', 'clave123')).ok, 'y ya puede entrar desde la BD');
});

test('formulario de login: sin conexión, el usuario con cuenta local entra y el resto ve el aviso de conexión', async () => {
  const fb = crearFakeFirebase(); fb.get = async () => { throw new Error('network'); };
  const origErr = console.error; console.error = () => {};
  const f = montarFormulario('login', 'login', { identificador: 'admin', password: 'admin123', recordarme: false }, fb); await f.enviar();
  assert.ok(f.w.RC.isAdmin());
  const g = montarFormulario('login', 'login', { identificador: 'ana', password: 'x', recordarme: false }, fb); await g.enviar();
  console.error = origErr;
  assert.match(g.err.textContent, /No se pudo conectar/); assert.ok(!g.w.RC.isLoggedIn());
});

test('formulario de recuperar: cambia la contraseña en la BD', async () => {
  const fb = crearFakeFirebase();
  const r = montarFormulario('registro', 'registro', { nombre: 'Ana', usuario: 'ana', correo: 'ana@mail.com', password: 'secreto1', password2: 'secreto1', acepto: true }, fb); await r.enviar();
  let f = montarFormulario('recuperar', 'recuperar', { correo: 'ana@mail.com', password: 'nueva123', password2: 'nueva123' }, fb); await f.enviar();
  assert.match(f.err.textContent, /Contraseña cambiada/);
  assert.ok((await f.w.RCRemote.login('ana', 'nueva123')).ok);
  f = montarFormulario('recuperar', 'recuperar', { correo: 'nadie@mail.com', password: 'nueva123', password2: 'nueva123' }, fb); await f.enviar();
  assert.match(f.err.textContent, /No existe ninguna cuenta/);
});

test('registro antiguo SIN contraseña: login y registro lo explican y "Olvidé mi contraseña" lo arregla', async () => {
  const fb = crearFakeFirebase();
  // lo que dejaba una versión anterior: usuario y correo, pero sin salt/hash
  fb.datos.set('usuarios/pedro', { nombre: 'Pedro', usuario: 'pedro', correo: 'pedro@mail.com', saldo_billetera: 10000, rol: 'user' });
  fb.datos.set('correos/pedro%40mail%2Ecom', 'pedro');
  let f = montarFormulario('login', 'login', { identificador: 'pedro@mail.com', password: 'clave123', recordarme: false }, fb); await f.enviar();
  assert.match(f.err.textContent, /no tiene contraseña guardada/); assert.ok(!f.w.RC.isLoggedIn());
  f = montarFormulario('registro', 'registro', { nombre: 'Pedro', usuario: 'pedro', correo: 'pedro@mail.com', password: 'clave123', password2: 'clave123', acepto: true }, fb); await f.enviar();
  assert.match(f.err.textContent, /no tiene contraseña guardada/);
  f = montarFormulario('recuperar', 'recuperar', { correo: 'pedro@mail.com', password: 'clave123', password2: 'clave123' }, fb); await f.enviar();
  assert.match(f.err.textContent, /Contraseña cambiada/);
  f = montarFormulario('login', 'login', { identificador: 'pedro@mail.com', password: 'clave123', recordarme: false }, fb); await f.enviar();
  assert.match(f.w.location.href, /index\.html$/); assert.strictEqual(f.w.RC.currentUser(), 'pedro');
});

test('registro antiguo con id distinto en el índice de correos: el login por correo lo encuentra', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  const salt = 'ab'.repeat(16);
  fb.datos.set('usuarios/Juan-Perez_2024_largo', { nombre: 'Juan', usuario: 'Juan', correo: 'juan@mail.com', salt, hash: await w.RCRemote.hashPassword('clave123', salt), rol: 'user' });
  fb.datos.set('correos/juan%40mail%2Ecom', 'Juan-Perez_2024_largo');
  const r = await w.RCRemote.login('JUAN@mail.com', 'clave123'); assert.ok(r.ok && r.account.username === 'Juan');
  assert.match((await w.RCRemote.register({ name: 'Juan', username: 'otro', email: 'juan@mail.com', password: 'clave123' })).error, /Inicia sesión/);
});

(async () => {
  let fallos = 0;
  for (const [n, fn] of tests) {
    try { await fn(); console.log('  ✓', n); } catch (e) { fallos++; console.log('  ✗', n, '\n   ', e.message); }
  }
  console.log(fallos ? `\n${fallos} prueba(s) fallaron` : `\nTodas las pruebas pasaron (${tests.length})`);
  process.exit(fallos ? 1 : 0);
})();
