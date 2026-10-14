import {it,expect,vi,afterEach} from 'vitest';
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@tauri-apps/api/core',()=>({invoke}));
const sockets:Array<{onopen?:()=>void;onmessage?:(event:{data:string})=>void;onclose?:()=>void;readyState:number;send:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>}>=[];
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();sockets.length=0;invoke.mockReset();vi.useRealTimers();});
async function bridge(workbench=false){
 vi.useFakeTimers();vi.stubGlobal('window',workbench?{__TAURI_INTERNALS__:{}}:{});vi.stubGlobal('location',{pathname:'/workbench.html',search:workbench?'?app=workbench':''});
 class Socket{static OPEN=1;readyState=1;send=vi.fn();close=vi.fn();constructor(){sockets.push(this);}}
 vi.stubGlobal('WebSocket',Socket);return import('../src/lib/bridge');
}
const message=(i:number,payload:object)=>sockets[i]?.onmessage?.({data:JSON.stringify(payload)});
const ready=(i:number,session:string)=>{sockets[i]?.onopen?.();message(i,{type:'transport:hello',protocolVersion:2,sourceSessionId:session});message(i,{type:'transport:ready',sourceSessionId:session});};
it('disposal of a preview leaves the independent island connection alive',async()=>{
 const {createEventConnection}=await bridge(),island=createEventConnection('island'),preview=createEventConnection('preview');
 await island.connect(()=>{},()=>{});await preview.connect(()=>{},()=>{});ready(0,'island-session');ready(1,'preview-session');
 preview.dispose();expect(await island.send({type:'clinical:sync'})).toBe(true);expect(sockets[0]?.close).not.toHaveBeenCalled();expect(sockets[1]?.close).toHaveBeenCalledOnce();island.dispose();
});
it('incompatible sources and previous-session frames never become an online source',async()=>{
 const {createEventConnection}=await bridge(),stream=createEventConnection('preview'),events:unknown[]=[],states:string[]=[];
 await stream.connect(e=>events.push(e),s=>states.push(s));sockets[0]?.onopen?.();message(0,{type:'transport:hello',protocolVersion:1,sourceSessionId:'old'});expect(states).toContain('incompatible');expect(states).not.toContain('online');
 stream.dispose();await stream.connect(e=>events.push(e),s=>states.push(s));ready(1,'current');message(1,{type:'clinical:activity',sourceSessionId:'old',activity:{}});expect(events).toEqual([{type:'transport:session',sourceSessionId:'current'}]);stream.dispose();
});
it('a failed workbench listener never opens a socket to the occupied port',async()=>{
 const {createEventConnection}=await bridge(true),states:string[]=[];
 invoke.mockResolvedValue({port:17323,listening:false,sourceSessionId:'owned-source'});
 const stream=createEventConnection('preview');await stream.connect(()=>{},state=>states.push(state));await Promise.resolve();
 expect(sockets).toHaveLength(0);expect(states).toContain('offline');expect(await stream.send({type:'clinical:sync'})).toBe(false);
 invoke.mockResolvedValue({port:17323,listening:true,sourceSessionId:'owned-source'});await vi.advanceTimersByTimeAsync(1000);
 expect(sockets).toHaveLength(1);ready(0,'owned-source');expect(states.at(-1)).toBe('online');stream.dispose();
});
it('a workbench preview rejects a protocol-v2 hello from another source session',async()=>{
 const {createEventConnection}=await bridge(true),states:string[]=[],events:unknown[]=[];
 invoke.mockResolvedValue({port:17323,listening:true,sourceSessionId:'owned-source'});
 const stream=createEventConnection('preview');await stream.connect(event=>events.push(event),state=>states.push(state));await Promise.resolve();
 ready(0,'unrelated-source');expect(states.at(-1)).toBe('incompatible');expect(states).not.toContain('online');expect(events).toEqual([]);expect(sockets[0]?.send).not.toHaveBeenCalled();stream.dispose();
});
it('a disposed workbench connection cannot create a socket after a late status reply',async()=>{
 const {createEventConnection}=await bridge(true);let answer:((value:unknown)=>void)|undefined;
 invoke.mockImplementation(()=>new Promise(resolve=>{answer=resolve;}));
 const stream=createEventConnection('preview');await stream.connect(()=>{},()=>{});stream.dispose();
 answer?.({port:17323,listening:true,sourceSessionId:'owned-source'});await Promise.resolve();await Promise.resolve();expect(sockets).toHaveLength(0);
});
