import {afterEach,expect,it,vi} from 'vitest';

const harness=vi.hoisted(()=>({next:0,callbacks:new Map<number,(event:unknown)=>void>(),listeners:new Map<number,{event:string,target:{kind:string,label?:string},handler:number}>()}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();harness.callbacks.clear();harness.listeners.clear();});

it('uses the installed Tauri window target so source replies do not enter studio, while public broadcasts still arrive',async()=>{
 const metadata={currentWindow:{label:'studio'},currentWebview:{label:'studio'}};
 vi.stubGlobal('window',{__TAURI_INTERNALS__:{metadata,
  transformCallback:(callback:(event:unknown)=>void)=>{const id=++harness.next;harness.callbacks.set(id,callback);return id;},
  invoke:async(command:string,args:any)=>{
   if(command==='plugin:event|listen'){const id=++harness.next;harness.listeners.set(id,args);return id;}
   if(command==='plugin:event|unlisten')harness.listeners.delete(args.eventId);
  },
 },__TAURI_EVENT_PLUGIN_INTERNALS__:{unregisterListener:()=>{}}});
 vi.stubGlobal('location',{search:'',pathname:'/clinical.html'});
 const {connect}=await import('../src/lib/bridge');
 const studio:any[]=[],source:any[]=[],states:string[]=[];
 const offStudio=await connect(e=>studio.push(e),s=>states.push(s));
 metadata.currentWindow.label=metadata.currentWebview.label='clinical-source';
 const offSource=await connect(e=>source.push(e),()=>{});
 const deliver=(event:string,payload:unknown,target?:string)=>{
  for(const listener of harness.listeners.values()){
   if(listener.event===event&&(!target||listener.target.kind==='Any'||listener.target.label===target))harness.callbacks.get(listener.handler)?.({event,payload,id:0});
  }
 };
 deliver('island://wire',{type:'clinical:source',labReport:{items:['private-fixture']}},'clinical-source');
 expect(studio).toEqual([]);expect(source).toHaveLength(1);
 deliver('island://wire',{type:'clinical:snapshot'});expect(studio).toHaveLength(1);expect(source).toHaveLength(2);
 deliver('island://connection','online');expect(states).toEqual(['online']);
 offStudio();offSource();expect(harness.listeners.size).toBe(0);
});
