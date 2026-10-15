const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync('js/app.js','utf8');
const info=vm.runInNewContext('('+app.match(/const GAME_INFO = (\{[\s\S]*?\n  \});/)[1]+')');
const games=Object.keys(info).filter(n=>n!=='Torneo');
const originals=['Tragamonedas','Ruleta','Blackjack','Poker','Dados','Carreras','Bingo','Aviator','Spaceman','JetX','Cricket X','Aero','Zeppelin','Space XY','Big Bass Crash','Cash It','High Striker'];
assert.equal(games.length,21);assert.equal(new Set(Object.values(info).map(x=>x.href)).size,22);
for(const name of originals) assert(games.includes(name));
for(const [name,g] of Object.entries(info))assert(fs.existsSync('html/'+g.href),`${name}: ${g.href}`);
const E=require('../js/slots_engine');
for(const [file,key] of [['starburst.html','starburst'],['sweetbonanza.html','bonanza'],['gatesofolympus.html','gates'],['bookofdead.html','bod']]) {
 const html=fs.readFileSync('html/'+file,'utf8');
 assert(html.includes(`data-slot="${key}"`));assert(html.includes('../js/slots_engine.js'));assert(html.includes('../js/slots.js'));
 assert.equal(info[E.GAMES[key].name].href,file);
 for(const id of ['sGrid','sBet','sSpin','sPay','sInfo','sWin','sMsg'])assert(html.includes(`id="${id}"`));
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}
for(const file of ['index.html',...walk('html').filter(f=>f.endsWith('.html'))]) {
 const text=fs.readFileSync(file,'utf8');
 for(const [,url] of text.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  if(/^(?:[a-z]+:|\/\/|#)/i.test(url)) continue;
  const local=url.split(/[?#]/)[0];if(!local)continue;
  const target=path.resolve(path.dirname(file),local);
  assert(fs.existsSync(target),`${file} -> ${url}`);
 }
}
console.log('Catálogo: 17 originales + 4 slots, Torneo separado, claves canónicas, motores/controles y todos los href/src HTML locales existen con capitalización exacta');
