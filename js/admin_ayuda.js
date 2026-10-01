// admin_ayuda.js — centro de ayuda del administrador: bandeja, respuestas, notificaciones y registro de juego responsable
RC.initHeader();
const $ = id => document.getElementById(id);
const ST = { open: 'Abierta', progress: 'En curso', closed: 'Resuelta' };
const SRC = { formulario: 'Formulario / correo', chat: 'Chat en vivo' };
let current = null;

const CATS = [...new Set(['Problema con mi cuenta', 'Problema con un juego', 'Monedas o billetera', 'Bonos y promociones', 'Juego responsable', 'Sugerencia', 'Otro', 'Chat en vivo'])];
$('fCat').insertAdjacentHTML('beforeend', CATS.map(c => `<option>${RC.esc(c)}</option>`).join(''));

function stats() {
  const t = RC.getTickets();
  $('sNew').textContent = t.filter(x => !x.readByAdmin && x.status !== 'closed').length;
  $('sOpen').textContent = t.filter(x => x.status === 'open').length;
  $('sProg').textContent = t.filter(x => x.status === 'progress').length;
  $('sDone').textContent = t.filter(x => x.status === 'closed').length;
  $('sExc').textContent = RC.getEvents().filter(e => e.type === 'autoexclusion').length;
}

function renderInbox() {
  const q = $('fText').value.trim().toLowerCase(), fs = $('fStatus').value, fc = $('fCat').value;
  const list = RC.getTickets().filter(t => (!fs || t.status === fs) && (!fc || t.category === fc) && (!q || (t.user + ' ' + t.description).toLowerCase().includes(q)))
    .sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || (b.priority === 'alta') - (a.priority === 'alta') || new Date(b.date) - new Date(a.date));
  $('inbox').innerHTML = list.length ? list.map(t => `<li><button type="button" class="ah-item${t.id === current ? ' on' : ''}${!t.readByAdmin && t.status !== 'closed' ? ' unread' : ''}" data-id="${t.id}">
    <span class="l1"><strong>#${t.id} · ${RC.esc(t.user)}</strong><span>${t.priority === 'alta' ? '<span class="tag alta">Prioridad alta</span> ' : ''}<span class="tag ${t.status}">${ST[t.status]}</span></span></span>
    <span class="l2">${RC.esc(t.category)} — ${RC.esc(t.description)}</span></button></li>`).join('') : '<li class="ah-empty">No hay solicitudes con estos filtros.</li>';
}

function renderDetail() {
  const t = RC.getTickets().find(x => x.id === current);
  if (!t) { $('detail').innerHTML = '<p class="ah-empty">Seleccione una solicitud de la bandeja para leerla y responder.</p>'; return; }
  $('detail').innerHTML = `<h2>Solicitud #${t.id} · ${RC.esc(t.category)}</h2>
    <p class="ah-meta"><span>De: <b>${RC.esc(t.user)}</b></span><span>${RC.fmtDate(t.date)}</span><span>Canal: ${SRC[t.source] || 'Formulario / correo'}</span><span class="tag ${t.status}">${ST[t.status]}</span>${t.priority === 'alta' ? '<span class="tag alta">Prioridad alta</span>' : ''}</p>
    ${(t.attachments || []).length ? `<p class="ah-meta">Adjuntos: ${t.attachments.map(RC.esc).join(', ')}</p>` : ''}
    <div class="ah-msg"><small>${RC.esc(t.user)}</small>${RC.esc(t.description)}</div>
    ${(t.replies || []).map(r => `<div class="ah-msg ${r.by === 'admin' ? 'adm' : ''}"><small>${r.by === 'admin' ? 'Soporte (' + RC.esc(r.user) + ')' : RC.esc(r.user)} · ${RC.fmtDate(r.date)}</small>${RC.esc(r.text)}</div>`).join('')}
    <form class="ah-reply" id="replyForm"><textarea id="replyText" rows="4" maxlength="1000" placeholder="Escriba su respuesta al jugador" aria-label="Respuesta"></textarea>
      <div class="ah-actions"><button class="rc-btn rc-btn-gold rc-btn-sm" type="submit">Enviar respuesta</button>
      <button class="rc-btn rc-btn-ghost rc-btn-sm" type="button" data-act="${t.status === 'closed' ? 'open' : 'closed'}">${t.status === 'closed' ? 'Reabrir' : 'Marcar como resuelta'}</button>
      <button class="rc-btn rc-btn-burgundy rc-btn-sm" type="button" data-act="del">Eliminar</button></div></form>`;
}

function renderFeeds() {
  const n = RC.getNotifications();
  $('notifs').innerHTML = n.length ? n.slice(0, 30).map(x => `<li class="${x.read ? '' : 'new'}">${RC.esc(x.text)}<time>${RC.fmtDate(x.date)}</time></li>`).join('') : '<li class="ah-empty">Sin notificaciones.</li>';
  const ev = RC.getEvents();
  $('events').innerHTML = ev.length ? ev.slice(0, 30).map(x => `<li>${RC.esc(x.text)}<time>${RC.fmtDate(x.date)}</time></li>`).join('') : '<li class="ah-empty">Sin eventos registrados.</li>';
}

const refresh = () => { stats(); renderInbox(); renderDetail(); renderFeeds(); };

$('inbox').addEventListener('click', e => {
  const b = e.target.closest('.ah-item'); if (!b) return;
  current = +b.dataset.id; RC.markTicketRead(current); refresh();
});
['fText', 'fStatus', 'fCat'].forEach(id => $(id).addEventListener('input', renderInbox));
$('detail').addEventListener('submit', e => {
  e.preventDefault(); const txt = $('replyText').value.trim();
  if (!txt) return $('replyText').focus();
  RC.replyTicket(current, txt); refresh();
});
$('detail').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  if (b.dataset.act === 'del') { if (!confirm('¿Eliminar esta solicitud? No se puede deshacer.')) return; RC.deleteTicket(current); current = null; }
  else RC.setTicketStatus(current, b.dataset.act);
  refresh();
});
$('readAll').addEventListener('click', () => { RC.markAllRead(); refresh(); });
refresh();
