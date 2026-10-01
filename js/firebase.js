// firebase.js — conecta Royal Casino con Firebase (Authentication + Firestore).
// La app sigue usando localStorage como caché rápida; este módulo la refleja en la nube:
//   Auth      -> correo + contraseña (las contraseñas NUNCA se guardan en Firestore)
//   Firestore -> users/{uid}/store/{clave}  datos del jugador (monedas, historial, notificaciones, ajustes, social)
//             -> usernames/{usuario}        reserva de nombre de usuario (-> correo, para iniciar sesión con usuario)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
         sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
const pending = {};                                // clave -> valor, a la espera de subir
let timer = null;

const me = () => (window.RC && RC.currentUser() ? RC.currentUser().toLowerCase() : null);
const syncable = key => { const m = MINE.exec(key); return !!m && m[2] === me(); };
const store = key => doc(db, 'users', auth.currentUser.uid, 'store', key);

async function flush() {
  clearTimeout(timer); timer = null;
  if (!auth.currentUser) return;
  const batch = Object.entries(pending); Object.keys(pending).forEach(k => delete pending[k]);
  await Promise.all(batch.map(([k, v]) => setDoc(store(k), { v }).catch(e => { pending[k] = v; console.warn('Firebase:', e.code || e); })));
}
function push(key, val) {                          // lo llama RC (app.js) en cada escritura
  if (!auth.currentUser || !syncable(key)) return;
  pending[key] = JSON.stringify(val);
  clearTimeout(timer); timer = setTimeout(flush, 1500);
}
function pushAll() {                               // sube todo lo del jugador actual (p. ej. al registrarse)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (syncable(k)) pending[k] = localStorage.getItem(k);
  }
  return flush();
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
    return { ok: true, meta };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

async function reset(email) {
  try { await sendPasswordResetEmail(auth, email); return { ok: true }; }
  catch (e) { return { ok: false, error: msg(e) }; }
}

const logout = () => { flush(); return signOut(auth).catch(() => {}); };

onAuthStateChanged(auth, user => { if (user && me()) pushAll(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

window.RCFire = { push, pushAll, flush, signUp, signIn, signOut: logout, reset, emailOf };
