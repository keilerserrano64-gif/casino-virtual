const fs=require('node:fs'),assert=require('node:assert/strict');
const input=JSON.parse(fs.readFileSync('data/solicitud-278.json'));
const catalog=JSON.parse(fs.readFileSync('catalogo_reglas.json'));
const matrix=fs.readFileSync('MATRIZ_CATALOGO.md','utf8'),rules=fs.readFileSync('REGLAS_REALES_TODOS_LOS_JUEGOS.md','utf8');
assert.equal(input.length,278);assert.equal(catalog.entries.length,278);
const byIndex=new Map(catalog.entries.map(r=>[r.original_index,r]));assert.equal(byIndex.size,278);
let outstanding=0;
for(const row of input) {
 const r=byIndex.get(row.original_index);assert(r);assert.equal(r.requested_name,row.requested_name);
 assert(matrix.includes(`| ${r.original_index} | ${r.requested_name} |`));assert(rules.includes(`## ${r.original_index}. ${r.requested_name}\n`));
 const target=r.implementation_status==='alias'?byIndex.get(r.alias_of_index):r;
 if(r.implementation_status==='alias') {assert(target);assert.equal(target.canonical_game_id,r.canonical_game_id);assert(r.alias_reason);}
 const playable=target.implementation_status==='implementado';
 if(playable) {assert(target.documentation_ready);assert(fs.existsSync('html/'+target.route));}
 else outstanding++;
 console.log(`${r.original_index}. ${r.requested_name} | ${r.implementation_status} | ${r.canonical_game_id} | ${playable?'jugable localmente':'NO JUGABLE; trabajo pendiente'}`);
}
console.log(`Trazabilidad: 278/278. Aceptación funcional: ${278-outstanding}/278 nombres. Pendientes funcionales: ${outstanding}.`);
if(process.argv.includes('--require-complete') && outstanding) process.exit(1);
