// Explicit test entry: never included in the application's Vite build inputs.
import {Profiler,useEffect,useRef,useState} from 'react';
import type {ProfilerOnRenderCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {useClinicalLayout} from '../src/clinical/useClinicalLayout';
import {useSurfaceInput} from '../src/clinical/useSurfaceInput';
import {usePlatform} from '../src/clinical/usePlatform';
import type {Activity} from '../src/clinical/model';
import type {LabReport} from '../src/clinical/lab-reader/model';
import type {useLabReader} from '../src/clinical/lab-reader/useLabReader';
import type {connect} from '../src/lib/bridge';
import type {createEventConnection} from '../src/lib/bridge';
import type {ReportRows} from '../src/clinical/lab-reader/ReportRows';

export interface HarnessApi {
 change:(view:'idle'|'compact'|'expanded')=>void;
 suspend:(value:boolean)=>void;
 start:(a:Activity)=>void;
 read:()=>void;
 hover:(v:boolean)=>void;
 close:()=>void;
 snapshot:()=>{stage:string;remaining:number;hasReport:boolean;disposed:boolean};
 resetStats:()=>void;
 stats:{commits:number;durations:number[];gestureCommits:number;gestures:number[]};
 unmount:()=>void;
}
declare global {interface Window {__OPTIMIZATION_QA__?:HarnessApi}}
const query=new URLSearchParams(location.search),kind=query.get('harness')??'layout';
const stats:HarnessApi['stats']={commits:0,durations:[],gestureCommits:0,gestures:[]};
const api:HarnessApi={change:()=>{},suspend:()=>{},start:()=>{},read:()=>{},hover:()=>{},close:()=>{},snapshot:()=>({stage:'idle',remaining:0,hasReport:false,disposed:false}),resetStats:()=>{stats.commits=0;stats.durations=[];stats.gestureCommits=0;stats.gestures=[];},stats,unmount:()=>{}};
const profile:ProfilerOnRenderCallback=(_id,_phase,actualDuration)=>{stats.commits++;stats.durations.push(actualDuration);};
function Layout(){
 const [view,setView]=useState<'idle'|'compact'|'expanded'>('idle');
 const layout=useClinicalLayout(view,view,1,true,false);
 useEffect(()=>{api.change=setView;},[]);
 return <div ref={layout.host} data-testid="layout" style={{position:'relative',background:'#111',color:'white',overflow:'hidden'}}>
  <svg ref={layout.svg} width="144" height="32"><path data-shell="fill"/></svg>
  <div><div ref={layout.inner} data-testid="content">{layout.failed?null:<span>Synthetic source content {view}</span>}</div></div>
  {layout.failed&&<button style={{position:'absolute',inset:0}} onClick={layout.retry}>Retry display</button>}
 </div>;
}
function Gesture(){
 const host=useRef<HTMLDivElement>(null);
 const input=useSurfaceInput(host,{expanded:false,surface:'alert',hidden:false,reduced:false,hover:()=>{},expand:()=>{},collapse:()=>{},stack:()=>{},dismiss:()=>{},cycle:()=>{}});
 useEffect(()=>{stats.gestureCommits++;stats.gestures.push(input.gesture.shift);},[input.gesture]);
 return <div ref={host} data-testid="gesture" style={{width:372,height:88,background:'#345'}} onPointerDown={input.down} onPointerMove={input.move} onPointerUp={input.up}/>;
}
function Platform(){
 const host=useRef<HTMLDivElement>(null),[suspended,setSuspended]=useState(false);
 usePlatform(host,'one-source',suspended);useEffect(()=>{api.suspend=setSuspended;},[]);
 return <div ref={host} data-testid="platform" data-motion-phase="settled" data-current-height="32"/>;
}
let Reader=()=> <></>;
if(kind==='reader'){
 const prefix=query.has('baseline')?'/evidence/backups/optimization-20261013/baseline-source/src':'/src';
 const readerModule=await import(/* @vite-ignore */ `${prefix}/clinical/lab-reader/useLabReader.ts`) as {useLabReader:typeof useLabReader};
 const bridgeModule=await import(/* @vite-ignore */ `${prefix}/lib/bridge.ts`) as {connect:typeof connect;createEventConnection:typeof createEventConnection};
 const stream=bridgeModule.createEventConnection('preview');
 const rowsModule=await import(/* @vite-ignore */ `${prefix}/clinical/lab-reader/${query.has('baseline')?'LabScene':'ReportRows'}.tsx`) as {ReportRows:typeof ReportRows};
 const Rows=rowsModule.ReportRows;
 Reader=function ReaderHarness(){
  const reader=readerModule.useLabReader(()=>{},stream.send),owned=useRef<LabReport|null>(null);
  if(reader.report)owned.current=reader.report;
  useEffect(()=>{
   let dead=false,off:(()=>void)|undefined;const abort=new AbortController();
   void stream.connect(reader.receive,()=>{},abort.signal).then(clean=>{if(dead)clean();else off=clean;});
   return()=>{dead=true;abort.abort();off?.();};
  },[reader.receive]);
  api.start=a=>reader.start(a,'sum');api.read=()=>reader.read(true);api.hover=reader.hover;api.close=reader.close;
  api.snapshot=()=>({stage:reader.stage,remaining:reader.remaining,hasReport:Boolean(reader.report),disposed:Boolean(owned.current&&owned.current.items.length===0&&owned.current.id==='')});
  return <div data-testid="reader" data-stage={reader.stage}><span>{reader.remaining}</span>{reader.report&&<Rows report={reader.report} animate={false}/>}</div>;
 };
}
const root=createRoot(document.getElementById('root')!);api.unmount=()=>root.unmount();window.__OPTIMIZATION_QA__=api;
root.render(<Profiler id={kind} onRender={profile}>{kind==='reader'?<Reader/>:kind==='gesture'?<Gesture/>:kind==='platform'?<Platform/>:<Layout/>}</Profiler>);
