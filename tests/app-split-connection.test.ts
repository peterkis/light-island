import {it,expect,vi,afterEach} from 'vitest';
const sockets:Array<{onopen?:()=>void;onmessage?:(event:{data:string})=>void;onclose?:()=>void;readyState:number;send:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>}>=[];
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();sockets.length=0;vi.useRealTimers();});
async function bridge(){
 vi.useFakeTimers();vi.stubGlobal('window',{});vi.stubGlobal('location',{pathname:'/workbench.html',search:''});
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
