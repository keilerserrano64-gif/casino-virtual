// firebase.js — conecta Royal Casino con Firebase (Authentication + Firestore).
// La app sigue usando localStorage como caché rápida; este módulo la refleja en la nube:
//   Auth      -> correo + contraseña (las contraseñas NUNCA se guardan en Firestore)
//   Firestore -> users/{uid}/store/{clave}  datos del jugador (monedas, historial, notificaciones, ajustes, social)
//             -> usernames/{usuario}        reserva de nombre de usuario (-> correo, para iniciar sesión con usuario)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
         sendPasswordResetEmail, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDbMa4AhaZbHoDbeNad4DC-9lregiGY80E",
  authDomain: "royal-casino-7633d.firebaseapp.com",
  projectId: "royal-casino-7633d",
  storageBucket: "royal-casino-7633d.firebasestorage.app",
  messagingSenderId: "1055691990767",
  appId: "1:1055691990767:web:e0d4b838fb919ab59f1d1a"
});
const auth = getAuth(app);
const db = getFirestore(app);

const MINE = /^rc_(u|h|n|m|s|f)_(.+)$/;           // claves por jugador (u=datos h=historial n=notif m=movimientos s=ajustes f=social)
const PK = /^rc_(u|l|p|f)_(.+)$/;                  // parte pública: datos, última vez visto, presencia, social -> players/{usuario}
const pending = {}, playerPending = {}, tickets = {};
let timer = null;

const me = () => (window.RC && RC.currentUser() ? RC.currentUser().toLowerCase() : null);
const syncable = key => { const m = MINE.exec(key); return !!m && m[2] === me(); };
const store = key => doc(db, 'users', auth.currentUser.uid, 'store', key);
const myAccount = () => RC.getAccounts().find(a => a.username.toLowerCase() === me()) || {};
const schedule = () => { clearTimeout(timer); timer = setTimeout(flush, 1500); };

async function flush() {
  clearTimeout(timer); timer = null;
  if (!auth.currentUser) return;
  const jobs = [];
  Object.entries(pending).forEach(([k, v]) => { delete pending[k]; jobs.push(setDoc(store(k), { v }).catch(e => { pending[k] = v; console.warn('Firebase:', e.code || e); })); });
  Object.entries(playerPending).forEach(([name, patch]) => {
    delete playerPending[name];
    if (name === me()) { const a = myAccount(); patch = { ...patch, uid: auth.currentUser.uid, username: a.username, name: a.name, role: a.role || 'user' }; }
    jobs.push(setDoc(doc(db, 'players', name), patch, { merge: true }).catch(e => console.warn('Firebase players:', e.code || e)));
  });
  await Promise.all(jobs);
}

function push(key, val) {                          // lo llama RC (app.js) en cada escritura
  if (!auth.currentUser) return;
  if (key === 'rc_news') return void setDoc(doc(db, 'shared', 'news'), { v: val }).catch(() => {});
  if (key === 'rc_disabled_games') return void setDoc(doc(db, 'shared', 'games_off'), { v: val }).catch(() => {});
  if (key === 'rc_tickets') return syncTickets(val);
  const pm = PK.exec(key);
  if (pm && (pm[1] === 'f' || pm[2] === me())) { playerPending[pm[2]] = { ...(playerPending[pm[2]] || {}), [pm[1]]: val }; schedule(); }
  if (syncable(key)) { pending[key] = JSON.stringify(val); schedule(); }
}
function pushAll() {                               // sube todo lo del jugador actual (registro / primer arranque)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i), pm = PK.exec(k);
    if (syncable(k) || (pm && pm[2] === me())) { try { push(k, JSON.parse(localStorage.getItem(k))); } catch (e) {} }
  }
  return flush();
}

function syncTickets(list) {
  const ids = new Set(list.map(t => String(t.id)));
  list.forEach(t => { const j = JSON.stringify(t); if (tickets[t.id] !== j) { tickets[t.id] = j; setDoc(doc(db, 'tickets', String(t.id)), { ...t, uid: t.uid || auth.currentUser.uid }).catch(() => {}); } });
  Object.keys(tickets).forEach(id => { if (!ids.has(id)) { delete tickets[id]; deleteDoc(doc(db, 'tickets', id)).catch(() => {}); } });
}

