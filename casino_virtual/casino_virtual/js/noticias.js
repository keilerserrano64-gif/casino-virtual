// noticias.js — lógica de noticias.html (usa RC de app.js)
RC.initHeader();

const box = document.getElementById('newsList');
const news = RC.getNews();
box.innerHTML = news.length
  ? news.map(n => `<article class="news-item"><h3>${n.icon || '📰'} ${RC.esc(n.title)}</h3><p>${RC.esc(n.text)}</p><time>${RC.esc(n.date)}</time></article>`).join('')
  : '<div class="rc-empty">No hay noticias todavía.</div>';
