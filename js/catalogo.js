// catalogo.js — catálogo visual de juegos (categorías, tonos e insignias) compartido por el lobby (juegos.html) y la portada.
// Solo presentación: el nombre canónico, el enlace y el icono salen de RC.GAME_INFO y respeta los juegos desactivados.
window.RCCatalog = (() => {
  const ico = n => (typeof RCIcon === 'function' ? RCIcon(n) : '');
  const CATS = [
    { id: 'todos', label: 'Todos', icon: ico('layout-grid') }, { id: 'populares', label: 'Populares', icon: ico('flame') },
    { id: 'slots', label: 'Slots', icon: ico('cherry') }, { id: 'crash', label: 'Crash', icon: ico('trending-up') },
    { id: 'mesa', label: 'Mesa', icon: ico('spade') }, { id: 'especiales', label: 'Especiales', icon: ico('sparkles') },
  ];
  // Tonos apagados por categoría: la portada es oscura y el color solo matiza el fondo y el icono.
  const TONE = {
    slots: ['#b08a4a', '#1a1712'], crash: ['#6f8fb0', '#12161b'], mesa: ['#4f8f6a', '#0f1713'], especiales: ['#9a7fb8', '#16131b'],
  };
  // [nombre canónico, título, categoría, insignia, subtítulo, popular] — insignia solo para lo realmente nuevo
  const GAMES = [
    ['Sweet Bonanza', 'Sweet Bonanza', 'slots', '', 'Cascadas · 6×5', 1],
    ['Gates of Olympus', 'Gates of Olympus', 'slots', '', 'Multiplicadores · 6×5', 1],
    ['Aviator', 'Aviator', 'crash', '', 'Retira a tiempo', 1],
    ['Ruleta', 'Ruleta europea', 'mesa', '', '37 casillas', 1],
    ['Blackjack', 'Blackjack', 'mesa', '', 'Pide o plántate', 1],
    ['Book of Dead', 'Book of Dead', 'slots', '', '10 líneas · Egipto', 1],
    ['Tragamonedas', 'Royal 777', 'slots', '', 'Clásica de 3 carretes', 1],
    ['Spaceman', 'Spaceman', 'crash', 'Nuevo', 'Retiro del 50 %', 1],
    ['Starburst', 'Starburst', 'slots', '', 'Comodines expansivos', 0],
    ['Poker', 'Póker Royal', 'mesa', '', "Texas Hold'em", 1],
    ['Dados', 'Craps', 'mesa', '', 'Mesa completa', 0],
    ['JetX', 'JetX', 'crash', '', 'Crash clásico', 0],
    ['Zeppelin', 'Zeppelin', 'crash', '', 'Dos apuestas a la vez', 0],
    ['Space XY', 'Space XY', 'crash', 'Nuevo', 'Crash veloz', 0],
    ['Big Bass Crash', 'Big Bass Crash', 'crash', '', 'Crash de pesca', 0],
    ['Cash It', 'Cash It', 'crash', '', 'Crash de billetes', 0],
    ['Cricket X', 'Cricket X', 'crash', '', 'Crash de cricket', 0],
    ['Aero', 'Aero', 'crash', '', 'Estadísticas en vivo', 0],
    ['High Striker', 'High Striker', 'crash', '', 'Curva de mercado', 0],
    ['Bingo', 'Bingo', 'especiales', '', '75 y 90 bolas', 1],
    ['Carreras', 'Carreras', 'especiales', '', 'Elige tu caballo', 0],
    ['Torneo', 'Torneos', 'especiales', '', 'Compite y gana premios', 0],
  ];
  // href relativo a html/ (como en RC.GAME_INFO); la portada le antepone RC.PAGES
  const list = (prefix = '') => GAMES.filter(g => RC.GAME_INFO[g[0]] && (g[0] === 'Torneo' || RC.isGameEnabled(g[0])))
    .map(([key, title, cat, tag, sub, pop]) => ({ key, title, cat, c1: TONE[cat][0], c2: TONE[cat][1], tag, sub, pop: !!pop,
      icon: typeof RCGameIcon === 'function' ? RCGameIcon(key) : RC.GAME_INFO[key].icon, href: prefix + RC.GAME_INFO[key].href }));
  const tile = g => `<a class="gt" href="${g.href}" style="--c1:${g.c1};--c2:${g.c2}" data-cat="${g.cat}">
      <span class="gt-art" aria-hidden="true"><span class="gt-ico">${g.icon}</span></span>
      ${g.tag ? `<span class="gt-tag t-${g.tag.toLowerCase()}">${g.tag}</span>` : ''}
      <span class="gt-meta"><b>${RC.esc(g.title)}</b><small>${RC.esc(g.sub)}</small></span>
      <span class="gt-play" aria-hidden="true">Jugar</span></a>`;
  return { CATS, list, tile };
})();
