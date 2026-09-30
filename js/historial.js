// historial.js — lógica de historial.html (usa RC de app.js)
RC.initHeader();

const gameSel = document.getElementById('filterGame');
const resultSel = document.getElementById('filterResult');

// Rellena el filtro de juegos con los que ya jugó el usuario
[...new Set(RC.getHistory().map(h => h.game.split(' · ')[0]))].sort().forEach(g => {
  const o = document.createElement('option'); o.value = g; o.textContent = g; gameSel.appendChild(o);
});

function render() {
  const all = RC.getHistory();
  const history = all.filter(h =>
    (gameSel.value === 'todos' || h.game.split(' · ')[0] === gameSel.value) &&
    (resultSel.value === 'todos' || h.result === resultSel.value));
  document.getElementById('countLabel').textContent = `${history.length} de ${all.length} partidas`;
  const wins = history.filter(h => h.result === 'win').length;
  document.getElementById('hsGames').textContent = RC.formatNumber(history.length);
  document.getElementById('hsWins').textContent = RC.formatNumber(wins);
  document.getElementById('hsLosses').textContent = RC.formatNumber(history.length - wins);
  document.getElementById('hsRate').textContent = history.length ? Math.round(wins / history.length * 100) + '%' : '0%';
  const wrap = document.getElementById('tableWrap');

  if (history.length === 0) {
    wrap.innerHTML = '<div class="rc-empty">No hay partidas para mostrar. Ve a los juegos y empieza a apostar.</div>';
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap"><table class="rc-table">
      <thead><tr><th>Fecha</th><th>Juego</th><th>Resultado</th><th>Apuesta</th><th>Ganancia</th><th>Saldo</th></tr></thead>
      <tbody>
        ${history.map(h => `
          <tr>
            <td>${RC.fmtDate(h.date)}</td>
            <td>${RC.esc(h.game)}</td>
            <td><span class="rc-badge ${h.result}">${h.result === 'win' ? 'Ganada' : 'Perdida'}</span></td>
            <td>${RC.formatNumber(h.wager)}</td>
            <td>${h.payout > 0 ? '+' + RC.formatNumber(h.payout) : '—'}</td>
            <td>${RC.formatNumber(h.balance)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

gameSel.addEventListener('change', render);
resultSel.addEventListener('change', render);

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('¿Borrar todo tu historial de partidas?')) return;
  RC.clearHistory();
  render();
  RC.toast('info', 'Historial borrado');
});

render();
