import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:17322';
const post=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
const settled=async(page:any,surface?:string)=>{const e=page.getByTestId('clinical-island');if(surface)await expect(e).toHaveAttribute('data-surface',surface);await expect(e).toHaveAttribute('data-motion-phase','settled',{timeout:8000});await page.waitForTimeout(350);return e;};
test.beforeEach(async({page,request})=>{await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');await settled(page,'idle');});
test('new S0 is 124x32 with external ears, finite Peek and no auto-expansion',async({page})=>{
 const e=await settled(page);expect((await e.boundingBox())!.width).toBe(124);expect((await e.boundingBox())!.height).toBe(32);
 expect(await e.locator('.ci-fill').getAttribute('d')).toMatch(/^M-10,0 L134,0 C/);
 await e.hover();await page.waitForTimeout(1200);expect((await e.boundingBox())!.width).toBeCloseTo(130.2,1);await expect(e).toHaveAttribute('data-surface','idle');
 await page.mouse.move(1,1000);await page.waitForTimeout(1300);expect((await e.boundingBox())!.width).toBe(124);
});
test('shell and SVG stay synchronized through interruptible expansion and return',async({page,request})=>{
 const e=await settled(page);const sample=page.evaluate(()=>new Promise<any[]>(resolve=>{const data:any[]=[];const start=performance.now();function tick(now:number){const el=document.querySelector('[data-testid=clinical-island]') as HTMLElement,r=el.getBoundingClientRect(),s=el.querySelector('svg.ci-shell')!;data.push({t:now-start,w:r.width,h:r.height,c:r.x+r.width/2,svgHeight:Number(s.getAttribute('height')),v:Number(el.dataset.velocityX),phase:el.dataset.motionPhase});if(now-start<2600)requestAnimationFrame(tick);else resolve(data);}requestAnimationFrame(tick);}));
 await post(request,{type:'clinical:view',mode:'timer'});await page.waitForTimeout(160);await post(request,{type:'clinical:view',mode:'compact'});await page.waitForTimeout(120);await post(request,{type:'clinical:view',mode:'timer'});
 await settled(page,'rich');const data=await sample;expect(new Set(data.filter(r=>r.w>130&&r.w<370).map(r=>Math.round(r.w))).size).toBeGreaterThan(8);expect(Math.max(...data.map(r=>r.c))-Math.min(...data.map(r=>r.c))).toBeLessThan(1);expect(data.every(r=>Math.abs(r.svgHeight-r.h)<.04)).toBe(true);expect(data.some(r=>Math.abs(r.v)>50)).toBe(true);
 expect(await e.locator('.ci-content').evaluate((el:HTMLElement)=>el.inert)).toBe(false);
});
test('floating mode uses 8 DIP offset and a full continuous outline',async({page,request})=>{
 const e=await settled(page);const top=(await e.boundingBox())!.y;await post(request,{type:'clinical:preferences',settings:{dock:'floating'}});await expect(e).toHaveAttribute('data-dock','floating');await settled(page,'idle');expect((await e.boundingBox())!.y-top).toBe(8);expect(await e.locator('.ci-fill').getAttribute('d')).toMatch(/^M16,0 L108,0 C/);
});
test('second source gets a true separate Minimal shape and stack is available',async({page,request})=>{
 await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});await post(request,{type:'clinical:scenario',scenario:'S02',stage:0});const e=await settled(page,'compact');
 const mini=e.locator('.ux-minimal');await expect(mini).toBeVisible();const r=(await mini.boundingBox())!;expect(r.width).toBe(36);expect(r.height).toBe(36);
 await e.getByRole('button',{name:'展开协作详情'}).click();await settled(page,'rich');await e.getByRole('button',{name:'活动与个人工具'}).click();await settled(page,'stack');expect((await e.boundingBox())!.width).toBe(400);
});
test('reduce motion restores controls after same-size source/permission changes',async({page,request})=>{
 await post(request,{type:'clinical:configure',settings:{reduced:true,autoPreview:false}});await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});const e=await settled(page,'rich');
 await post(request,{type:'clinical:configure',settings:{privacy:true}});await settled(page,'rich');await expect(e).toContainText('详情已保护');expect(await e.locator('.ci-content').evaluate((el:HTMLElement)=>el.inert)).toBe(false);
 await post(request,{type:'clinical:configure',settings:{privacy:false}});await settled(page,'rich');await e.getByRole('button',{name:'详情',exact:true}).click();await settled(page,'stack');expect(await e.locator('.ci-content').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
});
