const fs=require('node:fs'),E=require('../js/table_engine');
const report=[];
for(const id of ['american-roulette','sic-bo','dragon-tiger','fan-tan']) {
 const outcomes=[];
 if(id==='american-roulette') for(let pocket=0;pocket<38;pocket++) outcomes.push({pocket});
 if(id==='sic-bo') for(let a=1;a<=6;a++) for(let b=1;b<=6;b++) for(let c=1;c<=6;c++) outcomes.push({dice:[a,b,c]});
 if(id==='dragon-tiger') for(let a=0;a<416;a++) for(let b=0;b<416;b++) if(a!==b) outcomes.push({cards:[E.card(a),E.card(b)]});
 if(id==='fan-tan') for(let count=40;count<=79;count++) outcomes.push({count,remainder:count%4||4});
 for(const bet of E.bets(id)) {
  const wager=E.config(id).min;
  let credit=0;for(const o of outcomes) credit+=E.resolve(id,bet.id,wager,o).payout;
  report.push({game_id:id,bet:bet.id,label:bet.label,equiprobable_outcomes:outcomes.length,total_credit:credit,total_stake:wager*outcomes.length,rtp:credit/(wager*outcomes.length)});
 }
}
fs.writeFileSync('docs/investigacion/rtp-mesas.json',JSON.stringify(report,null,2)+'\n');
let md='# Matemática de las cuatro mesas nuevas\n\nEnumeración exhaustiva de resultados equiprobables del modelo local, sin simulación ni ajuste de escala. No son RTP certificados ni datos de un software comercial.\n\n`node scripts/audit-table-rtp.js` genera los cocientes exactos crédito acumulado / apuesta acumulada. Tests independientes contrastan las cuentas combinatorias, además de premios particulares y ceros.\n\n| Mesa | Selección | Resultados | Crédito / apuesta | RTP local |\n|---|---|---|---|---|\n';
for(const r of report) md+=`| ${r.game_id} | ${r.label} | ${r.equiprobable_outcomes} | ${r.total_credit}/${r.total_stake} | ${(r.rtp*100).toFixed(9)} % |\n`;
fs.writeFileSync('docs/MATEMATICAS_MESAS.md',md);
console.log('Enumeradas '+report.length+' selecciones; cocientes exactos guardados en docs/investigacion/rtp-mesas.json');
