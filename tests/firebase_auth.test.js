// Pruebas de registro / login / recuperar / cambio de contraseña y de la sincronización (nube.js + app.js)
// con Firebase Realtime Database simulada en memoria.
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
/* Árbol de Firebase Realtime Database simulado (para la API REST que usa nube.js) */
let RTDB = {};   // se reinicia en cada entorno
const partes = ruta => ruta.split('/').filter(Boolean);
const leerRTDB = ruta => partes(ruta).reduce((n, k) => (n == null ? n : n[k] === undefined ? null : n[k]), RTDB);
function escribirRTDB(ruta, valor, parcial) {
  const ks = partes(ruta);
  if (!ks.length) { RTDB = valor || {}; return; }
  let n = RTDB;
  for (const k of ks.slice(0, -1)) {
    if (typeof n[k] !== 'object' || n[k] === null) { if (valor === undefined) return; n[k] = {}; }   // borrar algo que no existe no crea la ruta
    n = n[k];
  }
  const k = ks[ks.length - 1];
  if (valor === undefined) delete n[k];
  else if (parcial) n[k] = { ...(n[k] || {}), ...valor };
  else n[k] = valor;
}
const rutaDe = url => decodeURIComponent(new URL(url).pathname.replace(/\.json$/, ''));
class FakeXHR {
  open(m, url) { this.url = url; }
  send() { const v = leerRTDB(rutaDe(this.url)); this.status = 200; this.responseText = JSON.stringify(v === undefined ? null : v); }
}
const peticiones = [];
async function fakeFetch(url, opt) {
  peticiones.push({ method: opt.method, ruta: rutaDe(url), body: opt.body === undefined ? undefined : JSON.parse(opt.body) });
  const r = rutaDe(url);
  if (opt.method === 'DELETE') escribirRTDB(r, undefined);
  else escribirRTDB(r, JSON.parse(opt.body), opt.method === 'PATCH');
  return { ok: true };
}
function crearEntorno(pagina, sesion, xhr) {
  RTDB = RTDB;
  const noop = () => {};
  const el = new Proxy(function () {}, { get: (_, k) => (k === 'style' || k === 'classList' || k === 'dataset' ? el : noop), apply: () => el, set: () => true });
  const sandbox = {
    console, crypto: globalThis.crypto, TextEncoder, Math, Date, JSON, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    name: '', XMLHttpRequest: xhr || FakeXHR, fetch: fakeFetch, rtdb: RTDB,
    location: { pathname: '/html/' + (pagina || 'login') + '.html', href: '', replace(u) { this.href = u; } },
    document: { currentScript: { src: 'http://localhost/js/app.js' }, documentElement: el, body: el, head: el, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => el },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    addEventListener: noop,
  };
  if (sesion) sandbox.name = 'rc_sesion=' + sesion;
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const cargar = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8') + (f === 'app.js' ? '\n;globalThis.RC = RC;' : ''), sandbox, { filename: f });
  cargar('nube.js'); cargar('app.js'); cargar('firebase_auth.js');
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
  assert.ok(w.RC.adoptAccount((await w.RCRemote.login('ana', 'secreto1')).account).ok);

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



test('registro antiguo con id distinto en el índice de correos: el login por correo lo encuentra', async () => {
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  const salt = 'ab'.repeat(16);
  fb.datos.set('usuarios/Juan-Perez_2024_largo', { nombre: 'Juan', usuario: 'Juan', correo: 'juan@mail.com', salt, hash: await w.RCRemote.hashPassword('clave123', salt), rol: 'user' });
  fb.datos.set('correos/juan%40mail%2Ecom', 'Juan-Perez_2024_largo');
  const r = await w.RCRemote.login('JUAN@mail.com', 'clave123'); assert.ok(r.ok && r.account.username === 'Juan');
  assert.match((await w.RCRemote.register({ name: 'Juan', username: 'otro', email: 'juan@mail.com', password: 'clave123' })).error, /Inicia sesión/);
});


/* ---------- Sincronización con la base de datos (nube.js + app.js) ---------- */
test('adoptAccount abre la sesión (window.name), crea los datos del jugador y los sube a perfiles/', async () => {
  RTDB = {}; peticiones.length = 0;
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'Ana', email: 'ana@mail.com', password: 'secreto1' });
  const r = await w.RCRemote.login('ana', 'secreto1');
  assert.ok(w.RC.adoptAccount(r.account).ok);
  assert.ok(w.RC.isLoggedIn()); assert.strictEqual(w.RC.currentUser(), 'Ana');
  assert.strictEqual(w.name, 'rc_sesion=Ana');
  assert.strictEqual(w.RC.getUser().coins, 10000);
  assert.deepStrictEqual(RTDB.perfiles.ana.cuenta, { username: 'Ana', name: 'Ana', role: 'user', banned: false, created: RTDB.perfiles.ana.cuenta.created });
  assert.strictEqual(typeof RTDB.perfiles.ana.u, 'string');                         // se guarda como texto JSON
  assert.strictEqual(JSON.parse(RTDB.perfiles.ana.u).coins, 10000);
  assert.ok(RTDB.datos.ana && typeof RTDB.datos.ana.n === 'string', 'las notificaciones (privadas) van a datos/');
  assert.ok(!JSON.stringify(RTDB.perfiles).includes('hash'), 'perfiles/ nunca lleva contraseña');
});

