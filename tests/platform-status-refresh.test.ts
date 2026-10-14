import {it,expect,vi,afterEach} from 'vitest';
import {watchPlatformStatus} from '../src/clinical/platformStatus';
const status=(animationsEnabled:boolean)=>({notificationState:5,animationsEnabled,outsideClickAvailable:false,shortcutRegistered:false});
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function surfaces(){
 const foreground=new EventTarget(),visibility=Object.assign(new EventTarget(),{visibilityState:'visible'});
 vi.stubGlobal('window',foreground);vi.stubGlobal('document',visibility);return {foreground,visibility};
}
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});

it('refreshes Windows motion when the workbench regains focus',async()=>{
 const {foreground}=surfaces(),query=vi.fn().mockResolvedValue(status(true)),values:Array<boolean|null>=[];
 const off=watchPlatformStatus(query,value=>values.push(value?.animationsEnabled??null));await flush();expect(values.at(-1)).toBe(true);
 query.mockResolvedValue(status(false));foreground.dispatchEvent(new Event('focus'));expect(values.at(-1)).toBe(null);await flush();
 expect(values.at(-1)).toBe(false);expect(query).toHaveBeenCalledTimes(2);off();
});

it('refreshes only on visible transitions and has no polling timer',async()=>{
 vi.useFakeTimers();const {visibility}=surfaces(),query=vi.fn().mockResolvedValue(status(true));
 const off=watchPlatformStatus(query,()=>{});await flush();await vi.advanceTimersByTimeAsync(60000);expect(query).toHaveBeenCalledOnce();
 visibility.visibilityState='hidden';visibility.dispatchEvent(new Event('visibilitychange'));await flush();expect(query).toHaveBeenCalledOnce();
 visibility.visibilityState='visible';visibility.dispatchEvent(new Event('visibilitychange'));await flush();expect(query).toHaveBeenCalledTimes(2);off();
});

it('failed and malformed refreshes invalidate previously enabled motion',async()=>{
 const {foreground}=surfaces(),query=vi.fn().mockResolvedValue(status(true)),values:Array<boolean|null>=[];
 const off=watchPlatformStatus(query,value=>values.push(value?.animationsEnabled??null));await flush();expect(values.at(-1)).toBe(true);
 query.mockRejectedValueOnce(new Error('OS unavailable'));foreground.dispatchEvent(new Event('focus'));await flush();expect(values.at(-1)).toBe(null);
 query.mockResolvedValueOnce({animationsEnabled:true});foreground.dispatchEvent(new Event('focus'));await flush();expect(values.at(-1)).toBe(null);off();
});

it('coalesces concurrent focus events and rejects an obsolete reply',async()=>{
 const {foreground}=surfaces(),answers:Array<(value:unknown)=>void>=[],values:Array<boolean|null>=[];
 const query=vi.fn(()=>new Promise<unknown>(resolve=>answers.push(resolve))),off=watchPlatformStatus(query,value=>values.push(value?.animationsEnabled??null));
 foreground.dispatchEvent(new Event('focus'));foreground.dispatchEvent(new Event('focus'));expect(query).toHaveBeenCalledOnce();
 answers[0](status(true));await flush();expect(query).toHaveBeenCalledTimes(2);expect(values).not.toContain(true);
 answers[1](status(false));await flush();expect(values.at(-1)).toBe(false);off();
});

it('disposal removes both listeners and ignores late replies',async()=>{
 const {foreground,visibility}=surfaces();let answer:((value:unknown)=>void)|undefined;
 const query=vi.fn(()=>new Promise<unknown>(resolve=>{answer=resolve;})),update=vi.fn(),off=watchPlatformStatus(query,update);
 off();const count=update.mock.calls.length;foreground.dispatchEvent(new Event('focus'));visibility.dispatchEvent(new Event('visibilitychange'));
 answer?.(status(true));await flush();expect(query).toHaveBeenCalledOnce();expect(update).toHaveBeenCalledTimes(count);
});