/* ---- Escucha en vivo: jugadores, noticias, juegos y tickets -> localStorage ---- */
const GAME_PAGE = /(tragamonedas|ruleta|blackjack|poker|dados|carreras|bingo)\.html$/i;
let started = null, firstPlayers = true;
const setLS = (k, v) => { const j = JSON.stringify(v); if (localStorage.getItem(k) !== j) { localStorage.setItem(k, j); return true; } return false; };
function done(changed) {
  if (!changed) return;
  window.dispatchEvent(new CustomEvent('rc-sync'));
  const f = 'rc_rl_' + location.pathname;
  if (firstPlayers && !GAME_PAGE.test(location.pathname) && !sessionStorage.getItem(f)) { sessionStorage.setItem(f, '1'); location.reload(); }
}
function listen(user) {
  if (started === user.uid) return; started = user.uid;
  onSnapshot(collection(db, 'players'), snap => {
    let changed = false; const accs = RC.getAccounts(), mine = me();
    snap.forEach(d => {
      const x = d.data(), name = d.id; let a = accs.find(y => y.username.toLowerCase() === name);
      if (!a) { a = { username: x.username || name, name: x.name || name, email: '', hash: '', role: x.role || 'user', banned: false, created: '' }; accs.push(a); changed = true; }
      if (!!x.banned !== !!a.banned) { a.banned = !!x.banned; changed = true; }
      if (name !== mine && (x.role || 'user') !== a.role) { a.role = x.role || 'user'; changed = true; }
      if (x.u && (name !== mine || (x.adm && x.adm > Number(localStorage.getItem('rc_adm_seen') || 0)))) {
        if (name === mine) localStorage.setItem('rc_adm_seen', String(x.adm));
        changed = setLS('rc_u_' + name, x.u) || changed;
      }
      if (x.l != null) changed = setLS('rc_l_' + name, x.l) || changed;
      if (x.p) changed = setLS('rc_p_' + name, x.p) || changed;
      if (x.f) changed = setLS('rc_f_' + name, x.f) || changed;
    });
    if (changed) setLS('rc_accounts', accs);
    const self = accs.find(y => y.username.toLowerCase() === mine);
    if (self && self.banned) return void RC.logout();
    if (firstPlayers) { pushAll(); }
    done(changed); firstPlayers = false;
  }, e => console.warn('players:', e.code));
  onSnapshot(doc(db, 'shared', 'news'), s => { if (s.exists()) done(setLS('rc_news', s.data().v)); }, () => {});
  onSnapshot(doc(db, 'shared', 'games_off'), s => { if (s.exists()) done(setLS('rc_disabled_games', s.data().v)); }, () => {});
  getDoc(doc(db, 'admins', user.uid)).then(a => {
    const q = a.exists() ? collection(db, 'tickets') : query(collection(db, 'tickets'), where('uid', '==', user.uid));
    onSnapshot(q, snap => {
      const l = []; snap.forEach(d => l.push(d.data())); l.sort((p, q2) => q2.id - p.id);
      Object.keys(tickets).forEach(k => delete tickets[k]); l.forEach(t => { tickets[t.id] = JSON.stringify(t); });
      done(setLS('rc_tickets', l));
    }, () => {});
  }).catch(() => {});
}

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'Ese correo ya está registrado.',
  'auth/invalid-credential': 'Usuario o contraseña incorrectos.',
  'auth/invalid-email': 'Correo no válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
  'auth/network-request-failed': 'Sin conexión con Firebase.',
  'username-taken': 'Ese usuario ya existe.',
};
const msg = e => AUTH_ERRORS[e.code || e.message] || 'No se pudo conectar con Firebase (' + (e.code || e.message) + ').';

async function emailOf(username) {                 // usuario -> correo (para iniciar sesión con el nombre de usuario)
  const s = await getDoc(doc(db, 'usernames', String(username).toLowerCase()));
  return s.exists() ? s.data().email : null;
}

async function signUp({ username, name, email, password }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: cred.user.uid, email });
    } catch (e) { await cred.user.delete(); throw new Error('username-taken'); }
    await setDoc(store('account_meta'), { username, name, email, created: new Date().toISOString() });
    await pushAll();
    return { ok: true };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

async function signIn(email, password) {          // inicia sesión y baja los datos del jugador a localStorage
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDocs(collection(db, 'users', cred.user.uid, 'store'));
    let meta = null;
    snap.forEach(d => { if (d.id === 'account_meta') meta = d.data(); else localStorage.setItem(d.id, d.data().v); });
    if (!meta) return { ok: false, error: 'Cuenta sin perfil en la nube.' };
    const pl = await getDoc(doc(db, 'players', meta.username.toLowerCase()));
    if (pl.exists() && pl.data().banned) { await signOut(auth); return { ok: false, error: 'Tu cuenta está bloqueada. Contacta con soporte.' }; }
    const admin = (await getDoc(doc(db, 'admins', cred.user.uid))).exists();
    return { ok: true, meta, admin };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

async function reset(email) {
  try { await sendPasswordResetEmail(auth, email); return { ok: true }; }
  catch (e) { return { ok: false, error: msg(e) }; }
}

const logout = () => { flush(); return signOut(auth).catch(() => {}); };

async function changePassword(oldPass, newPass) {
  try {
    const u = auth.currentUser;
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, oldPass));
    await updatePassword(u, newPass); return { ok: true };
  } catch (e) { return { ok: false, error: msg(e) }; }
}
// Acciones de administrador (las reglas exigen que tu uid exista en la colección admins)
const adminBan = (username, banned) => setDoc(doc(db, 'players', username.toLowerCase()), { banned: !!banned }, { merge: true }).catch(e => console.warn(e.code));
async function adminPushUser(username) {
  const n = username.toLowerCase(), v = localStorage.getItem('rc_u_' + n), ts = Date.now();
  try {
    await setDoc(doc(db, 'players', n), { u: JSON.parse(v), uts: ts, adm: ts }, { merge: true });
    const uid = (await getDoc(doc(db, 'players', n))).data().uid;
    if (uid) await setDoc(doc(db, 'users', uid, 'store', 'rc_u_' + n), { v });
  } catch (e) { console.warn('adminPushUser:', e.code || e); }
}

onAuthStateChanged(auth, user => { if (user && me()) listen(user); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

window.RCFire = { push, pushAll, flush, signUp, signIn, signOut: logout, reset, emailOf, changePassword, adminBan, adminPushUser };
