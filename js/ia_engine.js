// ia_engine.js — IA que aprende cómo juega cada persona (sin DOM; se prueba en Node).
// Modelo de oponente: cuenta, con memoria que se desvanece (DECAY), cuántas veces la persona
// se retira ante una subida de la banca y cuántas sin subida. Con eso la banca decide
// SUBIR (por valor o de farol) comparando el valor esperado. Nunca ve las cartas del jugador.
(function (root) {
  const DECAY = 0.96;          // 0.96 = olvida despacio: se adapta si cambias de estilo
  const PRIOR = { n: 2, f: 0.7 };  // al inicio supone ~35 % de retiradas
  const NOISE = 0.07;          // 7 % de decisiones aleatorias para no ser predecible
  const MIN_EDGE = 0.02;       // ventaja mínima (fracción del bote) para subir

  const emptyCell = () => ({ n: 0, f: 0 });
  function newModel() { return { v: 1, obs: 0, s: { 1: { raise: emptyCell(), calm: emptyCell() }, 2: { raise: emptyCell(), calm: emptyCell() } } }; }

  function load(raw) {                      // acepta el objeto guardado (o basura) y devuelve un modelo válido
    const m = newModel();
    try {
      if (raw && raw.v === 1) {
        m.obs = Number(raw.obs) || 0;
        for (const st of [1, 2]) for (const k of ['raise', 'calm']) {
          const c = raw.s && raw.s[st] && raw.s[st][k];
          if (c && isFinite(c.n) && isFinite(c.f)) m.s[st][k] = { n: c.n, f: c.f };
        }
      }
    } catch (e) {}
    return m;
  }

  // Registra una decisión del jugador: ¿se retiró (folded) frente a una subida o con la banca tranquila?
  function observe(model, stage, facingRaise, folded) {
    const st = stage >= 2 ? 2 : 1, cell = model.s[st][facingRaise ? 'raise' : 'calm'];
    cell.n = cell.n * DECAY + 1;
    cell.f = cell.f * DECAY + (folded ? 1 : 0);
    model.obs++;
    return model;
  }

  const foldProb = (model, stage, facingRaise) => {
    const c = model.s[stage >= 2 ? 2 : 1][facingRaise ? 'raise' : 'calm'];
    return (c.f + PRIOR.f) / (c.n + PRIOR.n);
  };

  // Cuánto "conoce" la IA al jugador (0-1).
  const confidence = model => Math.min(1, model.obs / 40);

  // ¿Sube la banca? eq = probabilidad de ganar de la banca (0-1), pot = bote, r = cantidad a subir.
  function decideRaise(model, { stage, eq, pot, r }, rand = Math.random) {
    if (rand() < NOISE) return rand() < 0.5;
    const pc = foldProb(model, stage, false), pr = foldProb(model, stage, true);
    const half = pot / 2, edge = 2 * eq - 1;               // beneficio neto esperado en un showdown = edge * mitad del bote
    const evCalm = pc * half + (1 - pc) * edge * half;
    const evRaise = pr * half + (1 - pr) * edge * (half + r);
    return evRaise > evCalm + MIN_EDGE * pot;
  }

  root.RCIA = { newModel, load, observe, foldProb, confidence, decideRaise };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RCIA;
})(typeof window !== 'undefined' ? window : globalThis);
