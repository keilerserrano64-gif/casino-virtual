const assert = require('node:assert/strict');
const E = require('../js/crash_engine');
function round(bet=101) { return {half:true,crash:3,over:false,slots:[{bet,remaining:bet,payout:0,halfUsed:false,auto:2}]}; }
assert.equal(E.GAMES.bigbass.half,true);
assert.equal(E.GAMES.jetx.slots,1); // variante propia; no New Era
for(const key of ['spaceman','bigbass']) {
 const r=round(); r.half=E.GAMES[key].half;
 let balance=1000-101;
 balance+=E.withdraw(r,0,'half',2);
 assert.equal(balance,999);assert.equal(r.slots[0].remaining,51);
 assert.equal(E.withdraw(r,0,'half',2),0);
 balance+=E.withdraw(r,0,'all',2.5);
 assert.equal(balance,1126);assert.equal(r.slots[0].remaining,0);
 assert.equal(E.withdraw(r,0,'all',2.6),0);
}
let r=round(100);
assert.deepEqual(E.autoDue(r,4),[{i:0,m:2}]); // un fotograma saltó por encima del crash
assert.equal(E.withdraw(r,0,'all',2),200);
r=round();assert.equal(E.withdraw(r,0,'all',3),0);assert.equal(E.withdraw(r,0,'all',Infinity),0);
r.slots[0].auto=3;assert.deepEqual(E.autoDue(r,4),[]);
r.over=true;assert.equal(E.withdraw(r,0,'half',2),0);
r=round();r.half=false;assert.equal(E.withdraw(r,0,'half',2),0);
console.log('Crash: Big Bass/Spaceman 50 %, saldo, repetición, crash antes del retiro y auto con fotograma tardío OK');

assert.equal(E.payoutFor(100,2.01),201);
assert.equal(E.payoutFor(51,2.5),127);
assert.equal(E.GAMES.spacexy.slots,2);
