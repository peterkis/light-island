import {test,expect} from '@playwright/test';
import type {Page,APIRequestContext} from '@playwright/test';
import {evidencePath} from './evidence-path';
const post=async(r:APIRequestContext,data:object)=>expect((await r.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data})).ok()).toBeTruthy();
const island=(p:Page)=>p.getByTestId('clinical-island');
async function settle(p:Page,surface?:string){const el=island(p);if(surface)await expect(el).toHaveAttribute('data-surface',surface);await expect(el).toHaveAttribute('data-motion-phase','settled',{timeout:8000});await p.waitForTimeout(400);}
async function full(p:Page){await p.getByRole('combobox',{name:'工作台动效模式'}).selectOption('full');await expect(p.locator('.ci-anchor')).toHaveAttribute('data-motion','full');await settle(p);}
test.beforeEach(async({page,request})=>{
 await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:configure',settings:{autoPreview:false,reduced:false}});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/workbench.html');await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().connection)).toBe('online');await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await settle(page,'idle');
});
test('system reduce explains missing motion; explicit full restores shell, blur, scale and stagger',async({page,request})=>{
 await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','reduced');await expect(page.getByRole('combobox',{name:'工作台动效模式'})).toHaveValue('system');
 await full(page);
 const sample=page.evaluate(()=>new Promise<any[]>(resolve=>{const rows:any[]=[];const start=performance.now();function tick(now:number){const el=document.querySelector('[data-testid=clinical-island]') as HTMLElement,b=el.getBoundingClientRect(),content=el.querySelector('.ci-content')!;const style=getComputedStyle(content);rows.push({t:now-start,w:b.width,h:b.height,scale:new DOMMatrixReadOnly(style.transform).a,blur:style.filter,opacity:Number(style.opacity)});if(now-start<1400)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);}));
 await post(request,{type:'clinical:view',mode:'timer'});await settle(page,'rich');const rows=await sample;
 expect(new Set(rows.filter(r=>r.w>130&&r.w<370).map(r=>Math.round(r.w))).size).toBeGreaterThan(8);
 expect(rows.some(r=>r.scale<.995&&r.scale>=.95&&r.opacity>.05)).toBe(true);
 expect(rows.some(r=>r.blur.startsWith('blur(')&&r.blur!=='blur(0px)'&&r.opacity>.05)).toBe(true);
 expect(await island(page).locator('.ci-content').evaluate(e=>getComputedStyle(e).filter)).toBe('none');
 await page.screenshot({path:evidencePath('restoration/full-timer.png'),fullPage:true});
});
test('full is a local user choice; reduced always wins and returns without spatial animation',async({page,request})=>{
 await full(page);await page.reload();await settle(page,'idle');await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','full');
 await post(request,{type:'clinical:view',mode:'timer'});await page.waitForTimeout(150);await post(request,{type:'clinical:configure',settings:{reduced:true}});await settle(page,'rich');
 await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','reduced');
 const style=await island(page).locator('.ci-content').evaluate(e=>({transform:getComputedStyle(e).transform,filter:getComputedStyle(e).filter,inert:(e as HTMLElement).inert}));
 expect(style).toEqual({transform:'none',filter:'none',inert:false});
 await page.getByRole('combobox',{name:'工作台动效模式'}).selectOption('system');await settle(page);await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','reduced');
});
test('rapid reversals and privacy keep synchronized viewport and never expose old patient details',async({page,request})=>{
 await full(page);await post(request,{type:'clinical:scenario',scenario:'S02',stage:0});await settle(page,'compact');
 for(let i=0;i<4;i++){await post(request,{type:'clinical:view',mode:'open',scenario:'S02'});await page.waitForTimeout(60);await post(request,{type:'clinical:view',mode:'compact'});await page.waitForTimeout(45);}
 await post(request,{type:'clinical:view',mode:'open',scenario:'S02'});await post(request,{type:'clinical:configure',settings:{privacy:true}});await expect(island(page)).not.toContainText('王某某');await settle(page,'rich');
 expect(await island(page).locator('.ci-content').evaluate((e:HTMLElement)=>e.inert)).toBe(false);await expect(island(page)).toContainText('详情已保护');
});
test('only changed timer digit slots roll, with stable tabular widths',async({page,request})=>{
 await full(page);await post(request,{type:'clinical:personal',command:'start',duration:20000});await post(request,{type:'clinical:view',mode:'timer'});await settle(page,'rich');
 const samples=await island(page).locator('.ux-hero').evaluate(e=>new Promise<any[]>(resolve=>{const data:any[]=[];const start=performance.now();function tick(now:number){data.push({w:e.getBoundingClientRect().width,moving:e.querySelectorAll('[data-digit-moving=true]').length,colonMoving:!!e.querySelector('.ux-digit-colon [data-digit-moving]')});if(now-start<1400)requestAnimationFrame(tick);else resolve(data);}requestAnimationFrame(tick);}));
 expect(samples.some(s=>s.moving>0)).toBe(true);expect(samples.every(s=>s.moving<4&&!s.colonMoving)).toBe(true);expect(Math.max(...samples.map(s=>s.w))-Math.min(...samples.map(s=>s.w))).toBeLessThan(.1);
});
test('S2 neck and independent press are restored even when the OS asks for reduced motion',async({page,request})=>{
 await full(page);await post(request,{type:'clinical:scenario',scenario:'S02',stage:0});await settle(page,'compact');
 const capture=page.evaluate(()=>new Promise<boolean>(resolve=>{const start=performance.now();let seen=false;function tick(){seen ||= document.querySelector('[data-testid=clinical-island]')?.getAttribute('data-neck')==='true';if(performance.now()-start<900)requestAnimationFrame(tick);else resolve(seen);}requestAnimationFrame(tick);}));
 await post(request,{type:'clinical:scenario',scenario:'S09',stage:0});expect(await capture).toBe(true);await settle(page,'compact');
 const mini=(await island(page).locator('.ux-minimal').boundingBox())!;expect(mini.width).toBe(36);
 await post(request,{type:'clinical:view',mode:'timer'});await settle(page,'rich');const button=island(page).getByRole('button',{name:'开始 25 分钟'});await button.hover();await page.mouse.down();await page.waitForTimeout(200);
 const scale=await button.evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e,'::before').transform).a);expect(scale).toBeLessThan(.98);expect(scale).toBeGreaterThan(.9);
 await page.mouse.up();await page.waitForTimeout(1100);expect(await island(page).getByRole('button',{name:'暂停计时'}).evaluate(e=>getComputedStyle(e).getPropertyValue('--ux-press').trim())).toBe('');
});
test('full-motion CSS no longer cancels report burn; reduced path still clears immediately',async({page,request})=>{
 await full(page);await post(request,{type:'clinical:configure',settings:{autoPreview:true}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0,labVariant:'baseline'});await expect(island(page)).toHaveAttribute('data-lab-state','alert');await settle(page);
 await island(page).getByRole('button',{name:'查看检验报告摘要'}).click();await expect(island(page)).toHaveAttribute('data-lab-state','sum');await settle(page);
 await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','read');await settle(page);
 await island(page).getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','burn');
 expect(await island(page).locator('.lab-burning').evaluate(e=>getComputedStyle(e).animationName)).toContain('lab-burn');
 await expect(island(page)).toHaveAttribute('data-lab-state','done',{timeout:4000});await expect(island(page).locator('.lab-row')).toHaveCount(0);
});
test('full idle still stops animation and DOM work after a hover leaves',async({page})=>{
 await full(page);await island(page).hover();await page.waitForTimeout(1300);await page.mouse.move(1,1000);await settle(page,'idle');await page.waitForTimeout(700);
 const sample=await island(page).evaluate(el=>new Promise<{changes:number;animations:number}>(resolve=>{let changes=0;const observer=new MutationObserver(rows=>changes+=rows.length);observer.observe(el,{subtree:true,attributes:true,childList:true});setTimeout(()=>{observer.disconnect();resolve({changes,animations:el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length});},700);}));expect(sample).toEqual({changes:0,animations:0});
});
