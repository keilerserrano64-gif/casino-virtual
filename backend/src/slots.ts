// Motor del tragamonedas en TypeScript (mismas reglas que js/tragamonedas_engine.js).
// El servidor decide el resultado: el navegador solo lo muestra.
import { randomInt } from 'node:crypto';

export type Symbol = '🍒' | '🍋' | '🍊' | '⭐' | '💎' | '7️⃣';
const WEIGHTS: Record<Symbol, number> = { '🍒': 17, '🍋': 5, '🍊': 5, '⭐': 5, '💎': 5, '7️⃣': 3 };
const PAYOUTS: Record<Symbol, number> = { '7️⃣': 100, '💎': 30, '⭐': 15, '🍊': 10, '🍋': 6, '🍒': 4 };
const MIN_BET = 10;

const STRIP: Symbol[] = (Object.keys(WEIGHTS) as Symbol[]).flatMap(s => Array(WEIGHTS[s]).fill(s));

export interface SpinResult { symbols: Symbol[]; bet: number; kind: 'triple' | 'pair' | 'none'; payout: number }

export function spin(bet: number): SpinResult {
  if (!Number.isInteger(bet) || bet < MIN_BET) throw new Error(`Apuesta mínima: ${MIN_BET}`);
  const symbols = [0, 1, 2].map(() => STRIP[randomInt(STRIP.length)]);
  const [a, b, c] = symbols;
  if (a === b && b === c) return { symbols, bet, kind: 'triple', payout: bet * PAYOUTS[a] };
  if (a === b || b === c || a === c) return { symbols, bet, kind: 'pair', payout: bet };
  return { symbols, bet, kind: 'none', payout: 0 };
}
