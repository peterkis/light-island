import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {evidencePath} from './evidence-path';

for(const baseline of process.env.ISLAND_PROFILE_BASELINE==='1'?[true,false]:[false])test(`reader profiling ${baseline?'baseline':'optimized'}: running and paused budgets`,async({page,request})=>{
 await request.post('http://127.0.0.1:17322/api/push',{data:{type:'clinical:reset'}});
 await request.post('http://127.0.0.1:17322/api/push',{data:{type:'clinical:scenario',scenario:'S04',labVariant:'baseline'}});
 const state=await(await request.get('http://127.0.0.1:17322/api/clinical-state')).json();
 await page.routeWebSocket('ws://127.0.0.1:17322/events',socket=>{
  const server=socket.connectToServer();server.onMessage(raw=>{
   const event=JSON.parse(raw.toString());if(event.type==='clinical:lab-report'&&event.report){const items=event.report.items;event.report.items=Array.from({length:128},(_,i)=>({...items[i%items.length],id:'profile-'+i}));}
   socket.send(JSON.stringify(event));
  });
 });
 // Keep Vite's React preamble while selecting the real clinical transport URL.
 await page.addInitScript(()=>{if(location.pathname==='/tests/optimization-harness.html')history.replaceState(null,'','/clinical.html'+location.search);});
 await page.goto('/tests/optimization-harness.html?harness=reader'+(baseline?'&baseline=1':''));
 await expect.poll(()=>page.evaluate(()=>Boolean(window.__OPTIMIZATION_QA__))).toBe(true);
 await page.waitForTimeout(250);await page.evaluate(a=>window.__OPTIMIZATION_QA__?.start(a),state.activities[0]);
 await expect(page.locator('.lab-row')).toHaveCount(128);await page.evaluate(()=>window.__OPTIMIZATION_QA__?.read());
 await expect(page.getByTestId('reader')).toHaveAttribute('data-stage','read');
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.resetStats());await page.waitForTimeout(1500);
 const running=await page.evaluate(()=>structuredClone(window.__OPTIMIZATION_QA__?.stats));
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.hover(true));await page.waitForTimeout(100);
 const before=await page.evaluate(()=>window.__OPTIMIZATION_QA__?.snapshot().remaining);
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.resetStats());await page.waitForTimeout(1500);
 const paused=await page.evaluate(()=>structuredClone(window.__OPTIMIZATION_QA__?.stats));
 expect(await page.evaluate(()=>window.__OPTIMIZATION_QA__?.snapshot().remaining)).toBe(before);
 if(baseline)expect(paused?.commits).toBeGreaterThan(5);else expect(paused?.commits).toBe(0);
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.hover(false));await page.waitForTimeout(250);
 expect(await page.evaluate(()=>window.__OPTIMIZATION_QA__?.snapshot().remaining)).toBeLessThan(before??0);
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.close());await expect(page.locator('.lab-row')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__OPTIMIZATION_QA__?.snapshot())).toMatchObject({stage:'idle',hasReport:false,disposed:true});
 await writeFile(evidencePath(`react-profile-${baseline?'baseline':'optimized'}.json`),JSON.stringify({baseline,rows:128,sampleMs:1500,running,paused,scope:'React development Profiler; not native presentation'},null,2));
});

test('pointer moves share one pending frame and cancellation drops unpainted input',async({page})=>{
 await page.goto('/tests/optimization-harness.html?harness=gesture');const target=page.getByTestId('gesture');await expect(target).toBeVisible();
 await page.mouse.move(30,30);await page.mouse.down();
 await page.evaluate(()=>{
  const pending=new Map<number,FrameRequestCallback>();let id=100000;
  window.requestAnimationFrame=callback=>{pending.set(++id,callback);return id;};window.cancelAnimationFrame=token=>{pending.delete(token);};
  Object.assign(window,{__flushGesture:()=>{const frames=[...pending.values()];pending.clear();frames.forEach(f=>f(performance.now()));}});
  window.__OPTIMIZATION_QA__?.resetStats();
  const element=document.querySelector('[data-testid="gesture"]');
  for(let i=0;i<100;i++)element?.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:40+i,clientY:30,buttons:1}));
 });
 expect(await page.evaluate(()=>window.__OPTIMIZATION_QA__?.stats.gestureCommits)).toBe(0);
 await page.evaluate(()=>{const flush=Reflect.get(window,'__flushGesture') as ()=>void;flush();});
 await expect.poll(()=>page.evaluate(()=>window.__OPTIMIZATION_QA__?.stats.gestureCommits)).toBe(1);
 await page.evaluate(()=>{
  document.querySelector('[data-testid="gesture"]')?.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:160,clientY:30,buttons:1}));
  document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}));
  const flush=Reflect.get(window,'__flushGesture') as ()=>void;flush();
 });
 await expect.poll(()=>page.evaluate(()=>window.__OPTIMIZATION_QA__?.stats.gestures.at(-1))).toBe(0);await page.mouse.up();
});

test('platform samples stop while privacy or actual visibility suspends them',async({page})=>{
 await page.addInitScript(()=>{
  const calls:string[]=[];Object.assign(window,{__platformCalls:calls});
  window.__TAURI_INTERNALS__={transformCallback:()=>1,invoke:async(command:string)=>{
   calls.push(command);if(command==='clinical_platform_status')return {notificationState:5,animationsEnabled:true,outsideClickAvailable:true,shortcutRegistered:true};
   if(command==='clinical_background_luminance')return .5;return 1;
  }};
 });
 await page.clock.install();await page.goto('/tests/optimization-harness.html?view=island&harness=platform');await expect(page.getByTestId('platform')).toBeAttached();
 await page.waitForTimeout(100);expect(await page.evaluate(()=>(Reflect.get(window,'__platformCalls') as string[]).filter(c=>c==='clinical_platform_status').length)).toBe(1);
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.suspend(true));await page.waitForTimeout(50);
 const before=await page.evaluate(()=>(Reflect.get(window,'__platformCalls') as string[]).filter(c=>c==='clinical_background_luminance').length);
 await page.clock.runFor(6000);expect(await page.evaluate(()=>(Reflect.get(window,'__platformCalls') as string[]).filter(c=>c==='clinical_background_luminance').length)).toBe(before);
 await page.evaluate(()=>window.__OPTIMIZATION_QA__?.suspend(false));await page.waitForTimeout(50);await page.clock.runFor(2200);
 expect(await page.evaluate(()=>(Reflect.get(window,'__platformCalls') as string[]).filter(c=>c==='clinical_background_luminance').length)).toBeGreaterThan(before);
});
