import { invoke } from '@tauri-apps/api/core';
import { nativeIsland } from './bridge';
type Row = Record<string, unknown>;
let enabled = new URLSearchParams(location.search).has('hoverDiagnostics');
let seq = 0;
const rows: Row[] = [];
export function configureHoverDiagnostics(value: boolean) {
 enabled ||= value;
 if (enabled) (window as unknown as { __HOVER_TRACE__: () => Row[] }).__HOVER_TRACE__ = () => [...rows];
}
configureHoverDiagnostics(enabled);
export function hoverTrace(kind: string, detail: Row = {}, host?: HTMLElement | null) {
 if (!enabled) return;
 if (rows.length >= 8192) rows.shift();
 rows.push({ at: performance.timeOrigin + performance.now(), seq: ++seq, kind, ...detail,
  epoch: host?.dataset.motionEpoch, phase: host?.dataset.motionPhase, mode: host?.dataset.mode,
  hovered: host?.dataset.hovered, bounds: host?.getBoundingClientRect().toJSON() });
}
export async function geometryInvoke<T = void>(command: string, args: Record<string, unknown>): Promise<T> {
 hoverTrace('native-request', { command, args });
 try { const result = await invoke<T>(command, args); hoverTrace('native-complete', { command, epochRequested: args.epoch }); return result; }
 catch (error) { hoverTrace('native-error', { command, error: String(error) }); throw error; }
}
if (nativeIsland) void invoke<{ enabled: boolean }>('hover_diagnostics', { clear: false }).then(r => configureHoverDiagnostics(r.enabled)).catch(() => {});
