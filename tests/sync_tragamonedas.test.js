// Comprueba que el motor del servidor (backend/src/slots.ts) y el del navegador
// (js/tragamonedas_engine.js) usan los mismos pesos, pagos y apuesta mínima.
// Evita que las dos copias de las reglas se desincronicen. Ejecutar: node tests/sync_tragamonedas.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../js/tragamonedas_engine.js').SlotEngine;

const ts = fs.readFileSync(path.join(__dirname, '../backend/src/slots.ts'), 'utf8');

// Lee un objeto literal tipo `{ '🍒': 17, ... }` de la declaración indicada.
function leerTabla(nombre) {
  const m = ts.match(new RegExp(`const ${nombre}[^=]*=\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no se encontró ${nombre} en slots.ts`);
  const tabla = {};
  for (const [, simbolo, valor] of m[1].matchAll(/'([^']+)'\s*:\s*(\d+)/g)) tabla[simbolo] = Number(valor);
  return tabla;
}

let ok = 0;
const test = (name, fn) => { fn(); ok++; console.log('✔', name); };

test('pesos iguales en servidor y navegador', () => assert.deepStrictEqual(leerTabla('WEIGHTS'), E.WEIGHTS));
test('pagos iguales en servidor y navegador', () => assert.deepStrictEqual(leerTabla('PAYOUTS'), E.PAYOUTS));
test('apuesta mínima igual', () => {
  const m = ts.match(/const MIN_BET\s*=\s*(\d+)/);
  assert.ok(m);
  assert.strictEqual(Number(m[1]), E.MIN_BET);
});

console.log(`\n${ok} pruebas correctas`);
