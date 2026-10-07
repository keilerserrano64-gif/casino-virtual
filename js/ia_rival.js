// ia_rival.js — conecta el Rival IA (ia_rival_engine.js) con las páginas de juego (todas menos Tragamonedas).
// Engancha RC.registerGameResult: aprende de cada jugada tuya y el rival juega una ronda "como tú".
(function () {
  if (!window.RC || !window.RCRivalEngine) return;
  const E = RCRivalEngine, PAGES = { 'ruleta.html': 'Ruleta', 'blackjack.html': 'Blackjack', 'dados.html': 'Dados', 'carreras.html': 'Carreras', 'bingo.html': 'Bingo' };
  const GAME = PAGES[(location.pathname.split('/').pop() || '').toLowerCase()];
  if (!GAME) return;

  const key = () => 'rc_ia_rival_' + (RC.currentUser() || 'guest');
  let st; try { st = E.load(JSON.parse(localStorage.getItem(key()))); } catch (e) { st = E.newState(); }
  const save = () => { try { localStorage.setItem(key(), JSON.stringify(st)); } catch (e) {} };
  const fmt = n => (n > 0 ? '+' : '') + RC.formatNumber(Math.round(n));

  const css = document.createElement('style');
  css.textContent = '#rcRival{position:fixed;left:12px;bottom:12px;z-index:40;max-width:250px;padding:8px 12px;border:1px solid rgba(255,204,51,.5);border-radius:12px;background:rgba(11,6,24,.92);color:#fff;font:12px/1.4 system-ui,sans-serif;cursor:pointer}' +
    '#rcRival b{color:#ffcc33}#rcRival .d{display:none;margin-top:6px;color:#cfc8e8}#rcRival.open .d{display:block}#rcRival .up{color:#37e58f}#rcRival .dn{color:#ff6b8a}';
  document.head.appendChild(css);
  const box = document.createElement('div'); box.id = 'rcRival'; box.title = 'Pulsa para ver detalles';
  box.addEventListener('click', () => box.classList.toggle('open'));
  document.body.appendChild(box);

  function render(last) {
    const G = E.game(st, GAME), cls = n => n >= 0 ? 'up' : 'dn';
    box.innerHTML = '<b>🤖 Rival IA</b> · Tú <span class="' + cls(G.hnet) + '">' + fmt(G.hnet) + '</span> · IA <span class="' + cls(G.net) + '">' + fmt(G.net) + '</span>' +
      '<div class="d">Te conoce al ' + Math.round(E.confidence(st, GAME) * 100) + ' % · apuesta típica ' + RC.formatNumber(E.avgBet(st, GAME)) + ' · riesgo medio ×' + E.avgRisk(st, GAME).toFixed(1) + '<br>' +
      (last ? 'Última ronda de la IA: apostó ' + RC.formatNumber(last.bet) + (last.won ? ' y ganó ' + RC.formatNumber(last.payout) : ' y perdió') + '.<br>' : '') +
      (G.net > G.hnet ? 'La IA te va ganando: supérala.' : 'Vas por delante de tu sombra.') + '<br><i>Juega con tu mismo estilo y la misma ventaja de la casa; no altera tus resultados.</i></div>';
  }
  render();

  const orig = RC.registerGameResult;
  RC.registerGameResult = function (game, won, wager, payout) {
    const r = orig.apply(this, arguments);
    try {
      if (String(game).split(' · ')[0] === GAME) { E.learn(st, GAME, wager, payout); const last = E.play(st, GAME); save(); render(last); }
    } catch (e) {}
    return r;
  };
})();
