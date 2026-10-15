import { test,expect,login } from './fixtures';
import { readFileSync } from 'node:fs';
const games=[
 {id:'american-roulette',name:'American Roulette',choice:'red',bet:60,outcomes:[{pocket:1},{pocket:2}],returns:[120,0]},
 {id:'sic-bo',name:'Sic Bo',choice:'small',bet:60,outcomes:[{dice:[1,1,2]},{dice:[2,2,2]}],returns:[120,0]},
 {id:'dragon-tiger',name:'Dragon Tiger',choice:'dragon',bet:60,outcomes:[{cards:[{id:12,rank:13,suit:0,deck:0},{id:0,rank:1,suit:0,deck:0}]},{cards:[{id:0,rank:1,suit:0,deck:0},{id:12,rank:13,suit:0,deck:0}]},{cards:[{id:0,rank:1,suit:0,deck:0},{id:13,rank:1,suit:1,deck:0}]}],returns:[120,0,30]},
 {id:'fan-tan',name:'Fan-Tan',choice:'nim:1:2',bet:120,outcomes:[{count:41,remainder:1},{count:43,remainder:3},{count:42,remainder:2}],returns:[348,0,120]},
];
for(const game of games) {
 test(`${game.name}: lobby, reglas, apuestas, retorno único, recarga e historial`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await login(page);await page.goto('/html/juegos.html');
  const link=page.locator(`#lbGrid a[href="${game.id}.html"]`);await expect(link).toHaveCount(1);await link.click();
  await expect(page.locator('#tPlay')).toBeEnabled();await expect(page.locator('#tRules')).toHaveAttribute('open','');
  await expect(page.locator('#tRulesBody')).toContainText('retorno');
  expect(await page.evaluate('RC.PAGE_GAME[RC.pageFile()]')).toBe(game.name);
  await page.selectOption('#tChoice',game.choice);await page.locator('#tBet').fill(String(game.bet));
  for(let i=0;i<game.outcomes.length;i++) {
   const before=await page.evaluate(outcome=>{
    const E=(window as any).TableEngine,rc=(0,eval)('RC');
    E.createRound=(id:string,selection:string,wager:number,balance:number)=>{E.validateBet(id,selection,wager,balance);return E.resolve(id,selection,wager,outcome);};
    return {balance:rc.getUser().coins,history:rc.getHistory().length};
   },game.outcomes[i]);
   await page.evaluate("document.getElementById('tPlay').click();document.getElementById('tPlay').click()");
   await expect(page.locator('#tPlay')).toBeEnabled();
   const after=await page.evaluate('({balance:RC.getUser().coins,history:RC.getHistory()})');
   expect(after.balance).toBe(before.balance-game.bet+game.returns[i]);expect(after.history.length).toBe(before.history+1);
   expect(after.history[0]).toMatchObject({game:game.name,wager:game.bet,payout:game.returns[i]});
  }
  const saved=await page.evaluate('({balance:RC.getUser().coins,history:RC.getHistory()})');
  await page.reload();await expect(page.locator('#tPlay')).toBeEnabled();
  expect(await page.evaluate('({balance:RC.getUser().coins,history:RC.getHistory()})')).toEqual(saved);
  await page.goto('/html/historial.html');await page.selectOption('#filterGame',game.name);
  await expect(page.locator('#tableWrap tbody tr')).toHaveCount(game.outcomes.length);
  expect(errors).toEqual([]);
 });
 test(`${game.name}: acceso, administración, saldo insuficiente y desconexión`,async({page,context})=>{
  await page.goto(`/html/${game.id}.html`);await expect(page).toHaveURL(/login.html/);
  await login(page,true);await page.goto('/html/admin/juegos.html');
  await expect(page.locator(`input[data-game="${game.name}"]`)).toHaveCount(1);
  await page.locator(`input[data-game="${game.name}"]`).uncheck();
  await page.evaluate("const accounts=RC.getAccounts();accounts.find(a=>a.username==='testplayer').role='user';RCMem.setItem('rc_accounts',JSON.stringify(accounts))");
  page.on('dialog',d=>d.accept());await page.goto(`/html/${game.id}.html`);await expect(page).toHaveURL(/index.html/);
  await page.goto('/html/juegos.html');await expect(page.locator(`#lbGrid a[href="${game.id}.html"]`)).toHaveCount(0);
  await page.evaluate("RCMem.setItem('rc_disabled_games','[]')");await page.goto(`/html/${game.id}.html`);await expect(page.locator('#tPlay')).toBeEnabled();
  await page.locator('#tBet').fill('60000');await page.locator('#tPlay').click();await expect(page.locator('#tStatus')).toContainText('Saldo insuficiente');
  await page.locator('#tBet').fill(String(game.bet));await context.setOffline(true);await page.locator('#tPlay').click();
  await expect(page.locator('#tStatus')).toContainText('conexión');await context.setOffline(false);
  expect(await page.evaluate('RC.getUser().coins')).toBe(10000);expect(await page.evaluate('RC.getHistory().length')).toBe(0);
 });
}
test('registro visible conserva exactamente los 278 nombres, alias y pendientes',async({page})=>{
 await login(page);await page.goto('/html/juegos.html');await page.locator('a[href="catalogo278.html"]').click();
 await expect(page.locator('#catalogList details')).toHaveCount(278);
 const entries=JSON.parse(readFileSync('catalogo_reglas.json','utf8')).entries;
 expect(await page.locator('#catalogList summary').allTextContents()).toEqual(entries.map((r:any)=>`${r.original_index}. ${r.requested_name} — ${r.implementation_status}`));
 await expect(page.locator('#catalogStatus')).toContainText('4 incorporados');
 await expect(page.locator('details[data-index="227"] summary')).toContainText('Chilli Heat Megaways (duplicado potencial) — alias');
 await expect(page.locator('details[data-index="196"] summary')).toContainText('Reactoonz 3 (verificar existencia y nombre) — pendiente');
 await page.locator('details[data-index="196"] summary').click();await expect(page.locator('details[data-index="196"] a[href$=".html"]')).toHaveCount(0);
 await page.locator('#catalogSearch').fill('Sic Bo');await expect(page.locator('#catalogList details')).toHaveCount(1);
 await page.locator('#catalogList summary').click();await page.getByRole('link',{name:'Abrir Sic Bo',exact:true}).click();await expect(page.locator('#tPlay')).toBeEnabled();
});
test('mesas: móvil, teclado y movimiento reducido',async({page})=>{
 await page.setViewportSize({width:375,height:812});await login(page);await page.goto('/html/fan-tan.html');await expect(page.locator('#tPlay')).toBeEnabled();
 expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
 await page.locator('#tRules summary').focus();await page.keyboard.press('Enter');await expect(page.locator('#tRules')).not.toHaveAttribute('open','');
 await page.locator('#tChoice').focus();await page.keyboard.press('Tab');await expect(page.locator('#tBet')).toBeFocused();
 expect(await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(true);
});
