// torneos.js — lógica de torneos.html (usa RC de app.js)

RC.initHeader();

const TOURNAMENTS = [
  { id: 't1', name: 'Copa Bronce', entry: 200, players: 5, prizes: [600, 250, 100] },
  { id: 't2', name: 'Copa Plata', entry: 500, players: 5, prizes: [1600, 700, 250] },
  { id: 't3', name: 'Copa Oro', entry: 1200, players: 5, prizes: [4000, 1800, 700] },
  { id: 't4', name: 'Copa Leyenda', entry: 3000, players: 5, prizes: [10000, 4500, 1800] },
];

const BOT_NAMES = ['Ana', 'Luis', 'Marta', 'Diego', 'Sofía', 'Pablo', 'Carla'];

const listEl = document.getElementById('tourneyList');
TOURNAMENTS.forEach(t => {
  const card = document.createElement('div');
  card.className = 'rc-panel tourney-card';
  card.innerHTML = `
    <div class="info">
      <h3>${t.name}</h3>
      <p>Inscripción: ${RC.formatNumber(t.entry)} monedas · ${t.players} jugadores</p>
    </div>
    <div class="prize">🥇 ${RC.formatNumber(t.prizes[0])}</div>
    <button class="rc-btn rc-btn-gold" data-id="${t.id}">Unirse</button>
  `;
  card.querySelector('button').addEventListener('click', () => joinTournament(t));
  listEl.appendChild(card);
});

function joinTournament(t) {
  const user = RC.getUser();
  if (user.coins < t.entry) { RC.toast('lose', 'No tienes monedas suficientes para la inscripción.'); return; }
  RC.addCoins(-t.entry);

  const shuffledBots = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, t.players - 1);
  const entrants = [
    { name: 'Tú', score: Math.floor(Math.random() * 500) + 400, isPlayer: true },
    ...shuffledBots.map(n => ({ name: n, score: Math.floor(Math.random() * 500) + 300, isPlayer: false })),
  ];
  entrants.sort((a, b) => b.score - a.score);

  const playerRank = entrants.findIndex(e => e.isPlayer);
  const prize = t.prizes[playerRank] || 0;
  if (prize > 0) RC.addCoins(prize);

  const text = prize > 0
    ? `Terminaste #${playerRank + 1} en ${t.name}. +${RC.formatNumber(prize)} monedas.`
    : `Terminaste #${playerRank + 1} en ${t.name}. Sin premio esta vez.`;
  if (prize > 0) RC.result({ type: playerRank === 0 ? 'big' : 'win', title: playerRank === 0 ? '¡CAMPEÓN!' : `¡PUESTO #${playerRank + 1}!`, amount: prize, text });
  else RC.result({ type: 'lose', title: 'SIN PREMIO', amount: t.entry, text });
  RC.registerGameResult('Torneo · ' + t.name, prize > 0, t.entry, prize);

  document.getElementById('leaderboardPanel').style.display = 'block';
  document.getElementById('leaderboardTitle').textContent = `Clasificación — ${t.name}`;
  const body = document.getElementById('leaderboardBody');
  body.innerHTML = entrants.map((e, i) => `
    <tr style="${e.isPlayer ? 'color:var(--gold-300); font-weight:700;' : ''}">
      <td>${i + 1}</td><td>${e.name}</td><td>${e.score}</td><td>${t.prizes[i] ? RC.formatNumber(t.prizes[i]) : '—'}</td>
    </tr>
  `).join('');
  document.getElementById('leaderboardPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}