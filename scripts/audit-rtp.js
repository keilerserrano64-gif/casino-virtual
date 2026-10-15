// Análisis reproducible fuera de producción. No calibra ni modifica los pagos.
const E=require('../js/slots_engine'), fs=require('node:fs');
const n=Number(process.argv[2]||200000);
if(!Number.isSafeInteger(n)||n<10000) throw Error('Mínimo 10000 rondas');
let seed=0x20261015;
const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const results={roundsPerGame:n,bet:100,seed:'0x20261015',method:'rondas completas incluidas bonificaciones; IC95 normal aproximado (no certificación)',games:{}};
for(const key of Object.keys(E.GAMES)) {
 let sum=0,sq=0,caps=0;
 for(let i=0;i<n;i++){const x=E.session(key,100,null,rng).payout/100;sum+=x;sq+=x*x;if(x===E.MAX_WIN)caps++;}
 const mean=sum/n,se=Math.sqrt((sq-n*mean*mean)/(n-1)/n);
 results.games[key]={rtp:mean,standardError:se,ci95:[mean-1.96*se,mean+1.96*se],caps};
 console.log(key,JSON.stringify(results.games[key]));
}
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(results,null,2));
