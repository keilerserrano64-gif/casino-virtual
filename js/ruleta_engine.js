// Ruleta europea simplificada. Retornos totales, incluida la apuesta.
(function (root) {
  'use strict';
  const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const colorOf = n => n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';
  function draw() {
    const crypto = root.crypto || require('node:crypto').webcrypto;
    const a = new Uint32Array(1), limit = 4294967296 - 4294967296 % 37;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % 37;
  }
  function settle({ mode, value, bet }, landing) {
    if (!Number.isSafeInteger(bet) || bet < 10 || bet > Number.MAX_SAFE_INTEGER / 36) throw new RangeError('Apuesta inválida');
    if (!Number.isInteger(landing) || landing < 0 || landing > 36) throw new RangeError('Número inválido');
    let won;
    if (mode === 'color' && ['rojo', 'negro'].includes(value)) won = colorOf(landing) === ({ rojo: 'red', negro: 'black' })[value];
    else if (mode === 'parity' && ['par', 'impar'].includes(value)) won = landing !== 0 && landing % 2 === (value === 'par' ? 0 : 1);
    else if (mode === 'number' && Number.isInteger(value) && value >= 0 && value <= 36) won = value === landing;
    else throw new RangeError('Selección inválida');
    const mult = won ? (mode === 'number' ? 36 : 2) : 0;
    return { landing, won, mult, payout: bet * mult };
  }
  function spin(wager, rng = draw) { return settle(wager, rng()); }
  root.RouletteEngine = { colorOf, settle, spin };
  if (typeof module !== 'undefined') module.exports = root.RouletteEngine;
})(typeof window !== 'undefined' ? window : globalThis);
