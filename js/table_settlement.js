// Coordinador local de liquidación. No promete atomicidad del transporte Firebase.
(function(root) {
  'use strict';
  function createAccounting({engine,owner,balance,allowed,applyNet,record}) {
    const prepared=new WeakMap(), consumed=new WeakSet();
    function prepare(gameId,selection,wager,rng) {
      if(!allowed(gameId)) throw Error('No se puede apostar: revisa sesión, conexión y habilitación.');
      const who=owner(), before=balance();
      const round=engine.createRound(gameId,selection,wager,before,rng);
      prepared.set(round,{who,before});
      return round;
    }
    function settleRound(round) {
      if(consumed.has(round)) return false;
      const receipt=prepared.get(round);
      if(!receipt) throw Error('Ronda ajena a esta sesión');
      if(!allowed(round.gameId) || receipt.who!==owner() || receipt.before!==balance()) throw Error('La cuenta cambió; vuelve a preparar la apuesta.');
      // Sello antes de efectos: ni una segunda llamada ni un error de registro
      // vuelven a acreditar esta ronda. La UI informa del fallo de persistencia.
      consumed.add(round);
      applyNet(round.payout-round.wager);
      record(round);
      return true;
    }
    return {prepare,settleRound};
  }
  root.TableSettlement={createAccounting};
  if(typeof module!=='undefined') module.exports=root.TableSettlement;
})(typeof window!=='undefined'?window:globalThis);
