import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';
import { invoke } from '@tauri-apps/api/core';
import { nativeIsland } from '../lib/bridge';
import { islandGeometry, silhouette, springResponse } from '../lib/geometry';
import type { Geometry } from '../lib/geometry';
import type { IslandController } from './useIsland';

gsap.registerPlugin(useGSAP, CustomEase);
gsap.config({ autoSleep: 12 });
const springPath = Array.from({ length: 121 }, (_, i) => `${i ? 'L' : 'M'}${i / 120},${springResponse(i / 120)}`).join(' ');
CustomEase.create('samewave-settle', springPath);
let nextEpoch = Date.now();
function viewKey(c: IslandController) {
  return ['compact', 'inbox'].includes(c.mode) ? c.mode : `${c.mode}:${c.active?.id ?? ''}:${c.active?.revision ?? 0}`;
}
interface Metrics { available: number; scale: number; width: number; height: number }
interface Fade { alpha: number; copy: number; actions: number; x: number }

/** Presentation is separate from business state. Outgoing content remains frozen for its exit. */
export function useMorph(live: IslandController) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const key = viewKey(live);
  const [displayKey, setDisplayKey] = useState(key);
  const displayed = useRef(live);
  if (displayKey === key) displayed.current = live;
  const [available, setAvailable] = useState(nativeIsland ? 0 : window.innerWidth);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [nativeError, setNativeError] = useState('');
  const current = useRef<Geometry | null>(null);
  const fade = useRef<Fade>({ alpha: 1, copy: 1, actions: 1, x: 0 });
  const activeCleanup = useRef<(() => void) | undefined>(undefined);
  const committedKey = useRef(key);
  const latestKey = useRef(key); latestKey.current = key;
  const reduced = live.settings.reduced || systemReduced;
  const hover = live.mode === 'compact' && live.hovered;

  // useGSAP owns component lifetime cleanup. Each transition has a bounded, disposable context.
  useGSAP(() => () => activeCleanup.current?.(), { scope: ref });
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useLayoutEffect(() => {
    let dead = false;
    if (nativeIsland) {
      const measure = () => { void invoke<Metrics>('island_metrics').then(m => { if (!dead) setAvailable(m.available); }).catch(e => { if (!dead) setNativeError(String(e)); }); };
      measure(); window.addEventListener('resize', measure);
      return () => { dead = true; window.removeEventListener('resize', measure); };
    }
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setAvailable(parent.getBoundingClientRect().width);
    const observer = new ResizeObserver(measure); observer.observe(parent); measure();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const host = ref.current, content = contentRef.current;
    if (!host || !content || available <= 0) return;
    activeCleanup.current?.();
    const epoch = ++nextEpoch;
    let disposed = false, timer = 0, observer: ResizeObserver | undefined;
    let context: gsap.Context | undefined;
    const clean = () => {
      if (disposed) return; disposed = true;
      clearTimeout(timer); observer?.disconnect();
      // No GSAP tween owns shell styles. Reverting the proxy cannot snap the visible geometry.
      context?.revert();
      const width = current.current?.width;
      host.style.transition = 'none';
      if (width) host.style.width = `${width}px`;
    };
    activeCleanup.current = clean;
    const target = islandGeometry(live.mode, available, live.settings.shape, hover && !reduced);
    const initial = current.current === null;
    const start = current.current ?? target;
    const changingContent = committedKey.current !== key;
    const closing = live.mode === 'compact' && changingContent;
    const valid = () => !disposed && latestKey.current === key;
    host.dataset.motionEpoch = String(epoch); host.dataset.motionPhase = 'preparing';
    host.dataset.targetMode = live.mode;
    host.dataset.motionEngine = live.settings.engine;
    const draw = (g: Geometry) => {
      if (!valid()) return;
      current.current = { ...g };
      host.style.width = `${g.width}px`; host.style.height = `${g.height}px`;
      const svg = host.querySelector<SVGSVGElement>('.notch-surface')!;
      svg.setAttribute('width', String(g.width)); svg.setAttribute('height', String(g.height));
      const { path } = silhouette(g);
      svg.querySelectorAll('path[data-silhouette]').forEach(p => p.setAttribute('d', path));
      host.style.setProperty('--visible-height', `${g.height}px`);
    };
    const drawFade = (f: Fade) => {
      if (!valid()) return;
      fade.current = { ...f };
      content.style.opacity = String(f.alpha);
      content.style.transform = `translateX(${f.x}px)`;
      content.style.setProperty('--copy-alpha', String(f.copy));
      content.style.setProperty('--actions-alpha', String(f.actions));
    };
    const commit = () => {
      if (!valid()) return;
      committedKey.current = key; setDisplayKey(key);
      host.style.setProperty('--face-width', `${target.width}px`);
      host.style.setProperty('--face-height', `${target.height}px`);
      content.inert = false;
    };
    const settle = async () => {
      if (!valid()) return;
      clearTimeout(timer);
      draw(target); commit(); drawFade({ alpha: 1, copy: 1, actions: 1, x: 0 });
      observer?.disconnect(); host.style.transition = 'none';
      if (nativeIsland) {
        try { await invoke('commit_island_geometry', { epoch, width: target.width, height: target.height, points: silhouette(target).points }); }
        catch (e) { if (valid()) setNativeError(String(e)); }
      }
      if (valid()) { host.dataset.motionPhase = 'settled'; host.style.willChange = 'auto'; content.style.willChange = 'auto'; }
    };
    const begin = async () => {
      // Allocate a thin transition envelope once. Never resize HWND on every animation frame.
      if (nativeIsland) {
        try { await invoke('resize_island_window', { epoch, width: Math.max(start.width, target.width) + 20, height: Math.max(start.height, target.height) + 6 }); }
        catch (e) { if (valid()) setNativeError(String(e)); return; }
      }
      if (!valid()) return;
      if (initial || reduced) { await settle(); return; }
      const geometry = { ...start }; const visual = { ...fade.current };
      host.style.willChange = 'width,height'; content.style.willChange = 'opacity,transform';
      host.dataset.motionPhase = closing ? 'exiting' : 'morphing';
      if (changingContent) content.inert = true;
      const micro = !changingContent && live.mode === 'compact';
      const shellAt = changingContent ? closing ? .07 : .025 : 0;
      const shellDuration = micro ? .24 : closing ? .34 : .54;
      const swapAt = closing ? .23 : .055;
      context = gsap.context(() => {
        const tl = gsap.timeline({ onComplete: () => { void settle(); } });
        if (changingContent) {
          tl.to(visual, { alpha: 0, x: closing ? -3 : -2, duration: .055, ease: 'power2.out', onUpdate: () => drawFade(visual) }, 0);
          tl.call(() => { commit(); Object.assign(visual, { alpha: 0, copy: 0, actions: 0, x: closing ? 0 : 4 }); drawFade(visual); }, [], swapAt);
          tl.to(visual, { alpha: 1, x: 0, duration: .18, ease: 'power2.out', onUpdate: () => drawFade(visual) }, swapAt + .005);
          tl.to(visual, { copy: 1, duration: .18, ease: 'power2.out', onUpdate: () => drawFade(visual) }, swapAt + .025);
          tl.to(visual, { actions: 1, duration: .15, ease: 'power2.out', onUpdate: () => drawFade(visual) }, swapAt + .065);
        } else { commit(); drawFade({ alpha: 1, copy: 1, actions: 1, x: 0 }); }
        if (live.settings.engine === 'css') {
          // CSS controls shell dimensions; GSAP coordinates only content and completion timing.
          tl.call(() => {
            if (!valid()) return;
            host.style.transition = `width ${shellDuration}s cubic-bezier(.2,.9,.2,1.008),height ${shellDuration}s cubic-bezier(.2,.9,.2,1)`;
            observer = new ResizeObserver(() => {
              if (!valid()) return;
              const r = host.getBoundingClientRect();
              const ratio = start.width === target.width ? 1 : Math.min(1, Math.max(0, (r.width - start.width) / (target.width - start.width)));
              const g = { width: r.width, height: r.height, radius: start.radius + (target.radius - start.radius) * ratio, ear: start.ear + (target.ear - start.ear) * ratio };
              current.current = g;
              const svg = host.querySelector<SVGSVGElement>('.notch-surface')!;
              svg.setAttribute('width', String(g.width)); svg.setAttribute('height', String(g.height));
              svg.querySelectorAll('path[data-silhouette]').forEach(p => p.setAttribute('d', silhouette(g).path));
            });
            observer.observe(host); host.style.width = `${target.width}px`; host.style.height = `${target.height}px`;
          }, [], shellAt);
          tl.to({}, { duration: shellDuration }, shellAt);
        } else {
          host.style.transition = 'none';
          tl.to(geometry, { width: target.width, radius: target.radius, ear: target.ear, duration: shellDuration,
            ease: micro || closing ? 'power3.out' : 'samewave-settle', onUpdate: () => draw(geometry) }, shellAt);
          // Vertical motion never bounces; only the lateral stretch has a controlled overshoot.
          tl.to(geometry, { height: target.height, duration: shellDuration * .8, ease: 'power3.out', onUpdate: () => draw(geometry) }, shellAt);
        }
      }, host);
      // A bounded fallback covers a hidden/occluded WebView without an idle frame loop.
      timer = window.setTimeout(() => { if (valid()) { context?.kill(false); void settle(); } }, 1100);
    };
    void begin();
    return clean;
  }, [key, available, live.settings.engine, live.settings.shape, reduced, hover]);
  return { ref, contentRef, presented: displayed.current, nativeError, reduced };
}
