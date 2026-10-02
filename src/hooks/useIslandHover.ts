import { useEffect, useRef, type RefObject, type MouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { nativeIsland } from '../lib/bridge';
import { hoverTrace } from '../lib/hoverDiagnostics';
import type { IslandController } from './useIsland';

export const LEAVE_DELAY_MS = 80;
export const PEEK_DELAY_MS = 120;
/** Stable silhouette sensing; content exit/inert is not a mouse departure. */
export function useIslandHover(live: IslandController, host: RefObject<HTMLDivElement | null>) {
  const latest = useRef(live); latest.current = live;
  const inside = useRef(false), mounted = useRef(false), generation = useRef(0);
  const leaveTimer = useRef(0), peekTimer = useRef(0), suppressed = useRef(false);
  const point = useRef({ x: -1, y: -1 });
  const cancelPeek = (suppress = false) => { clearTimeout(peekTimer.current); peekTimer.current = 0; if (suppress) suppressed.current = true; };
  const domInside = () => {
    const h = host.current;
    return Boolean(h && h.contains(document.elementFromPoint(point.current.x, point.current.y)));
  };
  const pointerInside = async () => {
    if (!nativeIsland) return domInside();
    try {
      const sample = await invoke<{ inside: boolean; x: number; y: number }>('island_pointer_inside');
      // The AA fringe is not a hover shield. Recheck the painted DOM at the current native point.
      return sample.inside && Boolean(host.current?.contains(document.elementFromPoint(sample.x, sample.y)));
    }
    catch (error) { hoverTrace('pointer-check-error', { error: String(error) }, host.current); return domInside(); }
  };
  const schedulePeek = () => {
    const c = latest.current;
    if (peekTimer.current || suppressed.current || c.mode !== 'compact' || !(c.unread.length || c.todo.length)) return;
    const version = generation.current;
    peekTimer.current = window.setTimeout(() => {
      peekTimer.current = 0;
      const current = latest.current;
      if (!mounted.current || version !== generation.current || !inside.current || suppressed.current || current.mode !== 'compact' || !(current.unread.length || current.todo.length)) return;
      hoverTrace('peek-fire', {}, host.current); current.setMode('peek');
    }, PEEK_DELAY_MS);
  };
  const enter = (event: MouseEvent) => {
    point.current = { x: event.clientX, y: event.clientY };
    hoverTrace('mouseenter', { screen: [event.screenX,event.screenY] }, host.current);
    generation.current++; clearTimeout(leaveTimer.current); leaveTimer.current = 0;
    cancelPeek(); inside.current = true; latest.current.setHovered(true); schedulePeek();
  };
  const leave = (event: MouseEvent) => {
    point.current = { x: event.clientX, y: event.clientY };
    hoverTrace('mouseleave', { screen: [event.screenX,event.screenY] }, host.current);
    inside.current = false; cancelPeek(); clearTimeout(leaveTimer.current);
    const version = ++generation.current;
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = 0;
      void pointerInside().then(stillInside => {
        if (!mounted.current || version !== generation.current) return;
        if (stillInside) { inside.current = true; hoverTrace('leave-rejected', {}, host.current); schedulePeek(); return; }
        suppressed.current = false; latest.current.setHovered(false); hoverTrace('leave-accepted', {}, host.current);
      });
    }, LEAVE_DELAY_MS);
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; clearTimeout(leaveTimer.current); cancelPeek(); };
  }, []);
  useEffect(() => { if (live.mode !== 'compact') cancelPeek(); }, [live.mode]);
  return { enter, leave, cancelPeek };
}
