const assert=require('node:assert/strict'), E=require('../js/table_engine');
const close=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
let checks=0;
// Enumera cada selección legal y todas las casillas, incluidos 0 y 00.
const american=E.bets('american-roulette');
assert.equal(new Set(american.map(b=>b.id)).size,american.length);
assert.equal(american.filter(b=>b.type==='straight').length,38);
assert.equal(american.filter(b=>b.type==='corner').length,22);
for(const b of american) {
  let credit=0;
  for(let n=0;n<38;n++) { const r=E.resolve('american-roulette',b.id,60,{pocket:n});credit+=r.payout;assert.equal(r.net,r.payout-60);checks++; }
  close(credit/(60*38),b.type==='basket'?35/38:36/38);
}
for(const id of ['red','black','even','odd','low','high']) for(const pocket of [0,37]) assert.equal(E.resolve('american-roulette',id,60,{pocket}).payout,0);
assert.equal(E.resolve('american-roulette','straight:37',60,{pocket:37}).payout,2160);
assert.equal(E.resolve('american-roulette','straight:0',60,{pocket:37}).payout,0);
assert.equal(E.resolve('american-roulette','red',60,{pocket:1}).payout,120);
assert.equal(E.resolve('american-roulette','black',60,{pocket:2}).payout,120);
assert.throws(()=>E.resolve('american-roulette','split:1-36',60,{pocket:1}));
// Combinatoria independiente: cuentas de sumas, triples, dobles e individuales.
const sumCounts={4:3,5:6,6:10,7:15,8:21,9:25,10:27,11:27,12:25,13:21,14:15,15:10,16:6,17:3};
const sumReturn={4:51,5:19,6:15,7:13,8:9,9:7,10:7,11:7,12:7,13:9,14:13,15:15,16:19,17:51};
for(const bet of E.bets('sic-bo')) {
  let payouts=0,wins=0;
  for(let a=1;a<=6;a++) for(let b=1;b<=6;b++) for(let c=1;c<=6;c++) {const r=E.resolve('sic-bo',bet.id,60,{dice:[a,b,c]});payouts+=r.payout;wins+=r.won?1:0;checks++;}
  const numerator={small:210,big:210,'any-triple':150,triple:151,double:144,single:199,pair:180,sum:sumCounts[bet.n]*sumReturn[bet.n]}[bet.type];
  assert.equal(payouts,60*numerator);
  if(['small','big'].includes(bet.type)) assert.equal(wins,105);
}
assert.equal(E.resolve('sic-bo','small',60,{dice:[2,2,2]}).payout,0);
assert.equal(E.resolve('sic-bo','big',60,{dice:[4,4,4]}).payout,0);
assert.equal(E.resolve('sic-bo','sum:6',60,{dice:[2,2,2]}).payout,900);
assert.equal(E.resolve('sic-bo','double:2',60,{dice:[2,2,2]}).payout,540);
assert.equal(E.resolve('sic-bo','single:2',60,{dice:[2,2,2]}).payout,240);
// Dragon Tiger: todos los pares físicos válidos de ocho barajas.
let dragonCredit=0,tieCredit=0,suitedCredit=0;
for(let a=0;a<416;a++) for(let b=0;b<416;b++) if(a!==b) {
  const o={cards:[E.card(a),E.card(b)]};
  dragonCredit+=E.resolve('dragon-tiger','dragon',60,o).payout;
  tieCredit+=E.resolve('dragon-tiger','tie',60,o).payout;
  suitedCredit+=E.resolve('dragon-tiger','suited',60,o).payout;
  checks+=3;
}
close(dragonCredit/(416*415*60),1-31/830);
close(tieCredit/(416*415*60),372/415);
close(suitedCredit/(416*415*60),357/415);
assert.equal(E.resolve('dragon-tiger','dragon',60,{cards:[E.card(0),E.card(12)]}).payout,0); // A < K
assert.equal(E.resolve('dragon-tiger','tiger',60,{cards:[E.card(0),E.card(12)]}).payout,120);
assert.throws(()=>E.resolve('dragon-tiger','tie',60,{cards:[E.card(0),E.card(0)]}));
assert.throws(()=>E.resolve('dragon-tiger','tie',60,{cards:[{...E.card(0),rank:9},E.card(13)]}));
// Fan-Tan: cuatro salidas equiprobables, comisión solo sobre ganancia.
for(const b of E.bets('fan-tan')) {
  let credit=0;
  for(let remainder=1;remainder<=4;remainder++) { const r=E.resolve('fan-tan',b.id,120,{count:40+(remainder%4),remainder});credit+=r.payout;checks++; }
  close(credit/(120*4),{fan:.9625,nim:.975,kwok:.975,nga:.9875,sheh:.9875}[b.type]);
}
assert.equal(E.resolve('fan-tan','fan:4',120,{count:40,remainder:4}).payout,462);
assert.equal(E.resolve('fan-tan','nim:1:2',120,{count:42,remainder:2}).payout,120);
assert.equal(E.resolve('fan-tan','nga:1-2:3',120,{count:41,remainder:1}).payout,177);
for(const id of ['american-roulette','sic-bo','dragon-tiger','fan-tan']) {
 const c=E.config(id),choice=E.bets(id)[0].id;
 for(const bet of [NaN,Infinity,-1,0,'120',120.5,c.min-1,60001]) assert.throws(()=>E.createRound(id,choice,bet,10000,()=>{throw Error('No debe consumir RNG');}));
 for(const balance of [0,NaN,Infinity,'120',-1]) assert.throws(()=>E.createRound(id,choice,c.min,balance));
 assert.throws(()=>E.createRound(id,'invalid',c.min,10000));
 for(const rng of [()=>NaN,()=>-1,()=>1,()=>Infinity]) assert.throws(()=>E.createRound(id,choice,c.min,10000,rng));
 const first=E.createRound(id,choice,c.min,10000,()=>0),last=E.createRound(id,choice,c.min,10000,()=>1-Number.EPSILON);
 assert(Object.isFrozen(first));assert(Object.isFrozen(first.outcome));assert.notDeepEqual(first.outcome,last.outcome);
 // Ejercita la ruta criptográfica sin modificar ni sembrar el RNG de producción.
 for(let n=0;n<20;n++) { const r=E.createRound(id,choice,c.min,10000);assert(Number.isSafeInteger(r.payout)); }
}
console.log('Mesas: '+checks+' resoluciones exhaustivas, RTP exacto, extremos/RNG y apuestas inválidas: PASS');
