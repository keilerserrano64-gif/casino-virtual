// amigos.js — buscar jugadores, solicitudes y lista de amigos con estado en línea (usa RC de app.js)
RC.initHeader();
const $ = id => document.getElementById(id);
const esc = RC.esc;
const ago = ts => { if (!ts) return 'nunca'; const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const status = p => p.online ? (p.game ? `🟢 Jugando ${esc(p.game)}` : '🟢 En línea') : `⚫ Desconectado · ${ago(p.ts)}`;
const row = (p, extra, actions) => `<div class="fr-row"><span class="fr-dot ${p.online ? 'on' : ''}"></span>
  <div class="fr-info"><b>${esc(p.name || p.username)}</b><small>${status(p)}${extra || ''}</small></div><div class="fr-actions">${actions}</div></div>`;
const btn = (act, who, label, cls) => `<button type="button" class="rc-btn ${cls} rc-btn-sm" data-act="${act}" data-who="${esc(who)}">${label}</button>`;

function render() {
  const soc = RC.getSocial();
  const friends = RC.friendsStatus();
  $('frOnline').textContent = `${friends.filter(f => f.online).length} en línea`;
  $('frFriends').innerHTML = friends.length ? friends.map(f => row(f, '', btn('remove', f.name, 'Quitar', 'rc-btn-ghost'))).join('')
    : '<div class="fr-empty">Aún no tienes amigos. Búscalos arriba y envía una solicitud.</div>';

  $('frInBox').hidden = !soc.incoming.length; $('frInCount').textContent = soc.incoming.length;
  $('frIn').innerHTML = soc.incoming.map(n => row(RC.searchPlayers(n).find(p => p.username === n) || { username: n }, '', btn('accept', n, 'Aceptar', 'rc-btn-gold') + btn('decline', n, 'Rechazar', 'rc-btn-ghost'))).join('');
  $('frOutBox').hidden = !soc.outgoing.length;
  $('frOut').innerHTML = soc.outgoing.map(n => row(RC.searchPlayers(n).find(p => p.username === n) || { username: n }, '', btn('cancel', n, 'Cancelar', 'rc-btn-ghost'))).join('');

  const res = RC.searchPlayers($('frSearch').value);
  const action = p => p.rel === 'friend' ? '<span class="rc-badge win">Amigos</span>'
    : p.rel === 'outgoing' ? '<span class="rc-badge pending">Solicitud enviada</span>'
    : p.rel === 'incoming' ? btn('accept', p.username, 'Aceptar', 'rc-btn-gold')
    : btn('add', p.username, '➕ Agregar', 'rc-btn-gold');
  $('frResults').innerHTML = res.length ? res.map(p => row(p, ` · Nv. ${p.level}`, action(p))).join('')
    : '<div class="fr-empty">No hay otros jugadores registrados' + ($('frSearch').value ? ' con ese nombre.' : ' todavía.') + '</div>';
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const who = b.dataset.who, msg = $('frMsg'); msg.textContent = ''; msg.classList.remove('form-ok');
  if (b.dataset.act === 'add') {
    const r = RC.sendFriendRequest(who);
    msg.textContent = r.ok ? (r.status === 'friends' ? `¡Ahora eres amigo de ${who}!` : `Solicitud enviada a ${who}.`) : r.error;
    if (r.ok) msg.classList.add('form-ok');
  } else if (b.dataset.act === 'accept') { RC.acceptFriend(who); msg.textContent = `¡Ahora eres amigo de ${who}!`; msg.classList.add('form-ok'); }
  else if (b.dataset.act === 'decline' || b.dataset.act === 'cancel') RC.dropRequest(who);
  else if (b.dataset.act === 'remove' && confirm(`¿Quitar a ${who} de tus amigos?`)) RC.removeFriend(who);
  render();
});
$('frSearch').addEventListener('input', render);
window.addEventListener('storage', render);
setInterval(() => { if (!document.hidden && document.activeElement !== $('frSearch')) render(); }, 4000);   // estado en línea al día
render();

/* ============================================================
   Salas con código aleatorio — Firebase Realtime Database: salas/{CODIGO}
   { codigo, nombre, juego, archivo, anfitrion, creada, max,
     miembros: {usuario: ts}, invitados: {usuario: true} }
   Los jugadores "conectados" se leen en vivo de perfiles/{id}/p (misma presencia que usa app.js).
   ============================================================ */
