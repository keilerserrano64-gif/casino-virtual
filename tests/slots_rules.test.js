const assert = require('node:assert/strict');
const E = require('../js/slots_engine');
function seeded(seed) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
for(const key of Object.keys(E.GAMES)) {
 assert.deepEqual(E.session(key,100,null,seeded(18)),E.session(key,100,null,seeded(18)));
 for(const bet of [NaN,Infinity,9,10.1,-100,Number.MAX_SAFE_INTEGER]) assert.throws(()=>E.spin(key,bet,null));
 assert.throws(()=>E.spin(key,100,null,()=>1));
}
assert.throws(()=>E.spin('missing',100,null));
assert.throws(()=>E.spin('bonanza',100,{game:'starburst',bet:100,left:1,acc:0,mult:0}));
const cfg=E.GAMES.starburst;
assert.equal(cfg.welcomeSpins,undefined);
const grid=Array.from({length:5},()=>Array(3).fill('7️⃣'));
assert.equal(E.evalLines(cfg,grid,100,cfg.wild).win,6375); // 10 líneas ×250×0.255×10, sin duplicar ambos sentidos
const right=[['🔴','🔴','🔴'],['🔵','🔵','🔵'],...Array.from({length:3},()=>Array(3).fill('7️⃣'))];
assert.equal(E.evalLines(cfg,right,100,cfg.wild).win,1275);
function symbolRng(cfg, symbols, tail=seeded(5)) {
 const bag=cfg.symbols.concat([[cfg.scatter,cfg.scatterW]]), sum=bag.reduce((s,x)=>s+x[1],0);
 const queue=symbols.map(sym=>{let at=0;for(const [s,w] of bag){if(s===sym)return (at+w/2)/sum;at+=w;}throw Error(sym);});
 return ()=>queue.length?queue.shift():tail();
}
const c=E.GAMES.bonanza, syms=c.symbols.map(x=>x[0]);
const base=Array.from({length:30},(_,i)=>syms[i%syms.length]);
const loss=E.spin('bonanza',100,null,symbolRng(c,base)); assert.equal(loss.payout,0);assert.equal(loss.fs,null);
const eight=Array(8).fill(syms[0]).concat(Array.from({length:22},(_,i)=>syms[1+i%8]));
const one=E.spin('bonanza',100,null,symbolRng(c,eight.concat(Array.from({length:8},(_,i)=>syms[i+1]))));
assert.equal(one.steps.length,2);assert.equal(one.payout,2270);
const trigger=base.slice();for(let i=0;i<4;i++)trigger[i]=c.scatter;
const bonus=E.spin('bonanza',100,null,symbolRng(c,trigger));assert.equal(bonus.fs.left,10);assert.equal(bonus.scatterWin,300);
// 2× al final de caídas; el multiplicador no sustituye el grupo ganador.
const values=[];const initial=symbolRng(c,eight,()=>{throw Error('unexpected')});for(let i=0;i<30;i++)values.push(initial());
values.push(0,0.99,0); // aparece bomba, última casilla, valor 2
const refill=symbolRng(c,Array.from({length:8},(_,i)=>syms[i+1]));for(let i=0;i<8;i++)values.push(refill());values.push(0.99);
const multiplierSequence=values.slice();
const fs={game:'bonanza',left:1,bet:100,acc:0,mult:0};
const mul=E.spin('bonanza',100,fs,()=>values.shift() ?? 0.99);
assert.equal(mul.mult,2);assert.equal(mul.payout,4540);assert.equal(mul.fs.left,0);
const capped=E.spin('bonanza',100,{...fs,acc:499999},()=>multiplierSequence.shift() ?? 0.99);
assert.equal(capped.payout,1);assert.equal(capped.fs.acc,500000);assert.equal(capped.fs.left,0);
console.log('Slots: RNG inyectado, líneas y sentidos, 8+ y cascada, 4 scatters/10 giros, multiplicador 2× y tope por sesión OK');
