import { test, expect, login } from './fixtures';

const slots = [
  {name:'Starburst',key:'starburst',file:'starburst.html'},
  {name:'Sweet Bonanza',key:'bonanza',file:'sweetbonanza.html'},
  {name:'Gates of Olympus',key:'gates',file:'gatesofolympus.html'},
  {name:'Book of Dead',key:'bod',file:'bookofdead.html'},
];
for (const game of slots) {
  test(`${game.name}: catálogo, acceso, motor, débito/crédito único e historial`,async ({page})=>{
    await login(page);
    await page.goto('/html/juegos.html');
    await expect(page.locator(`#lbGrid a[href="${game.file}"]`)).toHaveCount(1);
    await page.locator(`#lbGrid a[href="${game.file}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-slot',game.key);
    expect(await page.evaluate('RC.PAGE_GAME[RC.pageFile()]')).toBe(game.name);
    for (const win of [false,true]) {
      const expected = await page.evaluate(({key,win})=>{
        const engine=(0,eval)('SlotEngine');
        const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const original=(window as any).originalSession || engine.session;(window as any).originalSession=original;
        let seed=1,r;
        for(;seed<10000;seed++){r=original(key,100,null,rng(seed));if((r.payout>100)===win && (win || r.payout===0))break;}
        if(seed===10000)throw Error('Fixture no encontrado');
        engine.session=(k:string,b:number,fs:any)=>original(k,b,fs,rng(seed));
        const rc=(0,eval)('RC');
        return {payout:r.payout,balance:rc.getUser().coins,history:rc.getHistory().length};
      },{key:game.key,win});
      await page.locator('#sBet').fill('100');
      await page.evaluate("document.getElementById('sSpin').click(); document.getElementById('sSpin').click()");
      await expect(page.locator('#sSpin')).toBeEnabled();
      const actual=await page.evaluate('({balance:RC.getUser().coins,history:RC.getHistory()})');
      expect(actual.balance).toBe(expected.balance-100+expected.payout);
      expect(actual.history.length).toBe(expected.history+1);
      expect(actual.history[0]).toMatchObject({game:game.name,wager:100,payout:expected.payout});
    }
    const saved=await page.evaluate('({balance:RC.getUser().coins,count:RC.getHistory().length})');
    await page.reload();
    expect(await page.evaluate('({balance:RC.getUser().coins,count:RC.getHistory().length})')).toEqual(saved);
    await page.goto('/html/historial.html');
    await expect(page.locator('#tableWrap')).toContainText(game.name);
    await page.selectOption('#filterGame',game.name);
    await expect(page.locator('#tableWrap tbody tr')).toHaveCount(2);
  });
  test(`${game.name}: sin sesión y deshabilitado respetan auth`,async ({page})=>{
    await page.goto('/html/'+game.file);
    await expect(page).toHaveURL(/login.html/);
    await login(page);
    await page.evaluate(name=>(0,eval)('RCMem').setItem('rc_disabled_games',JSON.stringify([name])),game.name);
    page.on('dialog',d=>d.accept());
    await page.goto('/html/'+game.file);
    await expect(page).toHaveURL(/index.html/);
    await page.goto('/html/juegos.html');
    await expect(page.locator(`#lbGrid a[href="${game.file}"]`)).toHaveCount(0);
  });
}
test('inventario real: 17 originales + cuatro slots, Torneos fuera de GAMES y admin completo',async ({page})=>{
  await login(page,true);
  const names=await page.evaluate('RC.GAMES');
  expect(names).toHaveLength(21);expect(new Set(names).size).toBe(21);expect(names).not.toContain('Torneo');
  const originals=['Tragamonedas','Ruleta','Blackjack','Poker','Dados','Carreras','Bingo','Aviator','Spaceman','JetX','Cricket X','Aero','Zeppelin','Space XY','Big Bass Crash','Cash It','High Striker'];
  expect(names).toEqual(expect.arrayContaining(originals));
  await page.goto('/html/admin/juegos.html');
  await expect(page.locator('#gameToggles input')).toHaveCount(21);
  for(const g of slots) await expect(page.locator(`input[data-game="${g.name}"]`)).toBeChecked();
  await page.locator('input[data-game="Starburst"]').uncheck();
  expect(await page.evaluate("RC.isGameEnabled('Starburst')")).toBe(false);
  await page.goto('/html/juegos.html');
  await expect(page.locator('#lbGrid a[href="torneos.html"]')).toHaveCount(1);
  await page.locator('#gameSearch').fill('Sweet');
  await expect(page.locator('#lbGrid a')).toHaveCount(1);
});
test('slots: inválidas/saldo insuficiente y promoción separada',async ({page})=>{
  await login(page);await page.goto('/html/sweetbonanza.html');
  for(const value of ['9','10.5','10001']) {await page.locator('#sBet').fill(value);await page.locator('#sSpin').click();}
  expect(await page.evaluate('RC.getUser().coins')).toBe(10000);expect(await page.evaluate('RC.getHistory().length')).toBe(0);
  await page.evaluate("SlotEngine.session=()=>{throw Error('Fallo simulado antes de apostar')}; document.getElementById('sBet').value=100; document.getElementById('sSpin').click()");
  expect(await page.evaluate('RC.getUser().coins')).toBe(10000);expect(await page.evaluate('RC.getHistory().length')).toBe(0);
  await page.evaluate("RCMem.removeItem('rc_slotwelcome_testplayer_starburst')");
  await page.goto('/html/starburst.html');await expect(page.locator('#sInfo')).toContainText('Promoción propia');
  await page.locator('#sSpin').click();await expect(page.locator('#sSpin')).toBeEnabled();
  expect(await page.evaluate('RC.getHistory()[0].wager')).toBe(0);
  expect(await page.evaluate("JSON.parse(RCMem.getItem('rc_slotwelcome_testplayer_starburst'))")).toBe(9);
});
test('ruleta: apuesta fijada antes de animar, repetición y recarga',async ({page})=>{
  await login(page);await page.goto('/html/ruleta.html');
  const result=await page.evaluate(`(() => {
    RouletteEngine.spin = wager => RouletteEngine.settle(wager,1);
    betInput.value=100;currentMode='color';currentValue='rojo';
    spinBtn.click();currentValue='negro';spinBtn.click();
    return {coins:RC.getUser().coins,history:RC.getHistory()};
  })()`);
  expect(result.coins).toBe(10100);expect(result.history).toHaveLength(1);expect(result.history[0].payout).toBe(200);
  await page.reload();expect(await page.evaluate('RC.getUser().coins')).toBe(10100);
});
test('Big Bass: retiro parcial único y recuperación con historial correcto',async ({page})=>{
  await login(page);await page.goto('/html/bigbasscrash.html');
  await expect(page.locator('.cx-half')).toBeVisible();
  const result=await page.evaluate(`(() => {
    CrashEngine.crashPoint=()=>10;document.querySelector('.cx-bet').value=101;startBtn.click();
    cashOut(0,'half',2);cashOut(0,'half',2);
    return {coins:RC.getUser().coins,remaining:st.slots[0].remaining};
  })()`);
  expect(result).toEqual({coins:9999,remaining:51});
  await page.reload();
  expect(await page.evaluate('RC.getHistory()[0]')).toMatchObject({game:'Big Bass Crash',wager:101,payout:100});
  await page.reload();expect(await page.evaluate('RC.getHistory().length')).toBe(1);expect(await page.evaluate('RC.getUser().coins')).toBe(9999);
});
test('Blackjack: doble, split ases, límite, corte y liquidación única',async ({page})=>{
  await login(page);await page.goto('/html/Blackjack.html');
  const data=await page.evaluate(`(() => {
    const c=rank=>({rank,suit:'♠',color:'black'});
    shoe=['10','7','6','5','10','6','A','A'].map(c);totalCards=52;needShuffle=false;betInput.value=100;
    deal();split();const after=RC.getHistory()[0];settle();
    const first={coins:RC.getUser().coins,count:RC.getHistory().length,wager:after.wager,hands:hands.length,aces:hands.every(h=>h.splitAces)};
    shoe=['10','7','10','6','5'].map(c);needShuffle=false;deal();doubleDown();
    const doubled={wager:RC.getHistory()[0].wager,cards:hands[0].cards.length,doubled:hands[0].doubled};
    hands=Array.from({length:4},()=>newHand([c('8'),c('8')],100));const limit=canSplit(hands[0]);
    const u=RC.getUser();u.coins=0;RC.saveUser(u);const insufficient=canDouble(hands[0]);
    shoe=Array(10).fill(c('2'));totalCards=52;penetrationEl.value='0.75';draw();const cut=needShuffle;phase='idle';buildShoe();
    return {first,doubled,limit,insufficient,cut,shuffled:!needShuffle,shoe:shoe.length};
  })()`);
  expect(data.first).toMatchObject({count:1,wager:200,hands:2,aces:true});
  expect(data.doubled).toEqual({wager:200,cards:3,doubled:true});expect(data.limit).toBe(false);expect(data.insufficient).toBe(false);expect(data.cut).toBe(true);expect(data.shuffled).toBe(true);expect(data.shoe%52).toBe(0);
});
test('Space XY: dos apuestas, auto al saltar fotogramas y saldo independiente',async ({page})=>{
  await login(page);await page.goto('/html/spacexy.html');
  await expect(page.locator('.cx-slot')).toHaveCount(2);
  const data=await page.evaluate(`(() => {
    CrashEngine.crashPoint=()=>3;
    const bets=document.querySelectorAll('.cx-bet'),autos=document.querySelectorAll('.cx-auto');
    bets[0].value=100;bets[1].value=200;autos[0].value=2;autos[1].value=3;
    startBtn.click();tick(st.t0+CrashEngine.timeAt(4,G.k)*1000);
    return {balance:RC.getUser().coins,history:RC.getHistory()};
  })()`);
  expect(data.balance).toBe(9900);expect(data.history).toHaveLength(1);expect(data.history[0]).toMatchObject({game:'Space XY',wager:300,payout:200});
});
test('Dados: principal Place, animación interrumpida y retirar sin duplicar saldo',async ({page})=>{
  await login(page);
  await page.evaluate(`RC.addCoins(-60); RCMem.setItem('rc_craps_testplayer',JSON.stringify({bets:[{type:'place',num:6,amount:60}],point:6}))`);
  await page.goto('/html/dados.html');
  await page.evaluate(`CrapsEngine.rollDie=()=>3;document.getElementById('rollBtn').click();document.getElementById('rollBtn').click()`);
  expect(await page.evaluate('RC.getUser().coins')).toBe(10010);
  expect(await page.evaluate('RC.getHistory()[0]')).toMatchObject({game:'Dados',wager:0,payout:70});
  await page.reload();
  expect(await page.evaluate('RC.getUser().coins')).toBe(10010);
  await page.locator('#clearBtn').click();await page.locator('#clearBtn').click();
  expect(await page.evaluate('RC.getUser().coins')).toBe(10070);expect(await page.evaluate('RC.getHistory().length')).toBe(1);
});
test('Tragamonedas: resultado previo a efectos, pérdida/ganancia y no doble cobro',async ({page})=>{
  await login(page);await page.goto('/html/tragamonedas.html');
  await page.evaluate(`(() => {
    const symbols=['🍒','🍒','🍒'];const result={symbols,bet:100,...SlotEngine.evaluate(symbols,100)};
    window.testSpin=result;RCApi.girarTragamonedas=async()=>result;betInput.value=100;
    doSpin(false);doSpin(false);
  })()`);
  await expect.poll(()=>page.evaluate('RC.getHistory().length')).toBe(1);
  expect(await page.evaluate('RC.getUser().coins')).toBe(10300);
  await page.evaluate('settleResult(window.testSpin)');expect(await page.evaluate('RC.getUser().coins')).toBe(10300);
  await page.reload();expect(await page.evaluate('RC.getHistory().length')).toBe(1);
  expect(await page.evaluate('RC.getUser().coins')).toBe(10300);
});
test('Poker: empate comparte bote y no duplica liquidación',async ({page})=>{
  await login(page);await page.goto('/html/poker.html');
  const data=await page.evaluate(`(() => {
    const c=(rank,suit='♠')=>({rank,suit});
    community=[10,11,12,13,14].map(r=>c(r));playerHole=[c(2,'♥'),c(3,'♦')];botHole=[c(4,'♥'),c(5,'♦')];
    paid=100;pot=200;stage=3;live=true;busy=true;RC.addCoins(-100);showdown();showdown();
    return {balance:RC.getUser().coins,history:RC.getHistory()};
  })()`);
  expect(data.balance).toBe(10000);expect(data.history).toHaveLength(1);expect(data.history[0]).toMatchObject({game:'Poker',wager:100,payout:100});
});
test('regresión de liquidación compartida: push no se registra como derrota, filtro e historial',async ({page})=>{
  await login(page);
  const result=await page.evaluate(`(() => {
    const before=RC.getUser();
    for(const game of RC.GAMES) RC.logHistory(game,false,100,100);
    RC.registerGameResult('Blackjack',false,100,100);
    const after=RC.getUser();
    return {before:before.losses,after:after.losses,history:RC.getHistory(),balance:after.coins};
  })()`);
  expect(result.after).toBe(result.before);expect(result.balance).toBe(10000);
  expect(result.history.every((h:any)=>h.result==='push')).toBe(true);
  await page.goto('/html/historial.html');await page.selectOption('#filterResult','push');
  expect(result.history).toHaveLength(22);
  await expect(page.locator('#tableWrap tbody tr')).toHaveCount(result.history.length);
  await expect(page.locator('#hsLosses')).toHaveText('0');await expect(page.locator('#tableWrap')).toContainText('Empate');
});
test('Bingo: marcado manual/auto, apuesta inválida y premio parcial registrado como pérdida neta',async ({page})=>{
  await login(page);await page.goto('/html/bingo.html');
  await page.locator('#bet').fill('9');await page.locator('#buyBtn').click();
  expect(await page.evaluate('playing')).toBe(false);
  const data=await page.evaluate(`(() => {
    const u=RC.getUser();u.bingoFreeCards=0;RC.saveUser(u);
    betInput.value=100;countInput.value=1;buyBtn.click();buyBtn.click();
    const target=cardCells[0].find(c=>c.n>0);const n=target.n;
    game.bag=game.bag.filter(x=>x!==n).concat(n);
    autoDaub.checked=false;drawBtn.click();target.el.click();const manual=target.el.classList.contains('marked');
    autoDaub.checked=true;autoDaub.dispatchEvent(new Event('change'));target.el.click();const auto=target.el.classList.contains('marked');
    RC.addCoins(50);payout=50;game.done=true;finish();finish();
    return {manual,auto,balance:RC.getUser().coins,history:RC.getHistory()};
  })()`);
  expect(data.manual).toBe(true);expect(data.auto).toBe(true);expect(data.balance).toBe(9950);
  expect(data.history).toHaveLength(1);expect(data.history[0]).toMatchObject({result:'lose',wager:100,payout:50});
});
