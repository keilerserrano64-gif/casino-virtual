// ranking.js — lógica de ranking.html (usa RC de app.js)
RC.initHeader();

let period = 'semanal';
const body = document.getElementById('rankBody');
const meLine = document.getElementById('rankMe');

function render() {
  const list = RC.getRanking(period).slice(0, 25);
  body.innerHTML = list.map((p, i) => `
    <tr class="${p.me ? 'me' : ''}">
      <td>${i + 1}</td><td>${RC.esc(p.name)}${p.me ? ' (tú)' : ''}</td>
      <td>${p.level}</td><td>${RC.formatNumber(p.xp)}</td>
    </tr>`).join('');
  const all = RC.getRanking(period);
  const pos = all.findIndex(p => p.me);
  meLine.textContent = pos >= 0 ? `Tu posición: #${pos + 1} de ${all.length}` : '';
}

document.querySelectorAll('#rankTabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#rankTabs button').forEach(b => { b.classList.remove('rc-btn-gold'); b.classList.add('rc-btn-ghost'); });
    btn.classList.remove('rc-btn-ghost'); btn.classList.add('rc-btn-gold');
    period = btn.dataset.period;
    render();
  });
});
render();
