import {afterEach,expect,it,vi} from 'vitest';
const harness=vi.hoisted(()=>({listeners:new Map<string,(e:{payload:unknown})=>void>(),count:0,fail:0,connectFails:false,deferred:null as null|(()=>void),delay:0}));
vi.mock('@tauri-apps/api/core',()=>({invoke:vi.fn(async(command:string)=>{if(command==='connect_stream'&&harness.connectFails)throw new Error('stream failed');})}));
vi.mock('@tauri-apps/api/webviewWindow',()=>({getCurrentWebviewWindow:()=>({listen:async(name:string,callback:(e:{payload:unknown})=>void)=>{
 const number=++harness.count;if(number===harness.fail)throw new Error('listen failed');
 if(number===harness.delay)await new Promise<void>(resolve=>{harness.deferred=resolve;});
 harness.listeners.set(name,callback);return()=>{if(harness.listeners.get(name)===callback)harness.listeners.delete(name);};
}})}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();harness.listeners.clear();harness.count=0;harness.fail=0;harness.delay=0;harness.connectFails=false;harness.deferred=null;});
async function bridge(){vi.stubGlobal('window',{__TAURI_INTERNALS__:{}});vi.stubGlobal('location',{search:'?view=island',pathname:'/clinical.html'});return import('../src/lib/bridge');}
it.each([1,2])('rolls back listeners when registration %i fails',async fail=>{
 harness.fail=fail;const b=await bridge(),states:string[]=[];
 await expect(b.connect(()=>{},s=>states.push(s))).rejects.toThrow('listen failed');
 expect(harness.listeners.size).toBe(0);expect(states).toEqual(['offline']);expect(await b.sendClinical({type:'clinical:sync'})).toBe(false);
});
it('rolls back on stream initialization failure',async()=>{
 harness.connectFails=true;const b=await bridge();await expect(b.connect(()=>{},()=>{})).rejects.toThrow('stream failed');expect(harness.listeners.size).toBe(0);
});
it('cleans a registration that finishes after abort',async()=>{
 harness.delay=2;const b=await bridge(),abort=new AbortController(),receive=vi.fn();
 const pending=b.connect(receive,()=>{},abort.signal);await vi.waitFor(()=>expect(harness.deferred).not.toBeNull());
 abort.abort();expect(harness.listeners.size).toBe(0);harness.deferred?.();await pending;
 expect(harness.listeners.size).toBe(0);expect(receive).not.toHaveBeenCalled();
});
it('replaces a setup safely and deduplicates repeated online notifications',async()=>{
 const b=await bridge(),old=vi.fn(),current=vi.fn(),states=vi.fn();const offOld=await b.connect(old,()=>{});
 const stale=harness.listeners.get('island://wire');const off=await b.connect(current,states);
 stale?.({payload:{type:'clinical:reset'}});harness.listeners.get('island://wire')?.({payload:{type:'clinical:reset'}});
 harness.listeners.get('island://connection')?.({payload:'online'});harness.listeners.get('island://connection')?.({payload:'online'});
 offOld();expect(old).not.toHaveBeenCalled();expect(current).toHaveBeenCalledTimes(1);expect(states).toHaveBeenCalledTimes(1);
 expect(await b.sendClinical({type:'clinical:sync'})).toBe(true);off();expect(harness.listeners.size).toBe(0);
});
