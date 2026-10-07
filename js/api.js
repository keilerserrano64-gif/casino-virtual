// api.js — cliente del backend (backend/). Si el servidor no responde, el sitio sigue
// funcionando con el motor local (SlotEngine). Cambia API_URL al publicar el backend.
(function (root) {
  const API_URL = (root.RC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const TIMEOUT_MS = 1500;

  async function post(ruta, cuerpo) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(API_URL + ruta, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo), signal: ctl.signal
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // Giro del tragamonedas: el servidor sortea; el cliente valida y recalcula el premio con
  // las reglas locales, así una respuesta alterada no puede inventar un premio.
  async function girarTragamonedas(apuesta) {
    try {
      const s = await post('/api/tragamonedas/girar', { apuesta });
      const ok = Array.isArray(s.symbols) && s.symbols.length === SlotEngine.REELS &&
        s.symbols.every(x => SlotEngine.SYMBOLS.includes(x));
      if (ok) return { symbols: s.symbols, bet: apuesta, ...SlotEngine.evaluate(s.symbols, apuesta), origen: 'servidor' };
    } catch (e) { /* sin servidor: motor local */ }
    return { ...SlotEngine.spin(apuesta), origen: 'local' };
  }

  root.RCApi = { girarTragamonedas };
})(window);
