// notificaciones.js — lógica de notificaciones.html (usa RC de app.js)
RC.initHeader();

const list = document.getElementById('notifList');
const count = document.getElementById('notifCount');

function render() {
  const items = RC.getNotifications();
  count.textContent = `${RC.unreadCount()} sin leer`;
  list.innerHTML = items.map(n => `
    <li class="${n.read ? '' : 'unread'}"><span class="ic">${n.icon}</span><span>${RC.esc(n.text)}</span><time>${RC.fmtDate(n.date)}</time></li>`).join('');
}

document.getElementById('markReadBtn').addEventListener('click', () => { RC.markAllRead(); render(); });
document.getElementById('clearNotifBtn').addEventListener('click', () => {
  if (!RC.getNotifications().length || !confirm('¿Borrar todas las notificaciones?')) return;
  RC.clearNotifications(); render();
});
render();
