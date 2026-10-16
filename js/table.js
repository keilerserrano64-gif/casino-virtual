// UI compartida únicamente por mesas de resolución inmediata compatibles.
(async function() {
  'use strict';
  RC.initHeader();
  const $=id=>document.getElementById(id), gameId=document.body.dataset.table;
  const config=TableEngine.config(gameId), play=$('tPlay');
  let busy=false, ready=false;
  const allowed=()=>RC.isLoggedIn() && (RC.isGameEnabled(config.name)||RC.isAdmin()) && navigator.onLine && !!window.RCNube?.ready();
  const accounting=TableSettlement.createAccounting({
    engine:TableEngine,owner:()=>RC.currentUser(),balance:()=>RC.getUser().coins,allowed,
    applyNet:net=>RC.addCoins(net),
    record:r=>RC.registerGameResult(config.name,r.won,r.wager,r.payout),
  });
  for(const b of TableEngine.bets(gameId)) $('tChoice').add(new Option(b.label,b.id));
  $('tBet').min=config.min;$('tBet').max=config.max;$('tBet').step=config.step;$('tBet').value=config.min;
  try {
    const res=await fetch('../catalogo_reglas.json');
    if(!res.ok) throw Error('No se pudo cargar el reglamento');
    const data=await res.json(), rule=data.entries.find(r=>r.engine_config_id===gameId && r.documentation_ready);
    if(!rule || RC.PAGE_GAME[RC.pageFile()]!==config.name) throw Error('Configuración de catálogo incompleta');
    for(const key of ['exact_version','rules_summary_es','components','win_conditions','special_features','bet_limits_and_options','settlement','randomness_and_rng']) {
      const p=document.createElement('p');p.textContent=rule[key];$('tRulesBody').append(p);
    }
    const list=document.createElement('ul');
    for(const line of rule.edge_cases) { const li=document.createElement('li');li.textContent=line;list.append(li); }
    $('tRulesBody').append(list);
    const labels={straight:'Pleno',split:'Split',street:'Calle/trío',corner:'Cuadro',basket_0_00_1_2_3:'Cesta 0/00/1/2/3',sixline:'Seisena',dozen:'Docena',column:'Columna',red_black_odd_even_low_high:'Dinero parejo',small_big:'Small / Big',specific_triple:'Triple específico',any_triple:'Cualquier triple',specific_double:'Doble específico',two_distinct_faces:'Dos caras distintas',single_face_1_2_3_occurrences:'Número individual: una/dos/tres apariciones',total_4_17:'Suma 4 o 17',total_5_16:'Suma 5 o 16',total_6_15:'Suma 6 o 15',total_7_14:'Suma 7 o 14',total_8_13:'Suma 8 o 13',total_9_10_11_12:'Suma 9/10/11/12',dragon_or_tiger_win:'Dragón/Tigre ganador',dragon_or_tiger_tie:'Dragón/Tigre con empate',tie_win:'Empate',suited_tie_win:'Empate de mismo palo',fan:'Fan',nim:'Nim',kwok:'Kwok',nga_tan:'Nga Tan',sheh_sam_hong:'Sheh-Sam-Hong',push:'Devolución',loss:'Pérdida'};
    const table=document.createElement('table'), caption=document.createElement('caption');
    caption.textContent='Retorno total × apuesta (incluye principal devuelto)';table.append(caption);
    const body=document.createElement('tbody');
    for(const [key,val] of Object.entries(rule.payout_table)) {
      if(key==='convention') continue;
      const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
      th.scope='row';th.textContent=labels[key]||key;td.textContent=Array.isArray(val)?val.join(' / '):val;tr.append(th,td);body.append(tr);
    }
    table.append(body);$('tRulesBody').append(table);
    for(const source of rule.sources) {
      const p=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.textContent=source.title+' ('+source.kind+')';a.rel='noopener noreferrer';p.append(a);$('tRulesBody').append(p);
    }
    ready=true;play.disabled=false;$('tStatus').textContent='Elige una apuesta. Todas las monedas son ficticias.';
  } catch(e) { $('tStatus').textContent='Mesa no disponible: '+e.message; }
  $('tForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(!ready || busy) return;
    busy=true;play.disabled=true;
    let round,committing=false;
    try {
      round=accounting.prepare(gameId,$('tChoice').value,Number($('tBet').value));
      committing=true;
      accounting.settleRound(round);
      // Solo presentación diferida; ninguna moneda se modifica en el temporizador.
      $('tStatus').textContent='Ronda resuelta.';
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches || !RC.getSettings().anim;
      setTimeout(()=>{
        $('tOutcome').textContent=round.display;
        $('tReturn').textContent='Retorno: '+round.payout+' · Resultado neto: '+RC.signed(round.net);
        $('tStatus').textContent=round.result==='push'?'Apuesta devuelta.':round.won?'Ganancia neta.':'Sin ganancia neta.';
        busy=false;play.disabled=false;
      },reduce?0:450);
    } catch(err) {
      $('tStatus').textContent=err.message+(committing?' No repitas esta ronda: revisa saldo e historial.':'');
      // Si falla un efecto después de empezar, no intentar acreditar otra vez.
      if(!committing) {busy=false;play.disabled=false;}
    }
  });
})();
