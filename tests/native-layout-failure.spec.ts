import {test,expect} from '@playwright/test';
type Fault='none'|'initial'|'final'|'commit'|'reject'|'pending'|'metrics'|'metrics-pending';
interface Call {epoch:number;phase:string;bodyWidth:number;height:number}
declare global {interface Window {__NATIVE_LAYOUT_QA__?:{fault:Fault;calls:Call[];release?:()=>void}}}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const state:{fault:Fault;calls:Call[];release?:()=>void}={fault:'none',calls:[]};window.__NATIVE_LAYOUT_QA__=state;
  let epoch=0;const closed=new Set<number>(),seen=new Set<number>();
  window.__TAURI_INTERNALS__={invoke:async(command:string,args:Call)=>{
   if(command==='clinical_metrics'){if(state.fault==='metrics-pending')return new Promise(()=>{});return {available:1920,height:1080,scale:state.fault==='metrics'?0:1,canvasWidth:1200,topReserved:false};}
   if(command!=='clinical_layout')throw new Error('Unexpected command '+command);
   state.calls.push({...args});
   if(args.phase==='cancel'){closed.add(args.epoch);return true;}
   if(args.epoch<epoch||closed.has(args.epoch))return false;epoch=args.epoch;
   const first=!seen.has(epoch);seen.add(epoch);
   if(state.fault==='pending'&&first)return new Promise<boolean>(resolve=>{state.release=()=>resolve(true);});
   if(state.fault==='initial'&&first||state.fault==='final'&&args.phase==='frame'&&args.bodyWidth===372||state.fault==='commit'&&args.phase==='commit')throw new Error('Injected '+state.fault);
   if(state.fault==='reject')return false;
   if(args.phase==='commit')closed.add(epoch);return true;
  }};
 });
 await page.goto('/tests/optimization-harness.html?view=island&harness=layout');
 await expect(page.getByTestId('layout')).toHaveAttribute('data-motion-phase','settled');
});
test('a superseded pending epoch cannot overwrite the current surface',async({page})=>{
 await page.evaluate(()=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault='pending';window.__OPTIMIZATION_QA__?.change('expanded');});
 await expect.poll(()=>page.evaluate(()=>Boolean(window.__NATIVE_LAYOUT_QA__?.release))).toBe(true);
 await page.evaluate(()=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault='none';window.__OPTIMIZATION_QA__?.change('compact');});
 const host=page.getByTestId('layout');await expect(host).toHaveAttribute('data-motion-phase','settled');const epoch=await host.getAttribute('data-layout-epoch');
 await page.evaluate(()=>window.__NATIVE_LAYOUT_QA__?.release?.());await page.waitForTimeout(150);
 await expect(host).toHaveAttribute('data-motion-phase','settled');expect(await host.getAttribute('data-layout-epoch')).toBe(epoch);expect(await host.evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBe(268);
});
for(const fault of ['metrics','metrics-pending'] as const)test(`native ${fault} failure can recover without revealing an unconfirmed surface`,async({page})=>{
 await page.evaluate(f=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault=f;window.dispatchEvent(new Event('resize'));},fault);
 const host=page.getByTestId('layout');await expect(host).toHaveAttribute('data-motion-phase','failed');await expect(page.getByTestId('content')).not.toContainText('Synthetic source content');
 await page.evaluate(()=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault='none';});await page.getByRole('button',{name:'Retry display'}).click();
 await expect(host).toHaveAttribute('data-motion-phase','settled');await expect(page.getByTestId('content')).toContainText('idle');
});
for(const fault of ['initial','final','commit','reject','pending'] as const)test(`native ${fault} failure is finite, clears content, and retries with a new epoch`,async({page})=>{
 await page.evaluate(f=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault=f;window.__OPTIMIZATION_QA__?.change('expanded');},fault);
 const host=page.getByTestId('layout');await expect(host).toHaveAttribute('data-motion-phase','failed');
 await expect(page.getByTestId('content')).not.toContainText('Synthetic source content');await expect(page.getByRole('button',{name:'Retry display'})).toBeVisible();
 expect(await page.getByTestId('content').evaluate(e=>(e as HTMLElement).inert)).toBe(false);
 const before=await page.evaluate(()=>window.__NATIVE_LAYOUT_QA__?.calls.length);await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__NATIVE_LAYOUT_QA__?.calls.length)).toBe(before);
 const failedEpoch=await host.getAttribute('data-layout-epoch');await page.evaluate(()=>{if(window.__NATIVE_LAYOUT_QA__)window.__NATIVE_LAYOUT_QA__.fault='none';});await page.getByRole('button',{name:'Retry display'}).click();
 await expect(host).toHaveAttribute('data-motion-phase','settled');expect(await host.getAttribute('data-layout-epoch')).not.toBe(failedEpoch);
 await expect(page.getByTestId('content')).toContainText('expanded');
 await page.evaluate(()=>window.__NATIVE_LAYOUT_QA__?.release?.());await page.waitForTimeout(150);await expect(host).toHaveAttribute('data-motion-phase','settled');
 expect(await host.evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBe(372);
});
