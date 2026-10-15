// Regenera documentación y registro visible desde la investigación guardada.
// No descarga fuentes ni convierte coincidencias aproximadas en reglas verificadas.
const fs = require('node:fs');
const inputs = JSON.parse(fs.readFileSync('data/solicitud-278.json'));
const research = JSON.parse(fs.readFileSync('data/investigacion-278.json'));
const ready = JSON.parse(fs.readFileSync('data/reglas-verificadas.json'));
const rows = research.map(row => ({...row, ...ready.find(r => r.original_index === row.original_index)}));
if (rows.length !== 278 || inputs.some((r,i) => rows[i].original_index !== i+1 || rows[i].requested_name !== r.requested_name)) throw Error('Lista alterada');
const counts = {};
for (const r of rows) counts[r.implementation_status]=(counts[r.implementation_status]||0)+1;
const registry = {schema_version:1, scope:'278 nombres solicitados; los 21 juegos de la entrega anterior se conservan aparte.', complete:false, counts, entries:rows};
fs.writeFileSync('catalogo_reglas.json', JSON.stringify(registry,null,2)+'\n');
const escape = s => String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const note = '# Registro de los 278 nombres — entrega parcial\n\nEsta ampliación NO cumple todavía la aceptación de 278 juegos funcionales. Las fichas incompletas se conservan con sus consultas y carencias; no son motores jugables ni búsquedas exhaustivas. No se inventan reglamentos para llenar huecos. Los alias de títulos pendientes tampoco cuentan como juegos implementados.\n\n';
let matrix = note+'Conteo: '+JSON.stringify(counts)+'.\n\n| Índice | Nombre solicitado exacto | Título verificado | ID canónico | Estado | Motivo / fuente |\n|---|---|---|---|---|---|\n';
let docs = note+'La etiqueta documentación lista solo permite iniciar implementación; implementado exige pruebas. Las fuentes oficiales de descripción no acreditan tablas no publicadas. Las probabilidades de las simulaciones se identifican por separado.\n\n';
const fields = {official_title:'Título oficial',provider:'Proveedor',existence_status:'Existencia',exact_version:'Versión',implementation_status:'Implementación',rules_summary_es:'Reglas resumidas',genre_and_objective:'Objetivo',setup_and_round_steps:'Preparación',round_flow:'Flujo y liquidación',components:'Componentes',win_conditions:'Condiciones',payout_table:'Tabla de pagos',special_features:'Funciones',edge_cases:'Casos límite',bet_limits_and_options:'Límites',settlement:'Saldo y redondeo',RTP_volatility_max_win:'RTP y máximo',randomness_and_rng:'Aleatoriedad',unconfirmed:'Sin confirmar',confidence:'Confianza'};
const value = v => Array.isArray(v) ? v.map(x=>'- '+x).join('\n') : typeof v==='object' ? '```json\n'+JSON.stringify(v,null,2)+'\n```' : v;
for (const r of rows) {
 const primary = r.sources.find(s=>s.kind==='primaria' && s.http_status===200);
 matrix += `| ${r.original_index} | ${escape(r.requested_name)} | ${escape(r.official_title)} | ${r.canonical_game_id} | ${r.implementation_status} | ${escape(r.alias_reason || r.unconfirmed[0])}${primary ? ' [Fuente]('+primary.url+')' : ''} |\n`;
 docs += `## ${r.original_index}. ${r.requested_name}\n\n<a id="juego-${r.original_index}"></a>\n\nID canónico: **${r.canonical_game_id}**. Existe en base previa: ${r.existing_in_base?'sí':'no'}.\n\n`;
 if (r.alias_reason) docs += `Alias del índice ${r.alias_of_index}: ${r.alias_reason}\n\n`;
 for (const [key,label] of Object.entries(fields)) if(r[key]!==undefined) docs += `### ${label}\n\n${value(r[key])}\n\n`;
 if(!r.documentation_ready) docs += '### Puerta de implementación cerrada\n\nEsta ficha no proporciona todavía una ronda programable. No están establecidos preparación completa, acciones, componentes/jerarquías, condiciones y precedencias, tabla de pagos, funciones y excepciones. No hay un motor ni una alternativa personalizada aprobada para este nombre. La investigación restante es trabajo pendiente, no una imposibilidad técnica demostrada.\n\n';
 docs += '### Consultas y fuentes\n\n';
 if(!r.sources.length) docs+='No hay todavía una fuente exacta consultada para este nombre. No se declara inexistente. Su identificación sigue pendiente en el registro visible.\n\n';
 for(const s of r.sources) docs+=`- [${s.title}](${s.url}) — ${s.author}; ${s.kind}; consulta ${s.consulted_at_utc}; ${s.http_status || s.error}. ${s.supports}\n`;
 docs+='\n';
}
fs.writeFileSync('MATRIZ_CATALOGO.md',matrix);
fs.writeFileSync('REGLAS_REALES_TODOS_LOS_JUEGOS.md',docs);
console.log(JSON.stringify(counts));
