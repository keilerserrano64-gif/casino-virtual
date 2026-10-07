"""Simula millones de giros del tragamonedas para verificar el RTP (95,96 % teórico).
Uso:  python python/simulador_rtp.py [giros]"""
import random, sys
from itertools import product

WEIGHTS = {'🍒': 17, '🍋': 5, '🍊': 5, '⭐': 5, '💎': 5, '7️⃣': 3}
PAYOUTS = {'7️⃣': 100, '💎': 30, '⭐': 15, '🍊': 10, '🍋': 6, '🍒': 4}
STRIP = [s for s, w in WEIGHTS.items() for _ in range(w)]

def mult(a, b, c):
    if a == b == c: return PAYOUTS[a]
    return 1 if (a == b or b == c or a == c) else 0

def rtp_exacto():
    return sum(mult(*t) for t in product(STRIP, repeat=3)) / len(STRIP) ** 3

def rtp_simulado(n):
    rng = random.SystemRandom()
    return sum(mult(*(rng.choice(STRIP) for _ in range(3))) for _ in range(n)) / n

if __name__ == '__main__':
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
    print(f'RTP exacto   : {rtp_exacto():.4%}')
    print(f'RTP simulado : {rtp_simulado(n):.4%}  ({n:,} giros)')
