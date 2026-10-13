import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
export const native = Boolean(window.__TAURI_INTERNALS__);
export const nativeIsland = native && new URLSearchParams(location.search).get('view') === 'island';
import {parseEnvelope} from './protocol';
import type {WireEnvelope,OutgoingCommand,ClinicalIslandCommand,ClinicalSimulatorCommand,LegacyCommand} from './protocol';
export type Wire = WireEnvelope;
export type Connection = 'connecting' | 'online' | 'offline';
const endpoint = import.meta.env.VITE_ISLAND_DEMO_URL || (location.pathname.endsWith('clinical.html') ? 'ws://127.0.0.1:17322/events' : 'ws://127.0.0.1:17321/events');
let connectionGeneration = 0;
let sender: ((event: OutgoingCommand) => Promise<boolean>) | undefined;
let activeDispose:(()=>void)|undefined;
async function send(event: OutgoingCommand): Promise<boolean> { return sender ? sender(event) : false; }
export const sendClinical=(event:ClinicalIslandCommand)=>send(event);
export const sendSimulator=(event:ClinicalSimulatorCommand)=>send(event);
export const sendLegacy=(event:LegacyCommand)=>send(event);
export async function connect(onMessage: (event: Wire) => void, onConnection: (state: Connection) => void, signal?:AbortSignal): Promise<() => void> {
  activeDispose?.();
  let disposed = false; const generation = ++connectionGeneration;
  const cleanups:Array<()=>void>=[];
  const release=(off:()=>void)=>{try{void Promise.resolve(off()).catch(()=>{});}catch{/* Continue releasing the other resources. */}};
  const cleanup=()=>{if(disposed)return;disposed=true;signal?.removeEventListener('abort',cleanup);for(const off of cleanups.splice(0).reverse())release(off);if(generation===connectionGeneration){sender=undefined;activeDispose=undefined;}};
  activeDispose=cleanup;
  signal?.addEventListener('abort',cleanup,{once:true});
  if(signal?.aborted){cleanup();return cleanup;}
  const valid=()=>!disposed&&generation===connectionGeneration;
  const receive=(value:unknown)=>{const envelope=parseEnvelope(value);if(valid()&&envelope)onMessage(envelope);};
  let lastState:Connection|undefined;
  const state=(value:unknown)=>{if(valid()&&(value==='online'||value==='offline'||value==='connecting')&&value!==lastState){lastState=value;onConnection(value);}};
  if (native) {
    // Global listen uses target Any and also receives emit_to replies for other windows.
    try {
      const appWindow = getCurrentWebviewWindow();
      const offWire=await appWindow.listen<unknown>('island://wire',e=>receive(e.payload));
      if(!valid()){release(offWire);return cleanup;}cleanups.push(offWire);
      const offState=await appWindow.listen<unknown>('island://connection',e=>state(e.payload));
      if(!valid()){release(offState);return cleanup;}cleanups.push(offState);
      sender=async payload=>{if(!valid())return false;try{await invoke('send_wire',{payload});return valid();}catch{return false;}};
      await invoke('connect_stream');
      return cleanup;
    } catch(error) {
      if(!valid())return cleanup;
      state('offline');cleanup();throw error;
    }
  }
  let socket: WebSocket | undefined; let retry: ReturnType<typeof setTimeout> | undefined; let attempt = 0;
  const open = () => {
    if (!valid()) return;
    state('connecting');
    const currentSocket = new WebSocket(endpoint);socket=currentSocket;
    currentSocket.onopen = () => {if(socket!==currentSocket||!valid())return;attempt = 0; state('online'); };
    currentSocket.onmessage = e => {
      if(socket!==currentSocket||!valid())return;
      if (typeof e.data !== 'string' || e.data.length > 262144) return;
      try { receive(JSON.parse(e.data)); } catch { /* Malformed frames cannot become notifications. */ }
    };
    currentSocket.onerror = () => currentSocket.close();
    currentSocket.onclose = () => {
      if (!valid()||socket!==currentSocket) return;
      state('offline');
      retry = setTimeout(open, Math.min(15_000, 500 * 2 ** attempt++) + Math.random() * 250);
    };
  };
  if (generation === connectionGeneration) sender = async payload => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    try{socket.send(JSON.stringify(payload));return true;}catch{return false;}
  };
  cleanups.push(()=>{clearTimeout(retry);socket?.close();});
  open();
  return cleanup;
}
export async function openStudio() { if (native) await invoke('open_studio'); }
