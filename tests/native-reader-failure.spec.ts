import {test,expect} from '@playwright/test';
interface ReaderClock {session:number;remainingMs:number;paused:boolean}
declare global {interface Window {__READER_NATIVE_QA__?:{failLayout:boolean;clocks:ReaderClock[]}}}
test('a failed native handoff masks a hover-paused reader and preserves its bounded lifetime',async({page,request})=>{
 await page.addInitScript(()=>{
  const state={failLayout:false,clocks:[] as ReaderClock[]};window.__READER_NATIVE_QA__=state;
  let serial=0,socket:WebSocket|undefined;
  const callbacks=new Map<number,(event:unknown)=>void>(),listeners=new Map<number,{event:string;handler:number}>();
  const emit=(event:string,payload:unknown)=>{for(const [id,listener] of listeners)if(listener.event===event)callbacks.get(listener.handler)?.({event,id,payload});};
  const internals={metadata:{currentWindow:{label:'island'},currentWebview:{label:'island'}},transformCallback:(fn:(e:unknown)=>void)=>{callbacks.set(++serial,fn);return serial;},invoke:async(command:string,args:Record<string,unknown>={})=>{
   if(command==='plugin:event|listen'){const event=String(args.event),handler=Number(args.handler);listeners.set(++serial,{event,handler});return serial;}
   if(command==='plugin:event|unlisten'){listeners.delete(Number(args.eventId));return;}
   if(command==='clinical_metrics')return {available:1920,height:1080,scale:1,canvasWidth:1200,topReserved:false};
   if(command==='clinical_layout'){if(state.failLayout&&args.phase!=='cancel')throw new Error('Injected region failure');return true;}
   if(command==='clinical_platform_status')return {notificationState:5,animationsEnabled:true,outsideClickAvailable:true,shortcutRegistered:true};
   if(command==='clinical_background_luminance')return .5;
   if(command==='clinical_capture')return {mode:'exclude'};
   if(command==='clinical_reader_clock'){state.clocks.push({session:Number(args.session),remainingMs:Number(args.remainingMs),paused:Boolean(args.paused)});return;}
   if(command==='island_pointer_inside')return {inside:false};
   if(command==='send_wire'){if(socket?.readyState!==WebSocket.OPEN)throw new Error('Offline');socket.send(JSON.stringify(args.payload));return;}
   if(command==='connect_stream'){
    if(socket){if(socket.readyState===WebSocket.OPEN)emit('island://connection','online');return;}
    socket=new WebSocket('ws://127.0.0.1:17322/events');socket.onopen=()=>emit('island://connection','online');socket.onmessage=e=>emit('island://wire',JSON.parse(e.data));socket.onclose=()=>emit('island://connection','offline');return;
   }
   throw new Error('Unexpected native command '+command);
  }};
  window.__TAURI_INTERNALS__=internals;Object.assign(window,{__TAURI_EVENT_PLUGIN_INTERNALS__:{unregisterListener:()=>{}}});
 });
 const push=async(data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
 await push({type:'clinical:reset'});await page.clock.install();await page.goto('/clinical.html?view=island');
 const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-motion-phase','settled');
 await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});await island.getByRole('button',{name:'查看检验报告摘要'}).click();
 await island.getByRole('button',{name:'阅读报告',exact:true}).click();await expect(island).toHaveAttribute('data-lab-state','read');await expect(island).toHaveAttribute('data-motion-phase','settled');
 await page.mouse.move(1,700);await island.locator('.lab-body').hover();
 await expect.poll(()=>page.evaluate(()=>window.__READER_NATIVE_QA__?.clocks.at(-1)?.paused)).toBe(true);
 await page.evaluate(()=>{if(window.__READER_NATIVE_QA__)window.__READER_NATIVE_QA__.failLayout=true;});await page.emulateMedia({reducedMotion:'reduce'});
 await expect(island).toHaveAttribute('data-motion-phase','failed');await expect(island.locator('.lab-row')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>window.__READER_NATIVE_QA__?.clocks.at(-1)?.paused),{timeout:1000}).toBe(false);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now())+10000);await page.clock.runFor(62000);
 await expect(island).toHaveAttribute('data-lab-state',/^(done|idle)$/);expect(await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().lab.hasReport)).toBe(false);
 expect(await page.evaluate(()=>window.__READER_NATIVE_QA__?.clocks.at(-1)?.remainingMs)).toBe(0);
});
