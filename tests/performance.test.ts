import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {measureFrames} from '../src/lib/performance';
let documentMock:EventTarget&{hidden:boolean};
let next=0;
const frames=new Map<number,FrameRequestCallback>();
beforeEach(()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']});
 documentMock=Object.assign(new EventTarget(),{hidden:false});
 vi.stubGlobal('document',documentMock);vi.stubGlobal('window',{setTimeout,clearTimeout,setInterval,clearInterval});
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{const id=++next;frames.set(id,cb);return id;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>{frames.clear();vi.useRealTimers();vi.unstubAllGlobals();});
it('finishes by its deadline even if the browser supplies no frames',async()=>{
 const step=vi.fn(),result=measureFrames(6000,{intervalMs:800,onInterval:step});
 await vi.advanceTimersByTimeAsync(6000);expect(await result).toMatchObject({frames:0,averageFps:0,hidden:false,cancelled:false});
 expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0);
 const calls=step.mock.calls.length;await vi.advanceTimersByTimeAsync(6000);expect(step).toHaveBeenCalledTimes(calls);
});
it('marks a hidden sample invalid and cancels all work immediately',async()=>{
 const step=vi.fn(),result=measureFrames(6000,{intervalMs:800,onInterval:step});
 await vi.advanceTimersByTimeAsync(1000);documentMock.hidden=true;documentMock.dispatchEvent(new Event('visibilitychange'));
 expect(await result).toMatchObject({hidden:true,frames:0});expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0);
 await vi.advanceTimersByTimeAsync(6000);expect(step).toHaveBeenCalledTimes(1);
});
it('supports unmount/restart cancellation and pre-aborted sessions',async()=>{
 const abort=new AbortController(),result=measureFrames(6000,{signal:abort.signal,intervalMs:800,onInterval:()=>{}});
 abort.abort();expect(await result).toMatchObject({cancelled:true});expect(vi.getTimerCount()).toBe(0);expect(frames.size).toBe(0);
 expect(await measureFrames(6000,{signal:abort.signal})).toMatchObject({cancelled:true});expect(frames.size).toBe(0);
});
it('cleans up when a diagnostic action fails',async()=>{
 const result=measureFrames(6000,{intervalMs:800,onInterval:()=>{throw new Error('test failure');}});
 await vi.advanceTimersByTimeAsync(800);expect(await result).toMatchObject({cancelled:true});expect(vi.getTimerCount()).toBe(0);expect(frames.size).toBe(0);
});
it('reports visible callback intervals without claiming presented frames',async()=>{
 const result=measureFrames(100);
 for(let n=0;n<5;n++){await vi.advanceTimersByTimeAsync(16);const entry=frames.entries().next().value;if(!entry)throw new Error('Expected frame');frames.delete(entry[0]);entry[1](performance.now());}
 await vi.advanceTimersByTimeAsync(20);expect(await result).toMatchObject({frames:4,medianMs:16,p95Ms:16,hidden:false,cancelled:false});
});
