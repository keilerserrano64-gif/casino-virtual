// Mesas de una ronda: reglas puras, sin DOM, saldo, red ni animación.
// La tabla aplicada se documenta en data/reglas-verificadas.json.
(function (root) {
  'use strict';
  const CONFIG = {
    'american-roulette': {name:'American Roulette', min:60, step:60, max:60000},
    'sic-bo': {name:'Sic Bo', min:60, step:60, max:60000},
    'dragon-tiger': {name:'Dragon Tiger', min:60, step:60, max:60000},
    'fan-tan': {name:'Fan-Tan', min:120, step:120, max:60000},
  };
  const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  function config(id) { if (!Object.hasOwn(CONFIG,id)) throw Error('Juego desconocido'); return CONFIG[id]; }
  function integer(n,lo,hi) { return Number.isSafeInteger(n) && n>=lo && n<=hi; }
  function index(n, rng) {
    if (rng) {
      const x=rng();
      if(typeof x!=='number' || !Number.isFinite(x) || x<0 || x>=1) throw Error('RNG inválido');
      return Math.floor(x*n);
    }
    // Rechazo del sobrante de 2^32: sin sesgo de módulo ni semilla de pruebas.
    const limit=Math.floor(4294967296/n)*n, a=new Uint32Array(1);
    do { root.crypto.getRandomValues(a); } while(a[0]>=limit);
    return a[0]%n;
  }
  const range = (a,b) => Array.from({length:b-a+1},(_,i)=>a+i);
  const labels = xs => xs.map(n=>n===37?'00':n).join(', ');
  function rouletteBets() {
    const bets=[];
    const add=(type,title,numbers,mult)=>bets.push({id:type+':'+numbers.join('-'),label:title+' · '+labels(numbers),type,numbers,mult});
    range(0,37).forEach(n=>add('straight','Pleno',[n],36));
    for(let n=1;n<=36;n++) {
      if(n%3) add('split','Split',[n,n+1],18);
      if(n<=33) add('split','Split',[n,n+3],18);
      if(n%3 && n<=32) add('corner','Cuadro',[n,n+1,n+3,n+4],9);
    }
    [[0,37],[0,1],[0,2],[37,2],[37,3]].forEach(a=>add('split','Split',a,18));
    for(let n=1;n<=34;n+=3) {
      add('street','Calle',range(n,n+2),12);
      if(n<=31) add('sixline','Seisena',range(n,n+5),6);
    }
    [[0,1,2],[0,2,37],[37,2,3]].forEach(a=>add('street','Trío',a,12));
    add('basket','Cesta',[0,37,1,2,3],7);
    for(let n=0;n<3;n++) {
      add('dozen','Docena',range(1+n*12,12+n*12),3);
      add('column','Columna',range(0,11).map(i=>n+1+i*3),3);
    }
    for(const [type,title,predicate] of [
      ['red','Rojo',n=>RED.has(n)],['black','Negro',n=>!RED.has(n)],
      ['odd','Impar',n=>n%2===1],['even','Par',n=>n%2===0],
      ['low','1–18',n=>n<=18],['high','19–36',n=>n>=19],
    ]) bets.push({id:type,label:title,type,numbers:range(1,36).filter(predicate),mult:2});
    return bets;
  }
  const SUM_NET={4:50,5:18,6:14,7:12,8:8,9:6,10:6,11:6,12:6,13:8,14:12,15:14,16:18,17:50};
  function sicBets() {
    const bets=[{id:'small',type:'small',label:'Small · 4–10 sin triples'},{id:'big',type:'big',label:'Big · 11–17 sin triples'},{id:'any-triple',type:'any-triple',label:'Cualquier triple'}];
    for(const n of range(1,6)) for(const [type,title] of [['triple','Triple'],['double','Doble'],['single','Número individual']]) bets.push({id:type+':'+n,type,n,label:title+' '+n});
    for(const n of range(4,17)) bets.push({id:'sum:'+n,type:'sum',n,label:'Suma '+n});
    for(let a=1;a<=6;a++) for(let b=a+1;b<=6;b++) bets.push({id:'pair:'+a+'-'+b,type:'pair',numbers:[a,b],label:'Dos caras '+a+' y '+b});
    return bets;
  }
  function fanBets() {
    const bets=[];
    const add=(type,title,numbers,push,ratio)=>bets.push({id:type+':'+numbers.join('-')+(push?':'+push:''),type,numbers,push,ratio,label:title+' · gana '+numbers.join(', ')+(push?' · devuelve '+push:'')});
    for(let n=1;n<=4;n++) {
      add('fan','Fan',[n],null,[77,20]);
      for(let p=1;p<=4;p++) if(p!==n) add('nim','Nim',[n],p,[29,10]);
      add('sheh','Sheh-Sam-Hong',range(1,4).filter(x=>x!==n),null,[79,60]);
      for(let b=n+1;b<=4;b++) {
        add('kwok','Kwok',[n,b],null,[39,20]);
        for(let p=1;p<=4;p++) if(p!==n && p!==b) add('nga','Nga Tan',[n,b],p,[59,40]);
      }
    }
    return bets;
  }
  const BETS={
    'american-roulette':rouletteBets(), 'sic-bo':sicBets(), 'fan-tan':fanBets(),
    'dragon-tiger':[['dragon','Dragón'],['tiger','Tigre'],['tie','Empate'],['suited','Empate del mismo palo']].map(([id,label])=>({id,type:id,label})),
  };
  // Las configuraciones no pueden modificarse entre validación y resolución.
  function freeze(v) { if(v && typeof v==='object') { Object.values(v).forEach(freeze);Object.freeze(v); } return v; }
  freeze(CONFIG);freeze(BETS);
  function bets(id) { config(id); return BETS[id]; }
  function validateBet(id, selection, wager, balance) {
    const c=config(id), bet=bets(id).find(b=>b.id===selection);
    if(!bet) throw Error('Selección inválida');
    if(!integer(wager,c.min,c.max) || wager%c.step) throw Error('Apuesta inválida: múltiplos de '+c.step+', de '+c.min+' a '+c.max);
    // Un saldo fraccionario legado puede usarse, pero nunca se crea ni se redondea uno nuevo.
    if(typeof balance!=='number' || !Number.isFinite(balance) || balance<wager || balance>Number.MAX_SAFE_INTEGER-10000000) throw Error('Saldo insuficiente o inválido');
    return bet;
  }
  const card = id => ({id,rank:id%13+1,suit:Math.floor(id/13)%4,deck:Math.floor(id/52)});
  function draw(id,rng) {
    config(id);
    if(id==='american-roulette') return {pocket:index(38,rng)};
    if(id==='sic-bo') return {dice:[index(6,rng)+1,index(6,rng)+1,index(6,rng)+1]};
    if(id==='fan-tan') {const count=index(40,rng)+40;return {count,remainder:count%4 || 4};}
    const a=index(416,rng), offset=index(415,rng), b=offset>=a?offset+1:offset;
    return {cards:[card(a),card(b)]};
  }
  function resolve(id, selection, wager, outcome) {
    const bet=validateBet(id,selection,wager,wager);
    let num=0,den=1,display='';
    if(id==='american-roulette') {
      if(!outcome || !integer(outcome.pocket,0,37)) throw Error('Casilla inválida');
      num=bet.numbers.includes(outcome.pocket)?bet.mult:0;
      display='Casilla '+labels([outcome.pocket]);
    } else if(id==='sic-bo') {
      const ds=outcome?.dice;
      if(!Array.isArray(ds) || ds.length!==3 || !ds.every(n=>integer(n,1,6))) throw Error('Dados inválidos');
      const total=ds.reduce((a,b)=>a+b,0), triple=ds.every(n=>n===ds[0]), count=ds.filter(n=>n===bet.n).length;
      if(bet.type==='small') num=!triple && total>=4 && total<=10?2:0;
      if(bet.type==='big') num=!triple && total>=11 && total<=17?2:0;
      if(bet.type==='any-triple') num=triple?25:0;
      if(bet.type==='triple') num=count===3?151:0;
      if(bet.type==='double') num=count>=2?9:0;
      if(bet.type==='single') num=count?count+1:0;
      if(bet.type==='sum') num=total===bet.n?SUM_NET[total]+1:0;
      if(bet.type==='pair') num=bet.numbers.every(n=>ds.includes(n))?6:0;
      display='Dados '+ds.join(' · ')+' — suma '+total;
    } else if(id==='fan-tan') {
      if(!outcome || !integer(outcome.count,40,79) || outcome.remainder!==(outcome.count%4 || 4)) throw Error('Conteo inválido');
      if(bet.numbers.includes(outcome.remainder)) [num,den]=bet.ratio;
      else if(outcome.remainder===bet.push) num=1;
      display=outcome.count+' fichas — última fila: '+outcome.remainder;
    } else {
      const cs=outcome?.cards;
      if(!Array.isArray(cs) || cs.length!==2 || cs[0].id===cs[1].id || !cs.every(c=>integer(c.id,0,415) && c.rank===card(c.id).rank && c.suit===card(c.id).suit && c.deck===card(c.id).deck)) throw Error('Cartas inválidas');
      const diff=cs[0].rank-cs[1].rank;
      if(bet.type==='dragon' || bet.type==='tiger') {
        if(diff===0) {num=1;den=2;}
        else num=(bet.type==='dragon'?diff>0:diff<0)?2:0;
      } else if(bet.type==='tie') num=diff===0?12:0;
      else num=diff===0 && cs[0].suit===cs[1].suit?51:0;
      const face=c=>({1:'A',11:'J',12:'Q',13:'K'}[c.rank] || c.rank)+[' ♠',' ♥',' ♦',' ♣'][c.suit];
      display='Dragón '+face(cs[0])+' · Tigre '+face(cs[1]);
    }
    const payout=wager*num/den;
    if(!Number.isSafeInteger(payout)) throw Error('Retorno no entero');
    return freeze({gameId:id,name:config(id).name,selection,wager,payout,net:payout-wager,won:payout>wager,result:payout===wager?'push':payout>wager?'win':'lose',display,outcome:JSON.parse(JSON.stringify(outcome))});
  }
  function createRound(id,selection,wager,balance,rng) {
    validateBet(id,selection,wager,balance); // Validar antes de consumir RNG.
    return resolve(id,selection,wager,draw(id,rng));
  }
  root.TableEngine={gameIds:()=>Object.keys(CONFIG),config,bets,validateBet,draw,resolve,createRound,card};
  if(typeof module!=='undefined') module.exports=root.TableEngine;
})(typeof window!=='undefined'?window:globalThis);
