import { test, expect } from '@playwright/test';
const base='http://127.0.0.1:17321';
async function post(request:any,data:object){expect((await request.post(`${base}/api/push`,{data})).ok()).toBeTruthy();}
async function settled(page:any, mode='compact') { const p=page.getByTestId('island');await expect(p).toHaveAttribute('data-mode',mode);await expect(p).toHaveAttribute('data-motion-phase','settled');return p; }
test.beforeEach(async({page,request})=>{
 await post(request,{type:'reset'});await post(request,{type:'configure',settings:{engine:'gsap',shape:'notch',privacy:true,reduced:false,focus:false}});
 await page.goto('/?hoverDiagnostics=1');await expect(page.getByTestId('scenario-critical')).toBeEnabled();await settled(page);
});
for(const engine of ['gsap','css']) test(`${engine}: center/edge stationary hover and rapid reversals keep one target`,async({page,request})=>{
 await post(request,{type:'configure',settings:{engine}});const island=await settled(page);
 for(const side of ['left','right','bottom','center']){
  await page.mouse.move(1,1);await expect(island).toHaveAttribute('data-hovered','false');await settled(page);
  const r=(await island.boundingBox())!;
  const x=side==='left'?r.x+9:side==='right'?r.x+r.width-9:r.x+r.width/2;
  const y=side==='bottom'?r.y+r.height-1:r.y+r.height/2;
  await page.mouse.move(x,y);await expect(island).toHaveAttribute('data-hovered','true');await settled(page);
  const epoch=await island.getAttribute('data-motion-epoch');await page.waitForTimeout(900);
  expect(await island.getAttribute('data-motion-epoch')).toBe(epoch);await expect(island).toHaveAttribute('data-mode','compact');
 }
 const center=(await island.boundingBox())!;
 for(let i=0;i<8;i++) { await page.mouse.move(1,1);await page.waitForTimeout(25);await page.mouse.move(center.x+center.width/2,center.y+15);await page.waitForTimeout(25); }
 await expect(island).toHaveAttribute('data-hovered','true');await settled(page);
 const previousAccepted=await page.evaluate(()=>(window as any).__HOVER_TRACE__().filter((r:any)=>r.kind==='leave-accepted').length);
 await page.mouse.move(1,1);await expect(island).toHaveAttribute('data-hovered','false');await settled(page);
 const accepted=await page.evaluate(()=>(window as any).__HOVER_TRACE__().filter((r:any)=>r.kind==='leave-accepted').length);
 expect(accepted-previousAccepted).toBe(1);
});
test('stable painted surface remains a hover target through inert and child replacement',async({page,request})=>{
 const island=await settled(page);await island.hover();await expect(island).toHaveAttribute('data-hovered','true');await settled(page);
 const epoch=await island.getAttribute('data-motion-epoch');
 await page.locator('.notch-content').evaluate((e:HTMLElement)=>e.inert=true);await page.waitForTimeout(300);
 await expect(island).toHaveAttribute('data-hovered','true');expect(await island.getAttribute('data-motion-epoch')).toBe(epoch);
 await page.locator('.notch-content').evaluate((e:HTMLElement)=>e.inert=false);
 const before=await page.evaluate(()=>(window as any).__HOVER_TRACE__().at(-1)?.seq??0);
 await post(request,{type:'demo',scenario:'critical'});await settled(page,'expanded');
 await expect(island).toHaveAttribute('data-hovered','true');
 const flips=await page.evaluate(n=>(window as any).__HOVER_TRACE__().filter((r:any)=>r.seq>n&&r.kind==='hover-state'&&r.value===false),before);
 expect(flips).toHaveLength(0);
 await page.getByRole('button',{name:String.fromCodePoint(0x786e,0x8ba4,0x6536,0x5230),exact:true}).click();await settled(page,'success');
});
for(const engine of ['gsap','css']) test(`${engine}: reduced hover changes business hover but no epoch or empty animation`,async({page,request})=>{
 await post(request,{type:'configure',settings:{engine,reduced:true}});const island=await settled(page);
 const epoch=await island.getAttribute('data-motion-epoch');
 await island.hover();await expect(island).toHaveAttribute('data-hovered','true');await page.waitForTimeout(300);
 expect(await island.getAttribute('data-motion-epoch')).toBe(epoch);expect((await island.boundingBox())!.width).toBe(160);
 await page.mouse.move(1,1);await expect(island).toHaveAttribute('data-hovered','false');expect(await island.getAttribute('data-motion-epoch')).toBe(epoch);
 await post(request,{type:'demo',scenario:'service'});await settled(page,'peek');
 await island.hover();await page.waitForTimeout(6700);await expect(island).toHaveAttribute('data-mode','peek');
 await page.mouse.move(1,1);await expect(island).toHaveAttribute('data-hovered','false');
});
test('ordinary auto-collapse pauses on hover and resumes after a real departure',async({page,request})=>{
 await post(request,{type:'demo',scenario:'service'});const island=await settled(page,'peek');await island.hover();
 await page.waitForTimeout(6800);await expect(island).toHaveAttribute('data-mode','peek');
 await page.mouse.move(1,1);await expect(island).toHaveAttribute('data-hovered','false');
 await expect(island).toHaveAttribute('data-mode','compact',{timeout:8000});
});
test('StrictMode timers: quick leave cancels peek, mode changes cancel peek, unmount cancels both timers',async({page})=>{
 await page.evaluate(async()=>{
  const name='/tests/hover-harness.tsx';const module=await import(/* @vite-ignore */ name);
  const element=document.createElement('div');document.body.append(element);
  (window as any).__hoverHarness=module.mountHoverHarness(element);
 });
 const harness=page.getByTestId('hover-harness');await expect(harness).toBeVisible();
 await harness.hover();await page.waitForTimeout(30);await page.mouse.move(1,450);await page.waitForTimeout(180);
 expect(await page.evaluate(()=>(window as any).__hoverHarness.stats.modes)).toEqual([]);
 await harness.hover();await expect(harness).toHaveText('peek',{timeout:1000});
 await page.mouse.move(1,450);await page.waitForTimeout(100);await page.evaluate(()=>(window as any).__hoverHarness.setMode('compact'));
 await harness.hover();await page.evaluate(()=>(window as any).__hoverHarness.setMode('expanded'));await page.waitForTimeout(180);
 expect(await page.evaluate(()=>(window as any).__hoverHarness.stats.modes)).toEqual(['peek']);
 await page.mouse.move(1,450);await page.waitForTimeout(100);await page.evaluate(()=>(window as any).__hoverHarness.setMode('compact'));
 await harness.hover();await page.evaluate(()=>(window as any).__hoverHarness.unmount());
 const before=await page.evaluate(()=>(window as any).__hoverHarness.stats);await page.waitForTimeout(220);
 expect(await page.evaluate(()=>(window as any).__hoverHarness.stats)).toEqual(before);
 await page.evaluate(async()=>{
  const name='/tests/hover-harness.tsx';const module=await import(/* @vite-ignore */ name);
  const element=document.createElement('div');document.body.append(element);(window as any).__hoverHarness=module.mountHoverHarness(element);
 });
 await harness.hover();
 const pendingLeave=await page.evaluate(()=>{
  document.querySelector('[data-testid=hover-harness]')!.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body,clientX:1,clientY:450}));
  (window as any).__hoverHarness.unmount();return (window as any).__hoverHarness.stats;
 });
 await page.waitForTimeout(180);expect(await page.evaluate(()=>(window as any).__hoverHarness.stats)).toEqual(pendingLeave);
});
test('compact close cancels its pending 120ms preview without acknowledging a critical event',async({page,request})=>{
 await post(request,{type:'demo',scenario:'critical'});await settled(page,'expanded');
 await page.mouse.move(1,1);await post(request,{type:'view',mode:'compact'});const island=await settled(page);
 await island.hover();await page.keyboard.press('Escape');await page.waitForTimeout(300);await expect(island).toHaveAttribute('data-mode','compact');
 const state=await (await request.get(`${base}/api/state`)).json();expect(state.receipts).toEqual([]);
});
