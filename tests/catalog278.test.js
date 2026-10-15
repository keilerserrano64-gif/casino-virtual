const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const input=JSON.parse(fs.readFileSync('data/solicitud-278.json'));
const cat=JSON.parse(fs.readFileSync('catalogo_reglas.json'));
const matrix=fs.readFileSync('MATRIZ_CATALOGO.md','utf8'),rules=fs.readFileSync('REGLAS_REALES_TODOS_LOS_JUEGOS.md','utf8');
const app=fs.readFileSync('js/app.js','utf8'), info=vm.runInNewContext('('+app.match(/const GAME_INFO = (\{[\s\S]*?\n  \});/)[1]+')');
const index=new Map(cat.entries.map(r=>[r.original_index,r]));
assert.equal(cat.entries.length,278);assert.equal(index.size,278);assert.equal(cat.complete,false);
const implemented=cat.entries.filter(r=>r.implementation_status==='implementado');
assert.equal(implemented.length,4);assert.equal(new Set(implemented.map(r=>r.canonical_game_id)).size,4);
for(const r of input) {
 const e=index.get(r.original_index);assert.equal(e.requested_name,r.requested_name);
 assert(matrix.includes(`| ${r.original_index} | ${r.requested_name} |`),r.requested_name);
 assert(rules.includes(`## ${r.original_index}. ${r.requested_name}\n`),r.requested_name);
 assert(e.rules_summary_es.length>30);assert(e.unconfirmed.length);
 for(const s of e.sources) {assert(s.url.startsWith('https://'));assert(s.consulted_at_utc);if(s.http_status===200)assert(s.sha256);}
 if(e.implementation_status==='alias') {const target=index.get(e.alias_of_index);assert.equal(e.canonical_game_id,target.canonical_game_id);assert(e.alias_reason);}
 else if(e.implementation_status!=='implementado') {assert.equal(e.documentation_ready,false);assert.equal(e.implementation_status,'pendiente');}
}
for(const r of implemented) {
 assert(r.documentation_ready);assert.equal(r.canonical_game_id,r.official_title);assert.equal(info[r.canonical_game_id].href,r.route);
 const html=fs.readFileSync('html/'+r.route,'utf8');assert(html.includes(`data-table="${r.engine_config_id}"`));
 for(const js of ['app','auth','table_engine','table_settlement','table']) assert(html.includes(`../js/${js}.js`));
 for(const key of ['round_flow','win_conditions','payout_table','edge_cases','settlement','randomness_and_rng']) assert(r[key]);
}
assert(fs.readFileSync('html/juegos.html','utf8').includes('href="catalogo278.html"'));
assert(fs.existsSync('html/catalogo278.html'));
assert.equal(index.get(180).canonical_game_id,index.get(179).canonical_game_id);
assert.equal(index.get(227).canonical_game_id,index.get(30).canonical_game_id);
assert.equal(index.get(193).provider,'Hacksaw Gaming');
console.log('278 nombres trazables: 4 implementados, 2 alias de títulos pendientes, 272 pendientes. NO aceptación completa.');
