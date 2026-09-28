// ayuda.js — ayuda.html: abre una pregunta a la vez
RC.initHeader();

const items = document.querySelectorAll('.faq details');
items.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
}));
