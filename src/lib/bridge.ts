import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
export const native = Boolean(window.__TAURI_INTERNALS__);
export const nativeIsland = native && new URLSearchParams(location.search).get('view') === 'island';
export type Wire = { type: string; [key: string]: unknown };
export type Connection = 'connecting' | 'online' | 'offline';
const endpoint = import.meta.env.VITE_ISLAND_DEMO_URL || (location.pathname.endsWith('clinical.html') ? 'ws://127.0.0.1:17322/events' : 'ws://127.0.0.1:17321/events');
let connectionGeneration = 0;
let sender: ((event: Wire) => Promise<boolean>) | undefined;
export async function send(event: Wire): Promise<boolean> { return sender ? sender(event) : false; }
export async function connect(onMessage: (event: Wire) => void, onConnection: (state: Connection) => void): Promise<() => void> {
  let disposed = false; const generation = ++connectionGeneration;
  if (native) {
    const offWire = await listen<Wire>('island://wire', e => { if (!disposed) onMessage(e.payload); });
    const offState = await listen<Connection>('island://connection', e => { if (!disposed) onConnection(e.payload); });
    if (generation === connectionGeneration) sender = async payload => { try { await invoke('send_wire', { payload }); return true; } catch { return false; } };
    try { await invoke('connect_stream'); } catch { onConnection('offline'); }
    return () => { disposed = true; offWire(); offState(); if (generation === connectionGeneration) sender = undefined; };
  }
  let socket: WebSocket | undefined; let retry: ReturnType<typeof setTimeout> | undefined; let attempt = 0;
  const open = () => {
    if (disposed) return;
    onConnection('connecting');
    socket = new WebSocket(endpoint);
    socket.onopen = () => { attempt = 0; onConnection('online'); };
    socket.onmessage = e => {
      if (typeof e.data !== 'string' || e.data.length > 262144) return;
      try { onMessage(JSON.parse(e.data) as Wire); } catch { /* Malformed frames cannot become notifications. */ }
    };
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      if (disposed) return;
      onConnection('offline');
      retry = setTimeout(open, Math.min(15_000, 500 * 2 ** attempt++) + Math.random() * 250);
    };
  };
  if (generation === connectionGeneration) sender = async payload => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload)); return true;
  };
  open();
  return () => { disposed = true; clearTimeout(retry); socket?.close(); if (generation === connectionGeneration) sender = undefined; };
}
export async function openStudio() { if (native) await invoke('open_studio'); }
