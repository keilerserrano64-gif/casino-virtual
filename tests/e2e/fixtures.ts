import { test as base, expect } from '@playwright/test';
// Únicamente datos sintéticos. Ninguna petición de estas pruebas llega a Firebase.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return route.abort();
      if (url.pathname.endsWith('/js/firebase_auth.js')) return route.fulfill({contentType:'text/javascript',body:''});
      if (url.pathname.endsWith('/js/nube.js')) return route.fulfill({contentType:'text/javascript',body:`
        window.RCNube = { ready: () => true,
          hydrate(mem) { const data = JSON.parse(sessionStorage.getItem('fixture') || '{}'); for (const [k,v] of Object.entries(data)) mem.setItemSilent(k,v); },
          onChange(k,v) { const data = JSON.parse(sessionStorage.getItem('fixture') || '{}'); if (v === null) delete data[k]; else data[k]=v; sessionStorage.setItem('fixture',JSON.stringify(data)); }
        };`});
      return route.continue();
    });
    await page.emulateMedia({reducedMotion:'reduce'});
    await use(page);
  },
});
export { expect };
export async function login(page: any, admin = false) {
  await page.goto('/index.html');
  await page.evaluate((admin: boolean) => {
    const rc = (0,eval)('RC'), mem=(0,eval)('RCMem');
    rc.adoptAccount({username:'testplayer',name:'Prueba sintética',email:'test@example.invalid',role:admin?'admin':'user'});
    const u=rc.getUser();u.coins=10000;u.xp=0;u.level=1;u.gamesPlayed=0;rc.saveUser(u);
    rc.saveSettings({anim:false,sound:false});
    mem.setItem('rc_slotwelcome_testplayer_starburst','0');
  },admin);
}
