// api.ts — cliente del backend (se compila a js/api.js con: npm run build:ts).
// Sin servidor, el sitio usa el motor local SIN esperar: tras un fallo no reintenta durante 60 s.
(function (root: Window) {
  const API_URL = (root.RC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const TIMEOUT_MS = 700;
  const REINTENTO_MS = 60000;
  let caidoHasta = 0;

  async function pedir(ruta: string, opciones?: RequestInit): Promise<any> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(API_URL + ruta, { ...opciones, signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      caidoHasta = Date.now() + REINTENTO_MS;
      throw e;
    } finally { clearTimeout(t); }
  }

  pedir('/api/salud').catch(() => {});

  // El servidor sortea; el cliente valida y recalcula el premio con las reglas locales.
  async function girarTragamonedas(apuesta: number) {
    if (Date.now() >= caidoHasta) {
      try {
        const s = await pedir('/api/tragamonedas/girar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apuesta })
        });
        const ok = Array.isArray(s.symbols) && s.symbols.length === SlotEngine.REELS &&
          s.symbols.every((x: string) => SlotEngine.SYMBOLS.includes(x));
        if (ok) return { symbols: s.symbols, bet: apuesta, ...SlotEngine.evaluate(s.symbols, apuesta), origen: 'servidor' };
      } catch (e) { /* sin servidor: motor local */ }
    }
    return { ...SlotEngine.spin(apuesta), origen: 'local' };
  }

  (root as any).RCApi = { girarTragamonedas };
})(window);
