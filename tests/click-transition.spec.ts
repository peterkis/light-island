import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const dir='evidence/click-fix-20260930';
async function post(request:any,data:object){expect((await request.post('http://127.0.0.1:17321/api/push',{data})).ok()).toBeTruthy();}
async function settled(page:Page,mode:string){const island=page.getByTestId('island');await expect(island).toHaveAttribute('data-mode',mode);await expect(island).toHaveAttribute('data-motion-phase','settled');return island;}
async function mark(page:Page){return page.evaluate(()=>(window as any).__HOVER_TRACE__().at(-1)?.seq??0);}
async function trace(page:Page,since:number){return page.evaluate(s=>(window as any).__HOVER_TRACE__().filter((r:any)=>r.seq>s),since);}
test.beforeEach(async({page,request})=>{
 await post(request,{type:'reset'});await post(request,{type:'configure',settings:{engine:'gsap',shape:'notch',reduced:false,privacy:true,focus:false}});
 await page.goto('/?hoverDiagnostics=1');await expect(page.getByTestId('scenario-critical')).toBeEnabled();await settled(page,'compact');
});
for(const engine of ['gsap','css'])test(`${engine}: click open and close do not restart the outgoing content`,async({page,request})=>{
 await post(request,{type:'configure',settings:{engine}});const island=await settled(page,'compact');
 await island.hover();await expect(island).toHaveAttribute('data-hovered','true');await settled(page,'compact');
 const since=await mark(page);await page.locator('.compact-face').click();await settled(page,'inbox');
 const openEvents=await trace(page,since);
 const closeMark=await mark(page);await page.locator('.rail-close').click();await settled(page,'compact');await page.waitForTimeout(600);
 const closeEvents=await trace(page,closeMark);
 await writeFile(`${dir}/browser-${process.env.CLICK_VARIANT||'working'}-${engine}.json`,JSON.stringify({openEvents,closeEvents},null,2));
 // Closing a wide view moves the pointer out of its silhouette. That must not replay its exit.
 const exits=closeEvents.filter((r:any)=>r.kind==='motion-start'&&r.key==='compact');
 expect(exits).toHaveLength(1);
 await expect(island).toHaveAttribute('data-hovered','false');await expect(island).toHaveAttribute('data-mode','compact');
});
test('closing under a stationary center pointer does not replay the content exit',async({page})=>{
 const island=await settled(page,'compact');await page.locator('.compact-face').click();await settled(page,'inbox');
 const r=(await island.boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+15);
 const since=await mark(page);await page.keyboard.press('Escape');await settled(page,'compact');await page.waitForTimeout(500);
 const events=await trace(page,since);
 const closing=events.filter((e:any)=>e.kind==='motion-start'&&e.key==='compact'&&!e.fixedCompact);
 expect(closing).toHaveLength(1);await expect(island).toHaveAttribute('data-hovered','true');
 await expect(page.locator('.notch-content')).toHaveCSS('opacity','1');
});
test('rapid open-close-open settles on the newest click and removes CSS measuring elements',async({page,request})=>{
 await post(request,{type:'configure',settings:{engine:'css'}});const island=await settled(page,'compact');
 await page.locator('.compact-face').click();await expect(island).toHaveAttribute('data-mode','inbox');
 await page.locator('.rail-close').evaluate((e:HTMLElement)=>e.click());
 await expect(island).toHaveAttribute('data-mode','compact');await page.locator('.compact-face').evaluate((e:HTMLElement)=>e.click());
 await settled(page,'inbox');await page.waitForTimeout(500);
 await expect(page.locator('.notch-motion-meter')).toHaveCount(0);
 await expect(page.locator('.notch-content')).toHaveCSS('opacity','1');
 expect(await page.locator('.notch-content').evaluate((e:HTMLElement)=>e.inert)).toBe(false);
 await page.locator('.rail-close').click();await settled(page,'compact');
});
test('explicit close suppresses unread peek until a genuine new entry',async({page,request})=>{
 await post(request,{type:'demo',scenario:'critical'});const island=await settled(page,'expanded');
 await page.locator('.rail-close').click();await settled(page,'compact');await page.waitForTimeout(900);
 await expect(island).toHaveAttribute('data-mode','compact');
 expect((await(await request.get('http://127.0.0.1:17321/api/state')).json()).receipts).toHaveLength(0);
 await page.mouse.move(1,1);await page.waitForTimeout(160);await island.hover();await settled(page,'peek');
});