test('al abrir otra página los datos vuelven de la base de datos (sin localStorage)', async () => {
  RTDB = {}; peticiones.length = 0;
  const w1 = crearEntorno(), fb = crearFakeFirebase(); w1.RCRemote.useBackend(fb);
  await w1.RCRemote.register({ name: 'Ana', username: 'Ana', email: 'ana@mail.com', password: 'secreto1' });
  w1.RC.adoptAccount((await w1.RCRemote.login('ana', 'secreto1')).account);
  w1.RC.addCoins(2500); w1.RC.logHistory && w1.RC.logHistory('Tragamonedas', 'Ganaste', 500);
  const monedas = w1.RC.getUser().coins;
  const w2 = crearEntorno('login', 'Ana');                                          // "otra página" de la misma pestaña
  assert.ok(w2.RC.isLoggedIn() && w2.RC.currentUser() === 'Ana');
  assert.strictEqual(w2.RC.getUser().coins, monedas);
  assert.ok(w2.RC.getAccounts().some(a => a.username === 'Ana' && a.hash === ''), 'la cuenta de la nube no trae contraseña');
});

test('sin conexión con la base de datos no se escribe nada (no se pisan datos con valores por defecto)', async () => {
  RTDB = {}; peticiones.length = 0;
  const roto = function () {}; roto.prototype.open = () => {}; roto.prototype.send = function () { this.status = 0; };
  const warn = console.warn; console.warn = () => {};
  const w = crearEntorno('login', 'Ana', roto);
  console.warn = warn;
  peticiones.length = 0;
  w.RC.getUser();                                                                    // crearía datos por defecto
  assert.strictEqual(peticiones.length, 0, 'no debe subir nada si no pudo leer');
  assert.ok(!w.RCNube.ready());
  assert.ok(!w.RC.adoptAccount({ username: 'Pepe', name: 'Pepe', role: 'user' }).ok);
});

test('cambios de cuenta (bloqueo, borrado) llegan a la base de datos', async () => {
  RTDB = {}; peticiones.length = 0;
  const w = crearEntorno(), fb = crearFakeFirebase(); w.RCRemote.useBackend(fb);
  await w.RCRemote.register({ name: 'Ana', username: 'ana', email: 'ana@mail.com', password: 'secreto1' });
  w.RC.adoptAccount((await w.RCRemote.login('ana', 'secreto1')).account);
  w.RC.login('admin', 'admin123');
  w.RC.setBanned('ana', true);
  assert.strictEqual(RTDB.perfiles.ana.cuenta.banned, true);
  assert.ok(peticiones.some(p => p.method === 'PATCH' && p.ruta === '/usuarios/ana' && p.body.baneado === true), 'el login lee usuarios/ana/baneado');
  w.RC.deleteAccount('ana');
  assert.ok(!RTDB.perfiles.ana && !(RTDB.datos && RTDB.datos.ana), 'se borran perfil y datos');
});

test('el admin de ejemplo nunca se sube a la base de datos', async () => {
  RTDB = {}; peticiones.length = 0;
  const w = crearEntorno();
  assert.ok(w.RC.login('admin', 'admin123').ok && w.RC.isAdmin());
  assert.ok(!(RTDB.perfiles && RTDB.perfiles.admin && RTDB.perfiles.admin.cuenta), 'sin cuenta/contraseña del admin en la nube');
});

(async () => {
  let fallos = 0;
  for (const [n, fn] of tests) {
    try { await fn(); console.log('  ✓', n); } catch (e) { fallos++; console.log('  ✗', n, '\n   ', e.message); }
  }
  console.log(fallos ? `\n${fallos} prueba(s) fallaron` : `\nTodas las pruebas pasaron (${tests.length})`);
  process.exit(fallos ? 1 : 0);
})();
