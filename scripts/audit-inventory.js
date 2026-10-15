// Inventario estructural automático; la aceptación funcional necesita los E2E.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(process.argv[2]||'.');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const info=vm.runInNewContext('('+app.match(/const GAME_INFO = (\{[\s\S]*?\n  \});/)[1]+')');
const classical={'tragamonedas.html':'Tragamonedas','ruleta.html':'Ruleta','Blackjack.html':'Blackjack','poker.html':'Poker','dados.html':'Dados','carreras.html':'Carreras','bingo.html':'Bingo'};
const slots=require(path.join(root,'js/slots_engine.js')).GAMES;
const crash=require(path.join(root,'js/crash_engine.js')).GAMES;
const tables=fs.existsSync(path.join(root,'js/table_engine.js'))?require(path.join(root,'js/table_engine.js')):null;
const inventory=[];
for(const file of fs.readdirSync(path.join(root,'html')).filter(f=>f.endsWith('.html'))) {
 const html=fs.readFileSync(path.join(root,'html',file),'utf8');
 const slot=html.match(/data-slot="([^"]+)"/),cx=html.match(/data-crash="([^"]+)"/);
 const table=html.match(/data-table="([^"]+)"/);
 if(!slot&&!cx&&!table&&!classical[file])continue;
 const key=slot?.[1]||cx?.[1]||table?.[1]||null,cfg=slot?slots[key]:cx?crash[key]:table?tables?.config(key):null;
 const name=cfg?.name||classical[file]||key;
 const catalog=Object.keys(info).filter(n=>info[n].href===file);
 inventory.push({page:'html/'+file,configuration:key,name,canonicalId:catalog[0]||null,status:catalog.length===1?'integrado':catalog.length===0?'parcialmente integrado':'duplicado',note:catalog.length?'Ruta/catalogo; véanse pruebas para cobertura funcional':'Página/motor fuera del catálogo'});
}
for(const [type,configs] of [['slot',slots],['crash',crash],['table',tables?Object.fromEntries(tables.gameIds().map(id=>[id,tables.config(id)])):{}]])for(const [key,cfg] of Object.entries(configs))if(!inventory.some(x=>x.configuration===key)) inventory.push({name:cfg.name,configuration:key,status:'sin integrar',note:'Configuración sin página '+type});
console.log(JSON.stringify({inventory,tournament:'html/torneos.html: opción separada, no juego',absentRequested:['Gonzo’s Quest (gonzo / html/gonzosquest.html)','Book of Ra (bora / html/bookofra.html)'].filter((_,i)=>!fs.existsSync(path.join(root,'html',i?'bookofra.html':'gonzosquest.html')))},null,2));
