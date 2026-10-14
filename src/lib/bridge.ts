import {invoke} from '@tauri-apps/api/core';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import {parseEnvelope,SOURCE_PROTOCOL_VERSION} from './protocol';
import type {WireEnvelope,OutgoingCommand,ClinicalIslandCommand,ClinicalSimulatorCommand,LegacyCommand,ExperimentAction} from './protocol';
export const native=Boolean(window.__TAURI_INTERNALS__);
export const nativeWorkbench=native&&(import.meta.env.VITE_APP_TARGET==='workbench'||new URLSearchParams(location.search).get('app')==='workbench');
export const nativeIsland=native&&!nativeWorkbench&&new URLSearchParams(location.search).get('view')==='island';
export type Wire=WireEnvelope;
export type Connection='connecting'|'online'|'offline'|'incompatible';
export type ClientRole='island'|'preview'|'source'|'legacy';
export interface EventConnection{
 connect(onMessage:(event:Wire)=>void,onConnection:(state:Connection)=>void,signal?:AbortSignal):Promise<()=>void>;
 send(event:OutgoingCommand):Promise<boolean>;
 dispose():void;
}
/** Each controller owns a connection. A preview cannot dispose another viewer. */
export function createEventConnection(role:ClientRole,endpoint=(role==='legacy'?import.meta.env.VITE_ISLAND_LEGACY_URL:import.meta.env.VITE_ISLAND_DEMO_URL)||(role==='legacy'?'ws://127.0.0.1:17321/events':'ws://127.0.0.1:17322/events')):EventConnection{
 let generation=0,dispose=()=>{},transmit:((event:OutgoingCommand)=>Promise<boolean>)|undefined;
 const clientId=crypto.randomUUID();
 const connection:EventConnection={dispose:()=>dispose(),send:event=>transmit?transmit(event):Promise.resolve(false),connect:async(onMessage,onConnection,signal)=>{
  dispose();const current=++generation;let disposed=false;const cleanups:Array<()=>void>=[];
  const cleanup=()=>{if(disposed)return;disposed=true;signal?.removeEventListener('abort',cleanup);for(const off of cleanups.splice(0).reverse())try{off();}catch{/* Dispose all owned resources. */}if(current===generation)transmit=undefined;};
  dispose=cleanup;signal?.addEventListener('abort',cleanup,{once:true});if(signal?.aborted){cleanup();return cleanup;}
  const valid=()=>!disposed&&current===generation;
  const receive=(value:unknown)=>{const event=parseEnvelope(value);if(valid()&&event)onMessage(event);};
  let lastState:Connection|undefined;
  const state=(value:unknown)=>{if(valid()&&(value==='connecting'||value==='online'||value==='offline'||value==='incompatible')&&value!==lastState){lastState=value;onConnection(value);}};
  if(native&&!nativeWorkbench){
   try{
    const appWindow=getCurrentWebviewWindow();
    const offWire=await appWindow.listen<unknown>('island://wire',event=>receive(event.payload));
    if(!valid()){offWire();return cleanup;}cleanups.push(offWire);
    const offState=await appWindow.listen<unknown>('island://connection',event=>state(event.payload));
    if(!valid()){offState();return cleanup;}cleanups.push(offState);
    transmit=async payload=>{if(!valid())return false;try{await invoke('send_wire',{payload});return valid();}catch{return false;}};
    await invoke('connect_stream');return cleanup;
   }catch(error){if(valid())state('offline');cleanup();throw error;}
  }
  let socket:WebSocket|undefined,retry:ReturnType<typeof setTimeout>|undefined,handshake:ReturnType<typeof setTimeout>|undefined,attempt=0,session:string|null=null,incompatible=false;
  const schedule=()=>{retry=setTimeout(()=>void open(),Math.min(15000,500*2**Math.min(attempt++,5))+Math.random()*250);};
 const open=async()=>{
   if(!valid())return;state('connecting');session=null;incompatible=false;
   let actualEndpoint=endpoint,expectedSession:string|null=null;
   if(nativeWorkbench){
    try{
     const status=await invoke<{port:number;listening:boolean;sourceSessionId:string}>('workbench_status');
     if(!valid())return;
     if(status.listening!==true||!Number.isInteger(status.port)||status.port<1||status.port>65535||typeof status.sourceSessionId!=='string'||!status.sourceSessionId||status.sourceSessionId.length>80){state('offline');schedule();return;}
     actualEndpoint=`ws://127.0.0.1:${status.port}/events`;expectedSession=status.sourceSessionId;
    }catch{if(valid()){state('offline');schedule();}return;}
   }
   let peer:WebSocket;try{peer=new WebSocket(actualEndpoint);}catch{state('offline');schedule();return;}socket=peer;
   peer.onopen=()=>{if(!valid()||socket!==peer)return;if(role==='legacy'){attempt=0;state('online');}else handshake=setTimeout(()=>peer.close(),5000);};
   peer.onmessage=event=>{
    if(!valid()||socket!==peer||typeof event.data!=='string'||event.data.length>262144)return;
    try{
     const value=parseEnvelope(JSON.parse(event.data));if(!value)return;
     if(role==='legacy'){receive(value);return;}
     if(value.type==='transport:hello'){
      if(value.protocolVersion!==SOURCE_PROTOCOL_VERSION||typeof value.sourceSessionId!=='string'||!value.sourceSessionId||value.sourceSessionId.length>80||(expectedSession!==null&&value.sourceSessionId!==expectedSession)){incompatible=true;clearTimeout(handshake);state('incompatible');peer.close();return;}
      session=value.sourceSessionId;peer.send(JSON.stringify({type:'transport:subscribe',protocolVersion:SOURCE_PROTOCOL_VERSION,role,clientId}));return;
     }
     if(value.sourceSessionId!==session||!session)return;
     if(value.type==='transport:ready'){clearTimeout(handshake);attempt=0;receive({type:'transport:session',sourceSessionId:session});state('online');return;}
     if(lastState==='online')receive(value);
    }catch{/* Invalid data cannot become an event. */}
   };
   peer.onerror=()=>peer.close();peer.onclose=()=>{clearTimeout(handshake);if(!valid()||socket!==peer)return;session=null;if(!incompatible)state('offline');schedule();};
  };
  transmit=async payload=>{
   if(!valid()||socket?.readyState!==WebSocket.OPEN||lastState!=='online')return false;
   try{socket.send(JSON.stringify({...payload,...(role==='legacy'?{}:{sourceSessionId:session})}));return true;}catch{return false;}
  };
  cleanups.push(()=>{clearTimeout(retry);clearTimeout(handshake);socket?.close();});void open();return cleanup;
 }};
 return connection;
}
// Only the historical controller and bridge compatibility tests use this adapter.
let legacyConnection:EventConnection|undefined;
const compatibility=()=>legacyConnection??=createEventConnection(location.pathname.endsWith('clinical.html')?'source':'legacy');
export const connect:EventConnection['connect']=(...args)=>compatibility().connect(...args);
export const sendClinical=(event:ClinicalIslandCommand)=>compatibility().send(event);
export async function sendSimulator(event:ClinicalSimulatorCommand,targetClientId='preview'){
 const payload={...event,targetClientId};
 try{if(nativeWorkbench)await invoke('simulator_command',{payload});else if(!native){const response=await fetch((import.meta.env.VITE_ISLAND_DEMO_URL||'ws://127.0.0.1:17322/events').replace(/^ws:/,'http:').replace(/\/events$/,'')+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return response.ok;}else return false;return true;}catch{return false;}
}
export async function sendExperiment(targetClientId:string,action:ExperimentAction){
 const payload={type:'experiment:dispatch',targetClientId,requestId:crypto.randomUUID(),action};
 try{if(nativeWorkbench)await invoke('simulator_command',{payload});else if(!native){const response=await fetch((import.meta.env.VITE_ISLAND_DEMO_URL||'ws://127.0.0.1:17322/events').replace(/^ws:/,'http:').replace(/\/events$/,'')+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return response.ok;}else return false;return true;}catch{return false;}
}
export const sendLegacy=async(event:LegacyCommand)=>{if(nativeWorkbench&&['demo','configure','reset','view'].includes(event.type)){try{await invoke('legacy_command',{payload:event});return true;}catch{return false;}}return compatibility().send(event);};
export async function openStudio(){if(native)await invoke('launch_workbench');}