(() => {
  const DB = 'https://royal--casino-default-rtdb.firebaseio.com';
  const ACTIVE_MS = 2 * 60 * 1000, MAX_AGE = 6 * 3600 * 1000, MAX_PLAYERS = 8;
  const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // sin 0/O/1/I para evitar confusiones
  const me = (RC.currentUser && RC.currentUser()) || null;
  const box = $('rmBox');
  if (!box) return;
  if (!me) { box.innerHTML = '<h2>🎲 Salas</h2><div class="fr-empty">Inicia sesión para crear salas o unirte con un código.</div>'; return; }

  const sel = new Set();
  let online = [];                                           // [{id, name, game}]
  let rooms = [];
  const msg = $('rmMsg');
  const say = (t, ok) => { msg.textContent = t || ''; msg.classList.toggle('form-ok', !!ok); };

  async function db(method, ruta, body) {
    const r = await fetch(`${DB}/${ruta}.json`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const newCode = () => { const a = new Uint32Array(6); crypto.getRandomValues(a); return Array.from(a, n => ALFA[n % ALFA.length]).join(''); };
  const keys = o => Object.keys(o || {});

  /* ---- Jugadores conectados ahora (presencia en vivo) ---- */
  async function loadOnline() {
    const per = (await db('GET', 'perfiles')) || {};
    const now = Date.now();
    online = [];
    Object.entries(per).forEach(([id, p]) => {
      if (!p || !p.cuenta || id === me || p.cuenta.banned || p.cuenta.role === 'admin') return;
      let pr = null, ts = 0;
      try { pr = JSON.parse(p.p); ts = pr && pr.ts || 0; } catch (e) { /* sin presencia */ }
      if (!ts) { try { ts = JSON.parse(p.l) || 0; } catch (e) { /* nunca visto */ } }
      if (now - ts < ACTIVE_MS) online.push({ id, name: p.cuenta.name || id, game: pr && pr.game || null });
    });
    online.sort((a, b) => a.name.localeCompare(b.name));
    [...sel].forEach(id => { if (!online.some(o => o.id === id)) sel.delete(id); });   // ya no conectado → se quita
  }

  /* ---- Mis salas ---- */
  async function loadRooms() {
    const all = (await db('GET', 'salas')) || {};
    const now = Date.now();
    rooms = [];
    for (const [code, r] of Object.entries(all)) {
      if (!r || !r.anfitrion) continue;
      if (now - (r.creada || 0) > MAX_AGE) { if (r.anfitrion === me) db('DELETE', 'salas/' + code).catch(() => {}); continue; }
      const m = (r.miembros || {})[me], i = (r.invitados || {})[me];
      if (m || i) rooms.push({ ...r, codigo: code, soyMiembro: !!m });
    }
    rooms.sort((a, b) => (b.creada || 0) - (a.creada || 0));
  }

  /* ---- Pintado ---- */
  function renderPick() {
    $('rmSel').textContent = `${sel.size} elegido${sel.size === 1 ? '' : 's'}`;
    $('rmPick').innerHTML = online.length ? online.map(o => `<label class="fr-row rm-pick ${sel.has(o.id) ? 'sel' : ''}">
      <input type="checkbox" data-rm="pick" data-who="${esc(o.id)}" ${sel.has(o.id) ? 'checked' : ''}>
      <span class="fr-dot on"></span><div class="fr-info"><b>${esc(o.name)}</b><small>🟢 ${o.game ? 'Jugando ' + esc(o.game) : 'En línea'}</small></div></label>`).join('')
      : '<div class="fr-empty">No hay otros jugadores conectados ahora mismo. Puedes crear la sala igual y compartir el código.</div>';
  }
  function renderRooms() {
    $('rmCount').textContent = rooms.length;
    const isOn = id => online.some(o => o.id === id);
    const chip = (id, inv) => `<span class="rm-chip ${inv ? 'inv' : ''}"><span class="fr-dot ${id === me || isOn(id) ? 'on' : ''}"></span>${esc(id)}${id === me ? ' (tú)' : ''}${inv ? ' · invitado' : ''}</span>`;
    $('rmList').innerHTML = rooms.length ? rooms.map(r => {
      const mem = keys(r.miembros), inv = keys(r.invitados);
      const act = r.soyMiembro
        ? `<button type="button" class="rc-btn rc-btn-ghost rc-btn-sm" data-rm="copy" data-code="${r.codigo}">📋 Copiar código</button>`
          + (r.archivo ? `<a class="rc-btn rc-btn-gold rc-btn-sm" href="${esc(r.archivo)}">▶ Ir a ${esc(r.juego)}</a>` : '')
          + (r.anfitrion === me ? `<button type="button" class="rc-btn rc-btn-ghost rc-btn-sm" data-rm="close" data-code="${r.codigo}">Cerrar sala</button>`
                                : `<button type="button" class="rc-btn rc-btn-ghost rc-btn-sm" data-rm="leave" data-code="${r.codigo}">Salir</button>`)
        : `<button type="button" class="rc-btn rc-btn-gold rc-btn-sm" data-rm="accept" data-code="${r.codigo}">Entrar</button>`
          + `<button type="button" class="rc-btn rc-btn-ghost rc-btn-sm" data-rm="decline" data-code="${r.codigo}">Rechazar</button>`;
      return `<div class="fr-row rm-row"><div class="fr-info"><b>${esc(r.nombre || 'Sala de ' + r.anfitrion)}<span class="rm-code">${r.codigo}</span></b>
        <small>Anfitrión: ${esc(r.anfitrion)} · ${r.juego ? esc(r.juego) : 'Cualquier juego'} · ${mem.length}/${r.max || MAX_PLAYERS} jugadores</small>
        <div class="rm-members">${mem.map(m => chip(m)).join('')}${inv.map(m => chip(m, true)).join('')}</div></div><div class="fr-actions">${act}</div></div>`;
    }).join('') : '<div class="fr-empty">No estás en ninguna sala. Crea una o escribe un código.</div>';
  }

  let busy = false;
  async function refresh() {
    if (busy) return; busy = true;
    try { await Promise.all([loadOnline(), loadRooms()]); renderPick(); renderRooms(); }
    catch (e) { say('No se pudo leer las salas (' + e.message + '). Revisa las reglas de la base de datos.'); }
    busy = false;
  }

  /* ---- Acciones ---- */
  async function createRoom() {
    say(''); $('rmCreate').disabled = true;
    try {
      let code, tries = 0;
      do { code = newCode(); } while (tries++ < 6 && await db('GET', 'salas/' + code) !== null);
      const [juego, archivo] = ($('rmGame').value || '|').split('|');
      const invitados = {}; [...sel].slice(0, MAX_PLAYERS - 1).forEach(id => { invitados[id] = true; });
      const room = { codigo: code, nombre: $('rmName').value.trim().slice(0, 30), juego: juego || '', archivo: archivo || '', anfitrion: me,
                     creada: Date.now(), max: MAX_PLAYERS, miembros: { [me]: Date.now() } };
      if (keys(invitados).length) room.invitados = invitados;
      await db('PUT', 'salas/' + code, room);
      keys(invitados).forEach(id => RC.notify(`${me} te invitó a la sala ${code}${juego ? ' (' + juego + ')' : ''}. Entra desde Amigos.`, '🎲', id));
      sel.clear(); $('rmName').value = '';
      say(`Sala creada. Código: ${code}`, true);
    } catch (e) { say('No se pudo crear la sala: ' + e.message); }
    $('rmCreate').disabled = false;
    refresh();
  }
  async function joinRoom(code, viaInvite) {
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return say('El código tiene 6 letras o números.');
    try {
      const r = await db('GET', 'salas/' + code);
      if (!r) return say('Esa sala no existe o ya se cerró.');
      if (!(r.miembros || {})[me] && keys(r.miembros).length >= (r.max || MAX_PLAYERS)) return say('La sala está llena.');
      await db('PATCH', `salas/${code}/miembros`, { [me]: Date.now() });
      if ((r.invitados || {})[me]) await db('DELETE', `salas/${code}/invitados/${me}`);
      if (!(r.miembros || {})[me]) RC.notify(`${me} se unió a tu sala ${code}.`, '🚪', r.anfitrion);
      say(`Estás dentro de la sala ${code}.`, true); $('rmCode').value = '';
    } catch (e) { say('No se pudo entrar: ' + e.message); }
    refresh();
  }
  async function leaveRoom(code, close) {
    try {
      const r = await db('GET', 'salas/' + code);
      if (!r) return refresh();
      if (close || r.anfitrion === me || keys(r.miembros).filter(m => m !== me).length === 0) await db('DELETE', 'salas/' + code);
      else await db('DELETE', `salas/${code}/miembros/${me}`);
      say('');
    } catch (e) { say('No se pudo completar la acción: ' + e.message); }
    refresh();
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-rm]'); if (!b || b.tagName === 'INPUT') return;
    const act = b.dataset.rm, code = b.dataset.code;
    if (act === 'copy') { try { await navigator.clipboard.writeText(code); say(`Código ${code} copiado.`, true); } catch (er) { say('Código: ' + code, true); } }
    else if (act === 'accept') joinRoom(code, true);
    else if (act === 'decline') { try { await db('DELETE', `salas/${code}/invitados/${me}`); } catch (er) { say('No se pudo rechazar.'); } refresh(); }
    else if (act === 'leave') leaveRoom(code, false);
    else if (act === 'close' && confirm(`¿Cerrar la sala ${code} para todos?`)) leaveRoom(code, true);
  });
  document.addEventListener('change', e => {
    const c = e.target.closest('input[data-rm="pick"]'); if (!c) return;
    if (c.checked) { if (sel.size >= MAX_PLAYERS - 1) { c.checked = false; return say(`Máximo ${MAX_PLAYERS} jugadores por sala.`); } sel.add(c.dataset.who); } else sel.delete(c.dataset.who);
    renderPick();
  });
  $('rmCreate').addEventListener('click', createRoom);
  $('rmJoin').addEventListener('click', () => joinRoom($('rmCode').value));
  $('rmCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('rmCode').value); });
  $('rmCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  refresh();
  setInterval(() => { if (!document.hidden && !['rmName', 'rmCode'].includes(document.activeElement.id)) refresh(); }, 5000);
})();
