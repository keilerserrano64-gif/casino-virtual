import { describe, it, expect } from 'vitest';
import { spin } from '../../backend/src/slots';

describe('tragamonedas (servidor)', () => {
  it('devuelve 3 símbolos y un premio coherente', () => {
    for (let i = 0; i < 2000; i++) {
      const r = spin(100);
      expect(r.symbols).toHaveLength(3);
      if (r.kind === 'none') expect(r.payout).toBe(0);
      if (r.kind === 'pair') expect(r.payout).toBe(100);
      if (r.kind === 'triple') expect(r.payout).toBeGreaterThanOrEqual(400);
    }
  });
  it('rechaza apuestas inválidas', () => {
    expect(() => spin(5)).toThrow();
    expect(() => spin(10.5)).toThrow();
  });
});
