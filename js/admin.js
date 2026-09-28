// admin.js — lógica común de las páginas de /admin (usa RC de app.js)
// Cada bloque se activa solo si la página tiene los elementos correspondientes.
RC.initHeader();

const $ = id => document.getElementById(id);
const fmt = RC.formatNumber;
const stats = RC.globalStats();
const formMsg = (form, text, ok) => { const e = form.querySelector('#formError'); e.textContent = text; e.classList.toggle('form-ok', !!ok); };

/* ---- Panel principal ---- */
if ($('aUsers')) {
  $('aUsers').textContent = fmt(stats.users);
  $('aGames').textContent = fmt(stats.games);
  $('aOnline').textContent = fmt(Math.max(stats.online, 1));
  $('aAchv').textContent = fmt(stats.ach);
}

/* ---- Usuarios ---- */
if ($('userBody')) {
  const search = $('userSearch');
  const renderUsers = () => {
    const q = search.value.trim().toLowerCase();
    const list = RC.getAccounts().filter(a => !q || a.username.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    $('userBody').innerHTML = list.length ? list.map(a => {
      const d = RC.getUser(a.username), admin = a.role === 'admin';
      return `<tr>
        <td>${RC.esc(a.username)}${admin ? ' 👨‍💼' : ''}</td><td>${RC.esc(a.email)}</td><td>${d.level}</td><td>${fmt(d.coins)}</td>
        <td><span class="rc-badge ${a.banned ? 'lose' : 'on'}">${a.banned ? 'Bloqueado' : 'Activo'}</span></td>
        <td>${admin ? '—' : `<button class="rc-btn rc-btn-ghost rc-btn-sm" data-act="ban" data-u="${RC.esc(a.username)}">${a.banned ? 'Desbloquear' : 'Bloquear'}</button>
          <button class="rc-btn rc-btn-burgundy rc-btn-sm" data-act="del" data-u="${RC.esc(a.username)}">Eliminar</button>`}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="rc-empty">No hay usuarios.</td></tr>';
  };
  $('userBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const u = b.dataset.u, acc = RC.getAccounts().find(a => a.username === u);
    if (b.dataset.act === 'ban') {
      if (!confirm(`¿${acc.banned ? 'Desbloquear' : 'Bloquear'} a ${u}?`)) return;
      RC.setBanned(u, !acc.banned);
    } else {
      if (!confirm(`¿Eliminar la cuenta de ${u}? Se borrarán todos sus datos.`)) return;
      RC.deleteAccount(u);
    }
    renderUsers();
  });
  search.addEventListener('input', renderUsers);
  renderUsers();
}

/* ---- Juegos activos ---- */
if ($('gameToggles')) {
  document.querySelectorAll('#gameToggles input[data-game]').forEach(cb => {
    cb.checked = RC.isGameEnabled(cb.dataset.game);
    cb.addEventListener('change', () => {
      RC.setGameEnabled(cb.dataset.game, cb.checked);
      RC.toast('info', `${cb.dataset.game}: ${cb.checked ? 'activado' : 'desactivado'}`);
    });
  });
}

/* ---- Estadísticas y recompensas ---- */
if ($('eCoins')) {
  const counts = Object.entries(stats.counts).sort((a, b) => b[1] - a[1]);
  $('eCoins').textContent = fmt(stats.coins);
  $('eGames').textContent = fmt(stats.games);
  $('eFav').textContent = counts.length ? counts[0][0] : '—';
  RC.barChart($('chartAdmin'), counts.map(([label, value]) => ({ label, value })));
}
const rewardForm = document.querySelector('form[data-form="reward"]');
if (rewardForm) rewardForm.addEventListener('submit', e => {
  e.preventDefault();
  const user = $('rewUser').value.trim(), amount = Math.floor(Number($('rewAmount').value));
  if (!user || !(amount > 0)) return formMsg(rewardForm, 'Indica un usuario y una cantidad válida.');
  if (amount > 10000) return formMsg(rewardForm, 'El máximo por recompensa es 10.000 monedas.');
  if (!confirm(`¿Entregar ${fmt(amount)} monedas a ${user}?`)) return;
  const r = RC.adminGrant(user, amount);
  if (!r.ok) return formMsg(rewardForm, r.error);
  formMsg(rewardForm, `Entregadas ${fmt(amount)} monedas a ${r.username}.`, true);
  rewardForm.reset();
});

/* ---- Noticias ---- */
const newsForm = document.querySelector('form[data-form="news"]');
if (newsForm) {
  const renderNews = () => {
    const list = RC.getNews();
    $('newsBody').innerHTML = list.length ? list.map(n => `
      <tr><td>${RC.esc(n.date)}</td><td>${RC.esc(n.title)}</td>
      <td><button class="rc-btn rc-btn-burgundy rc-btn-sm" data-id="${n.id}">Eliminar</button></td></tr>`).join('')
      : '<tr><td colspan="3" class="rc-empty">No hay noticias.</td></tr>';
  };
  newsForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = $('newsTitle').value.trim(), text = $('newsText').value.trim();
    if (!title || !text) return formMsg(newsForm, 'Completa el título y el contenido.');
    RC.addNews(title, text); newsForm.reset(); formMsg(newsForm, 'Noticia publicada.', true); renderNews();
  });
  $('newsBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (b && confirm('¿Eliminar esta noticia?')) { RC.deleteNews(Number(b.dataset.id)); renderNews(); }
  });
  renderNews();
}

/* ---- Soporte (solo en admin/soporte.html: tiene columna de usuario) ---- */
if ($('ticketBody')) {
  const renderTickets = () => {
    const list = RC.getTickets();
    $('ticketBody').innerHTML = list.length ? list.map(t => `
      <tr><td>#${t.id}</td><td>${RC.esc(t.user)}</td><td>${RC.esc(t.category)}</td><td>${RC.esc(t.description)}</td>
      <td><span class="rc-badge ${t.status}">${t.status === 'open' ? 'Abierto' : 'Resuelto'}</span></td>
      <td><button class="rc-btn rc-btn-ghost rc-btn-sm" data-act="toggle" data-id="${t.id}">${t.status === 'open' ? 'Resolver' : 'Reabrir'}</button>
      <button class="rc-btn rc-btn-burgundy rc-btn-sm" data-act="del" data-id="${t.id}">Eliminar</button></td></tr>`).join('')
      : '<tr><td colspan="6" class="rc-empty">No hay solicitudes.</td></tr>';
  };
  $('ticketBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const id = Number(b.dataset.id), t = RC.getTickets().find(x => x.id === id);
    if (b.dataset.act === 'toggle') RC.setTicketStatus(id, t.status === 'open' ? 'closed' : 'open');
    else if (confirm('¿Eliminar esta solicitud?')) RC.deleteTicket(id);
    renderTickets();
  });
  renderTickets();
}
