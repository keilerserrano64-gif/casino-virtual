(async function() {
  'use strict';
  RC.initHeader();
  const list=document.getElementById('catalogList'), status=document.getElementById('catalogStatus'), search=document.getElementById('catalogSearch');
  const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  try {
    const res=await fetch('../catalogo_reglas.json');if(!res.ok) throw Error('HTTP '+res.status);
    const catalog=await res.json();if(catalog.entries.length!==278) throw Error('Registro incompleto');
    function render() {
      list.replaceChildren();
      const filtered=catalog.entries.filter(r=>norm(r.requested_name+' '+r.official_title+' '+r.implementation_status).includes(norm(search.value.trim())));
      const playable=catalog.entries.filter(r=>r.implementation_status==='implementado').length;
      status.textContent=filtered.length+' de 278 nombres · '+playable+' incorporados como jugables en esta ampliación. Los 21 anteriores se conservan.';
      for(const r of filtered) {
        const details=document.createElement('details'),summary=document.createElement('summary');
        details.dataset.index=r.original_index;summary.textContent=r.original_index+'. '+r.requested_name+' — '+r.implementation_status;details.append(summary);
        for(const line of [r.rules_summary_es,r.alias_reason,...r.unconfirmed].filter(Boolean)) {const p=document.createElement('p');p.textContent=line;details.append(p);}
        const rule=document.createElement('a');rule.href='../REGLAS_REALES_TODOS_LOS_JUEGOS.md#juego-'+r.original_index;rule.textContent='Ficha y consultas de este nombre';details.append(rule);
        if(r.implementation_status==='implementado') {
          const game=RC.GAME_INFO[r.official_title];
          if(game && (RC.isGameEnabled(r.official_title)||RC.isAdmin())) { const p=document.createElement('p'),a=document.createElement('a');a.href=game.href;a.textContent='Abrir '+r.official_title;p.append(a);details.append(p); }
        }
        list.append(details);
      }
    }
    search.addEventListener('input',render);render();
  } catch(err) {status.textContent='No se pudo cargar el registro: '+err.message;}
})();
