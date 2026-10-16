const assert = require('node:assert/strict');
const E = require('../js/ruleta_engine');
for (let n = 0; n <= 36; n++) {
  for (const value of ['rojo', 'negro']) {
    const expected = n !== 0 && E.colorOf(n) === (value === 'rojo' ? 'red' : 'black');
    assert.equal(E.spin({mode:'color',value,bet:10}, () => n).payout, expected ? 20 : 0);
  }
  for (const value of ['par','impar']) assert.equal(E.settle({mode:'parity',value,bet:10},n).payout,n !== 0 && n % 2 === (value==='par'?0:1) ? 20 : 0);
  assert.equal(E.settle({mode:'number',value:n,bet:10},n).payout,360);
  assert.equal(E.settle({mode:'number',value:(n+1)%37,bet:10},n).payout,0);
}
for (const bet of [NaN,Infinity,-1,9,10.5,Number.MAX_SAFE_INTEGER]) assert.throws(()=>E.settle({mode:'color',value:'rojo',bet},1));
assert.equal(E.settle({mode:'color',value:'rojo',bet:100},1).payout,200);
assert.equal(E.settle({mode:'color',value:'negro',bet:100},2).payout,200);
console.log('Ruleta: 37 resultados, rojo/negro, par/impar, cero, pleno retorno 36× y entradas inválidas OK');
