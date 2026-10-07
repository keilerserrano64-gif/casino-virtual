/* ============================================================
   nube.js — enlace de Royal Casino con Firebase Realtime Database
   (proyecto royal--casino). Se carga ANTES de app.js.
   Sin localStorage: los datos viven en la base de datos y se bajan al abrir cada página.

   Estructura en la base de datos:
     usuarios/{id}   credenciales (salt + hash)        -> las gestiona firebase_auth.js
     correos/{...}   índice correo -> usuario           -> las gestiona firebase_auth.js
     perfiles/{id}   cuenta (usuario, nombre, rol, baneado, creada) + partes públicas
                     u = datos del jugador, l = última vez visto, p = presencia, f = amigos
     datos/{id}      partes privadas: h historial, n notificaciones, m movimientos, s ajustes,
                     slotpend/racepend premios pendientes, ia_* modelos de la IA, craps
     compartido/     news, tickets, juegos_off, eventos

   Lectura: XMLHttpRequest síncrona al abrir la página, para que app.js (que es síncrono)
   encuentre los datos ya cargados. Escritura: fetch en cada cambio (keepalive, sobrevive a la navegación).
   Si la lectura falla (sin conexión / reglas), NO se escribe nada para no pisar datos de la nube con valores por defecto.
   ============================================================ */
(() => {
  'use strict';

  const DB = 'https://royal--casino-default-rtdb.firebaseio.com';
  const PUBLICOS = ['u', 'l', 'p', 'f'];
  const PRIVADOS = ['h', 'n', 'm', 's', 'slotpend', 'racepend', 'ia_poker', 'ia_rival', 'craps'];
  const KEY_RE = new RegExp('^rc_(' + PUBLICOS.concat(PRIVADOS).join('|') + ')_([A-Za-z0-9_]+)$');
  const COMPARTIDO = { rc_news: 'news', rc_tickets: 'tickets', rc_disabled_games: 'juegos_off', rc_events: 'eventos' };
  const ID = /^[a-z0-9_]{3,18}$/;
  const SES = 'rc_sesion=';                       // la sesión vive en window.name (solo esta pestaña); ver app.js

  const st = { loaded: false, cuentas: {} };

  const url = ruta => DB + '/' + ruta + '.json';
  function leerSync(ruta) {
    const x = new XMLHttpRequest();
    x.open('GET', url(ruta), false);
    x.send(null);
    if (x.status !== 200) throw new Error('HTTP ' + x.status + ' en ' + ruta);
    return JSON.parse(x.responseText);
  }
  function enviar(metodo, ruta, valor) {
    if (!st.loaded) return;                        // sin lectura previa correcta no se escribe
    const body = valor === undefined ? undefined : JSON.stringify(valor);
    fetch(url(ruta), { method: metodo, body, keepalive: !body || body.length < 60000 })
      .then(r => { if (!r.ok) console.warn('[RCNube]', metodo, ruta, 'HTTP', r.status); })
      .catch(e => console.warn('[RCNube]', metodo, ruta, e));
  }

  const cuentaPublica = a => ({
    username: a.username, name: a.name || a.username, role: a.role === 'admin' ? 'admin' : 'user',
    banned: !!a.banned, created: a.created || '',
  });

  /* ---- Lectura inicial: la rellena app.js llamando a hydrate(RCMem) ---- */
  function hydrate(mem) {
    st.loaded = false; st.cuentas = {};
    try {
      const perfiles = leerSync('perfiles') || {};
      const cuentas = [];
      Object.entries(perfiles).forEach(([id, p]) => {
        if (p && p.cuenta && p.cuenta.username) {
          cuentas.push({ ...p.cuenta, email: '', hash: '' });
          st.cuentas[id] = JSON.stringify(cuentaPublica(p.cuenta));
        }
        PUBLICOS.forEach(t => { if (p && typeof p[t] === 'string') mem.setItemSilent('rc_' + t + '_' + id, p[t]); });
      });
      mem.setItemSilent('rc_accounts', JSON.stringify(cuentas));

      const sesion = String(window.name || '');
      const yo = sesion.startsWith(SES) ? sesion.slice(SES.length).toLowerCase() : null;
      if (yo && ID.test(yo)) {
        const datos = leerSync('datos/' + yo) || {};
        Object.entries(datos).forEach(([t, v]) => { if (typeof v === 'string') mem.setItemSilent('rc_' + t + '_' + yo, v); });
      }
      const comp = leerSync('compartido') || {};
      Object.entries(COMPARTIDO).forEach(([clave, nombre]) => { if (typeof comp[nombre] === 'string') mem.setItemSilent(clave, comp[nombre]); });
      st.loaded = true;
    } catch (e) {
      console.warn('[RCNube] No se pudo leer la base de datos; los cambios no se guardarán.', e);
      document.addEventListener('DOMContentLoaded', () => {
        const b = document.createElement('div');
        b.textContent = 'Sin conexión con la base de datos: los cambios no se guardarán.';
        b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:8px 12px;background:#7a1f1f;color:#fff;font:14px sans-serif;text-align:center';
        document.body.appendChild(b);
      });
    }
    return st.loaded;
  }

  /* ---- Escritura: app.js llama a onChange(clave, valor|null) en cada setItem/removeItem ---- */
  function syncCuentas(json) {
    let lista = [];
    try { lista = JSON.parse(json) || []; } catch (e) { /* lista vacía */ }
    const ahora = {};
    lista.forEach(a => {
      const id = String(a.username || '').toLowerCase();
      if (id === 'admin' || !ID.test(id)) return;                // el admin de ejemplo no se sube
      ahora[id] = JSON.stringify(cuentaPublica(a));
    });
    Object.entries(ahora).forEach(([id, j]) => {
      if (st.cuentas[id] === j) return;
      const nueva = JSON.parse(j), prev = st.cuentas[id] ? JSON.parse(st.cuentas[id]) : null;
      enviar('PUT', 'perfiles/' + id + '/cuenta', nueva);
      if (prev && prev.banned !== nueva.banned) enviar('PATCH', 'usuarios/' + id, { baneado: nueva.banned });   // el login lo comprueba aquí
    });
    Object.keys(st.cuentas).forEach(id => { if (!(id in ahora)) { enviar('DELETE', 'perfiles/' + id); enviar('DELETE', 'datos/' + id); } });
    st.cuentas = ahora;
  }

  function onChange(clave, valor) {
    if (COMPARTIDO[clave]) return enviar(valor === null ? 'DELETE' : 'PUT', 'compartido/' + COMPARTIDO[clave], valor === null ? undefined : valor);
    if (clave === 'rc_accounts') return syncCuentas(valor);
    const m = KEY_RE.exec(clave);
    if (!m) return;                                              // claves temporales (chat, bote, sonido...) se quedan en memoria
    const t = m[1], id = m[2].toLowerCase();
    if (!ID.test(id) || id === 'guest') return;
    const base = PUBLICOS.includes(t) ? 'perfiles/' : 'datos/';
    enviar(valor === null ? 'DELETE' : 'PUT', base + id + '/' + t, valor === null ? undefined : valor);
  }

  // Bloqueo permanente al borrar una cuenta (el login comprueba usuarios/{id}.baneado)
  const bloquear = id => { id = String(id || '').toLowerCase(); if (ID.test(id) && id !== 'admin') enviar('PATCH', 'usuarios/' + id, { baneado: true }); };

  window.RCNube = { hydrate, onChange, bloquear, ready: () => st.loaded, SES };
})();
