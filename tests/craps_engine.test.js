const assert=require('node:assert/strict'), E=require('../js/craps_engine').CrapsEngine;
const settle=(type,s,point=null,num)=>E.settleRoll([{type,amount:60,num}],point,s);
for(let s=2;s<=12;s++) {
 assert.equal(settle('pass',s).ret,[7,11].includes(s)?120:0);
 assert.equal(settle('dp',s).ret,[2,3].includes(s)?120:s===12?60:0);
 assert.equal(settle('come',s,6).ret,[7,11].includes(s)?120:0);
 assert.equal(settle('dcome',s,6).ret,[2,3].includes(s)?120:s===12?60:0);
 if(E.NUMS.includes(s)) {assert.equal(settle('pass',s).point,s);assert.equal(settle('come',s,6).bets[0].num,s);}
}
for(const point of E.NUMS) {
 assert.equal(settle('pass',point,point).ret,120);assert.equal(settle('pass',7,point).ret,0);
 assert.equal(settle('dp',7,point).ret,120);assert.equal(settle('dp',point,point).ret,0);
 const [a,b]=E.PASS_ODDS[point];assert.equal(settle('passodds',point,point).ret,60+Math.floor(60*a/b));
 const [c,d]=E.LAY_ODDS[point];assert.equal(settle('dpodds',7,point).ret,60+Math.floor(60*c/d));
 assert.equal(settle('place',point,null,point).ret,0); // apagada
 const win=settle('place',point,point,point);assert.equal(win.bets[0].amount,60); // principal retenido
 assert.equal(win.ret,Math.floor(60*E.PLACE_PAY[point][0]/E.PLACE_PAY[point][1]));
 assert.equal(settle('place',7,point,point).bets.length,0);
 assert.equal(settle('comeN',point,null,point).ret,120);assert.equal(settle('dcomeN',7,null,point).ret,120);
}
assert.equal(settle('field',2).ret,180);assert.equal(settle('field',12).ret,240);
assert.equal(settle('any7',7).ret,300);
console.log('Craps: 2–12, Pass/Don’t/Come, puntos, 7-out, push12, Odds, Place apagada/principal retenido y Field OK');
