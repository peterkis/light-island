import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:17322';
const post=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
const island=(page:any)=>page.getByTestId('clinical-island');
const settle=async(page:any,surface?:string)=>{const e=island(page);if(surface)await expect(e).toHaveAttribute('data-surface',surface);await expect(e).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);return e;};
test.beforeEach(async({page,request})=>{await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');await settle(page,'idle');});

test('swipe ignores only this preview and undo opens the exact intact source',async({page,request})=>{
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.hover();
 const before=await(await request.get(base+'/api/clinical-state')).json(),r=(await e.boundingBox())!;
 await page.mouse.move(r.x+100,r.y+45);await page.mouse.down();await page.mouse.move(r.x+280,r.y+45,{steps:8});await page.mouse.up();
 await settle(page,'idle');await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toBeVisible();
 expect((await(await request.get(base+'/api/clinical-state')).json()).activities).toEqual(before.activities);
 expect(await page.getByRole('dialog').count()).toBe(0);await e.getByRole('button',{name:'撤销忽略本次快览'}).click();await settle(page,'rich');await expect(e).toContainText(before.activities[0].title);
});
test('short drag returns with no source navigation and undo is time/version bounded',async({page,request})=>{
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert'),r=(await e.boundingBox())!;
 await page.mouse.move(r.x+100,r.y+45);await page.mouse.down();await page.mouse.move(r.x+120,r.y+45,{steps:5});await page.mouse.up();await settle(page,'alert');expect(await page.getByRole('dialog').count()).toBe(0);
 await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await post(request,{type:'clinical:scenario',scenario:'S04',stage:1});await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0);
 await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});await settle(page,'alert');await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0,{timeout:5000});
});
test('source mute is local, reversible and cannot suppress important events',async({page,request})=>{
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.getByRole('button',{name:'展开完整摘要'}).click();await settle(page,'rich');await e.click({button:'right'});await settle(page,'stack');
 await e.getByRole('button',{name:/静音此来源/}).click();await expect(e.getByRole('button',{name:/取消静音此来源/})).toHaveAttribute('aria-pressed','true');await e.getByRole('button',{name:'收起协作详情'}).click();await settle(page,'compact');
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:1});await page.waitForTimeout(400);await expect(e).toHaveAttribute('data-surface','compact');
 const state=await(await request.get(base+'/api/clinical-state')).json();expect(state.activities[0].stage).toBe(1);
 await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await settle(page,'rich');await expect(e.getByRole('heading')).toContainText('危急值');
});
test('finite neck appears during split, vanishes at rest and reduced motion skips it',async({page,request})=>{
 await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'compact');
 // Arm before either HTTP command; sample the actual split rather than network latency.
 await e.evaluate(el=>{(window as unknown as {__qaNeckSamples:Promise<string[]>}).__qaNeckSamples=new Promise(resolve=>{const frames:string[]=[];const start=performance.now();let seenAt=0;const tick=()=>{const now=performance.now(),value=el.getAttribute('data-neck')??'';frames.push(value);if(value==='true'&&!seenAt)seenAt=now;if(now-start<5000&&(!seenAt||now-seenAt<700))requestAnimationFrame(tick);else resolve(frames);};requestAnimationFrame(tick);});});
 await post(request,{type:'clinical:scenario',scenario:'S02',stage:0});await post(request,{type:'clinical:view',mode:'compact'});
 const samples=await page.evaluate(async()=>{const w=window as unknown as {__qaNeckSamples?:Promise<string[]>};const result=await w.__qaNeckSamples;delete w.__qaNeckSamples;return result;});expect(samples).toContain('true');await settle(page,'compact');await expect(e).toHaveAttribute('data-neck','false');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
 await page.emulateMedia({reducedMotion:'reduce'});await settle(page,'compact');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
});
test('button press retains text size, spring releases and route failure is visible',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});const e=await settle(page,'rich'),button=e.getByRole('button',{name:'详情',exact:true}),r=(await button.boundingBox())!;
 // A callback can carry a frame timestamp older than performance.now() at the event.
 await page.evaluate(()=>{const w=window as unknown as {__qaRaf:typeof requestAnimationFrame};w.__qaRaf=window.requestAnimationFrame;window.requestAnimationFrame=callback=>w.__qaRaf(time=>callback(time-50));});
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 expect(await button.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await expect.poll(()=>button.evaluate(el=>{const value=(el as HTMLElement).style.getPropertyValue('--ux-press');return value!==''&&Number(value)<.99;})).toBe(true);
 const host=(await e.boundingBox())!;await page.mouse.move(host.x+190,host.y+50);await page.mouse.up();await expect.poll(()=>button.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ux-press'))).toBe('');
 await page.evaluate(()=>{const w=window as unknown as {__qaRaf?:typeof requestAnimationFrame};window.requestAnimationFrame=w.__qaRaf!;delete w.__qaRaf;});expect(errors).toEqual([]);
 await post(request,{type:'clinical:configure',settings:{routeFault:'failed'}});await e.getByRole('button',{name:'打开危急值流程'}).click();await settle(page,'stack');await expect(e.getByRole('status')).toContainText('未能打开来源');expect(await page.getByRole('dialog').count()).toBe(0);
});
test('compact overflow makes one 30 DIP/s traversal and reduced motion keeps it static',async({page,request})=>{
 await post(request,{type:'clinical:configure',settings:{autoPreview:false,textScale:2.25}});await post(request,{type:'clinical:preferences',settings:{compactText:true}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'compact');
 expect(await e.locator('.ux-marquee-text').evaluate(el=>el.getAnimations().length)).toBe(1);await e.hover();
 const label=e.locator('.ux-compact-label');await expect(label).toHaveAttribute('data-overflow','true');
 const timing=await label.evaluate(el=>{const a=el.querySelector('span')!.getAnimations()[0];return a?.effect?.getTiming();});expect(timing?.iterations).toBe(1);expect(Number(timing?.duration)).toBeGreaterThan(2400);
 await page.emulateMedia({reducedMotion:'reduce'});await settle(page,'compact');expect(await label.evaluate(el=>el.querySelector('span')!.getAnimations().length)).toBe(0);
});
test('permission revocation immediately removes undo and compact sensitive text',async({page,request})=>{
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await post(request,{type:'clinical:configure',settings:{privacy:true}});await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0);await expect(page.locator('.ci-sr')).toHaveText('新消息');
});
