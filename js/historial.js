// historial.js — lógica de historial.html (usa RC de app.js)

RC.initHeader();

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function render() {
  const history = RC.getHistory();
  document.getElementById('countLabel').textContent = `${history.length} partidas registradas`;
  const wrap = document.getElementById('tableWrap');

  if (history.length === 0) {
    wrap.innerHTML = '<div class="rc-empty">Todavía no has jugado ninguna partida. Ve a los juegos y empieza a apostar.</div>';
    return;
  }

  wrap.innerHTML = `
    <table class="rc-table">
      <thead><tr><th>Fecha</th><th>Juego</th><th>Resultado</th><th>Apuesta</th><th>Ganancia</th><th>Saldo</th></tr></thead>
      <tbody>
        ${history.map(h => `
          <tr>
            <td>${fmtDate(h.date)}</td>
            <td>${h.game}</td>
            <td><span class="rc-badge ${h.result}">${h.result === 'win' ? 'Ganada' : 'Perdida'}</span></td>
            <td>${RC.formatNumber(h.wager)}</td>
            <td>${h.payout > 0 ? '+' + RC.formatNumber(h.payout) : '—'}</td>
            <td>${RC.formatNumber(h.balance)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('clearBtn').addEventListener('click', () => {
  localStorage.setItem('royalCasinoHistory', '[]');
  render();
  RC.toast('info', 'Historial borrado');
});

render();