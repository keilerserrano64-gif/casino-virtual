const assert=require('node:assert/strict'),engine=require('../js/table_engine'),{createAccounting}=require('../js/table_settlement');
for(const id of ['american-roulette','sic-bo','dragon-tiger','fan-tan']) {
 let coins=10000,who='alice',online=true,netCalls=0,history=[];
 const a=createAccounting({engine,owner:()=>who,balance:()=>coins,allowed:()=>online,applyNet:n=>{coins+=n;netCalls++;},record:r=>history.push(r)});
 const c=engine.config(id),r=a.prepare(id,engine.bets(id)[0].id,c.min,()=>0);
 assert.equal(coins,10000);
 assert(a.settleRound(r));assert.equal(coins,10000-r.wager+r.payout);
 assert.equal(a.settleRound(r),false);assert.equal(netCalls,1);assert.equal(history.length,1);
 assert.throws(()=>a.settleRound({...r}));
 const next=a.prepare(id,engine.bets(id)[0].id,c.min,()=>0);who='bob';assert.throws(()=>a.settleRound(next));who='alice';
 coins++;assert.throws(()=>a.settleRound(next));coins--;
 online=false;assert.throws(()=>a.settleRound(next));assert.throws(()=>a.prepare(id,engine.bets(id)[0].id,c.min));
 online=true;assert(a.settleRound(next));
 const oldBalance=coins,oldCount=netCalls;assert.throws(()=>a.prepare(id,engine.bets(id)[0].id,60000));assert.equal(coins,oldBalance);assert.equal(netCalls,oldCount);
}
let netCalls=0;
const failing=createAccounting({engine,owner:()=>1,balance:()=>10000,allowed:()=>true,applyNet:()=>netCalls++,record:()=>{throw Error('Fallo de registro');}});
const r=failing.prepare('american-roulette','red',60,()=>1/38);
assert.throws(()=>failing.settleRound(r));assert.equal(failing.settleRound(r),false);assert.equal(netCalls,1);
console.log('Liquidación local: retorno único, reintentos, cuenta/saldo cambiados, desconexión y fallo de registro: PASS');
