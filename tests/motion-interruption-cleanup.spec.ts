import {test,expect} from '@playwright/test';
declare global {interface Window {__STAGGER_RESTORE_CAPTURE__?:Promise<number>}}
test('switching to reduced during stagger clears every child transform and opacity',async({page,request})=>{
 const post=async(data:object)=>expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data})).ok()).toBeTruthy();
 await post({type:'clinical:reset'});await page.goto('/workbench.html');
 const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-motion-phase','settled');
 await page.getByRole('combobox',{name:'工作台动效模式'}).selectOption('full');await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','full');await expect(island).toHaveAttribute('data-motion-phase','settled');
 // Arm before dispatch; interrupt within the actual partial-opacity frame rather
 // than hoping a Node/HTTP roundtrip returns before the short stagger completes.
 await page.evaluate(()=>{window.__STAGGER_RESTORE_CAPTURE__=new Promise<number>(resolve=>{
  const start=performance.now();function tick(){const el=document.querySelector('[data-testid=clinical-island]')!,child=el.querySelector('[data-stagger]');const opacity=child?Number(getComputedStyle(child).opacity):1;
   if(el.getAttribute('data-surface')==='rich'&&opacity>.02&&opacity<.9){const toggle=document.querySelector<HTMLButtonElement>('button[role="switch"][aria-label="减少动态"]');if(!toggle||toggle.getAttribute('aria-checked')!=='false'){resolve(-1);return;}toggle.click();resolve(opacity);return;}
   if(performance.now()-start>3000){resolve(-1);return;}requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
 });});
 await post({type:'clinical:view',mode:'timer'});const interrupted=await page.evaluate(()=>window.__STAGGER_RESTORE_CAPTURE__);expect(interrupted).toBeGreaterThan(.02);expect(interrupted).toBeLessThan(.9);
 await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','reduced');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(400);
 const children=await island.locator('[data-stagger]').evaluateAll(elements=>elements.map(e=>({opacity:Number(getComputedStyle(e).opacity),transform:getComputedStyle(e).transform})));
 expect(children.length).toBeGreaterThan(0);for(const child of children){expect(child.opacity).toBe(1);expect(child.transform).toBe('none');}
 await post({type:'clinical:configure',settings:{reduced:false}});await expect(island).toHaveAttribute('data-motion-phase','settled');
 for(const opacity of await island.locator('[data-stagger]').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).opacity))))expect(opacity).toBe(1);
 await page.evaluate(()=>delete window.__STAGGER_RESTORE_CAPTURE__);
});
