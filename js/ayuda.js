// ayuda.js — ayuda.html: abre una pregunta a la vez y filtra las preguntas al escribir en el buscador
RC.initHeader();

const items = [...document.querySelectorAll('.faq details')];
const groups = [...document.querySelectorAll('.faq-group')];
const search = document.getElementById('faqSearch');
const none = document.getElementById('faqNone');
const term = document.getElementById('faqTerm');

items.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
}));

// Quita tildes y mayúsculas para que «contrasena» encuentre «contraseña»
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function filter() {
  const q = norm(search.value.trim());
  let shown = 0, last = null;
  items.forEach(d => {
    const match = !q || norm(d.textContent).includes(q);
    d.hidden = !match;
    if (match) { shown++; last = d; }
  });
  groups.forEach(g => { g.hidden = ![...g.querySelectorAll('details')].some(d => !d.hidden); });
  none.hidden = shown > 0;
  term.textContent = search.value.trim();
  if (q && shown === 1) last.open = true;     // un único resultado: se muestra la respuesta directamente
}
search.addEventListener('input', filter);
