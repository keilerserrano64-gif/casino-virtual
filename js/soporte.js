// soporte.js — lógica de soporte.html: sistema de tickets (usa RC de app.js)
RC.initHeader();

const form = document.querySelector('form[data-form="ticket"]');
const body = document.getElementById('ticketBody');
const err = document.getElementById('formError');
const area = document.getElementById('descripcion');
const count = document.getElementById('descCount');
const STATUS = { open: ['Abierto', 'open'], closed: ['Resuelto', 'closed'] };

function render() {
  const mine = RC.getTickets().filter(t => t.user === RC.currentUser());
  body.innerHTML = mine.length ? mine.map(t => `
    <tr><td>#${t.id}</td><td>${RC.fmtDate(t.date)}</td><td>${RC.esc(t.category)}</td>
    <td><span class="rc-badge ${STATUS[t.status][1]}">${STATUS[t.status][0]}</span></td></tr>`).join('')
    : '<tr><td colspan="4" class="rc-empty">Aún no has enviado solicitudes.</td></tr>';
}

// Contador de caracteres (máximo 500)
function paintCount() {
  count.textContent = `${area.value.length} / ${area.maxLength}`;
  count.classList.toggle('warn', area.value.length >= area.maxLength - 50);
}
area.addEventListener('input', paintCount);

form.addEventListener('submit', e => {
  e.preventDefault();
  const desc = document.getElementById('descripcion').value.trim();
  err.classList.remove('form-ok');
  if (desc.length < 10) { err.textContent = 'Describe tu problema con al menos 10 caracteres.'; return; }
  if (!confirm('¿Enviar la solicitud?')) return;
  const id = RC.addTicket(document.getElementById('categoria').value, desc);
  form.reset(); paintCount();
  err.textContent = `Solicitud #${id} enviada. Te avisaremos cuando esté resuelta.`;
  err.classList.add('form-ok');
  render(); paintCount();
});
render(); paintCount();
