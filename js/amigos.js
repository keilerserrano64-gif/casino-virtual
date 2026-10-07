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
