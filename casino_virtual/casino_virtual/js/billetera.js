// billetera.js — lógica de billetera.html (usa RC de app.js)
RC.initHeader();

const user = RC.getUser();
const hist = RC.getHistory();
const moves = RC.getMovements();
const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);

document.getElementById('wBalance').textContent = RC.formatNumber(user.coins);
document.getElementById('wWon').textContent = RC.formatNumber(sum(hist, h => h.payout));
document.getElementById('wSpent').textContent = RC.formatNumber(sum(hist, h => h.wager));
document.getElementById('wBonus').textContent = RC.formatNumber(sum(moves.filter(m => m.type === 'bono'), m => m.amount));
document.getElementById('wRewards').textContent = RC.formatNumber(sum(moves.filter(m => m.type === 'recompensa'), m => m.amount));

const body = document.getElementById('wMoves');
const filter = document.getElementById('wFilter');

function render() {
  const list = moves.filter(m => filter.value === 'todos' || m.type === filter.value).slice(0, 100);
  if (!list.length) { body.innerHTML = '<tr><td colspan="4" class="rc-empty">No hay movimientos todavía.</td></tr>'; return; }
  body.innerHTML = list.map(m => `
    <tr>
      <td>${RC.fmtDate(m.date)}</td>
      <td>${RC.esc(m.concept)}</td>
      <td class="${m.amount >= 0 ? 'pos' : 'neg'}">${RC.signed(m.amount)}</td>
      <td>${RC.formatNumber(m.balance)}</td>
    </tr>`).join('');
}
filter.addEventListener('change', render);
render();
