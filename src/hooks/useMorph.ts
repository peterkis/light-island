import { geometryInvoke, hoverTrace } from '../lib/hoverDiagnostics';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';
import { invoke } from '@tauri-apps/api/core';
import { nativeIsland } from '../lib/bridge';
import { islandGeometry, silhouette, springResponse, compactLimits, renderCanvas, renderLimits, sameGeometry, CSS_WIDTH_EASE } from '../lib/geometry';
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
  const [nativeScale, setNativeScale] = useState(window.devicePixelRatio || 1);
  const lastCanvas = useRef<{ width: number; height: number; scale: number } | null>(null);
  const [nativeError, setNativeError] = useState('');
  const current = useRef<Geometry | null>(null);
  const fade = useRef<Fade>({ alpha: 1, copy: 1, actions: 1, x: 0 });
  const activeCleanup = useRef<(() => void) | undefined>(undefined);
  const committedKey = useRef(key);
  const latestKey = useRef(key);
  const microReady = useRef(true);
  const [, refreshRest] = useState(0);
  if (latestKey.current !== key) microReady.current = false;
  latestKey.current = key;
  const reduced = live.settings.reduced || systemReduced;
  const hover = live.mode === 'compact' && live.hovered && !reduced && microReady.current;

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
      const measure = () => { void invoke<Metrics>('island_metrics').then(m => { if (!dead) { setAvailable(m.available); setNativeScale(m.scale); } }).catch(e => { if (!dead) setNativeError(String(e)); }); };
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
    const target = islandGeometry(live.mode, available, live.settings.shape, hover);
    const restCanvas = renderCanvas(available, nativeScale);
    if (host.dataset.motionPhase === 'settled' && committedKey.current === key && sameGeometry(current.current, target)
      && lastCanvas.current?.width === restCanvas.width && lastCanvas.current?.height === restCanvas.height && lastCanvas.current?.scale === nativeScale) {
      host.dataset.motionEngine = live.settings.engine;
      return; // Identical reduced-motion/shape targets do not create an empty native transition.
    }
    activeCleanup.current?.();
    const epoch = ++nextEpoch;
    let disposed = false, settling = false, timer = 0, observer: ResizeObserver | undefined;
    let regionScheduled = false, regionBusy = false, regionClosed = false, regionSequence = 0, nativeReady = false;
    let queuedRegion: Geometry | null = null;
    let meter: HTMLDivElement | undefined, finishFrame = 0, finishTimer = 0, finalizing = false;
    let context: gsap.Context | undefined;
    const clean = () => {
      if (disposed) return; disposed = true;
      clearTimeout(timer); clearTimeout(finishTimer); cancelAnimationFrame(finishFrame);
      observer?.disconnect(); meter?.remove(); queuedRegion = null;
      if (nativeIsland) void geometryInvoke('cancel_island_transition', { epoch }).catch(() => {});
      // No GSAP tween owns shell styles. Reverting the proxy cannot snap the visible geometry.
      context?.revert();
      const geometry = current.current;
      host.style.transition = 'none';
      if (geometry) { host.style.width = `${geometry.width}px`; host.style.height = `${geometry.height}px`; }
    };
    activeCleanup.current = clean;
    const initial = current.current === null;
    const start = current.current ?? target;
    const limits = compactLimits(available, live.settings.shape);
    const renderBound = renderLimits(available);
    const fixedCompact = live.mode === 'compact' && start.width <= limits.maxWidth + .0001 && start.height <= limits.maxHeight + .0001;
    const canvas = restCanvas; // Stable for clicks, collapse and hover; resize only on monitor/DPI changes.
    const queueOutline = (g: Geometry) => {
      if (!nativeIsland || !nativeReady || regionClosed || disposed) return;
      queuedRegion = { width: g.width, height: g.height, radius: g.radius, ear: g.ear };
      if (regionBusy || regionScheduled) return;
      regionScheduled = true;
      // Coalesce width/height writes in this frame, not an extra requestAnimationFrame later.
      queueMicrotask(() => {
        regionScheduled = false;
        if (!valid() || regionClosed || !queuedRegion) return;
        const geometry = queuedRegion; queuedRegion = null; regionBusy = true;
        void geometryInvoke('update_island_region', { epoch, sequence: ++regionSequence, width: geometry.width, height: geometry.height, points: silhouette(geometry).points, previous: { width: (current.current ?? start).width, height: (current.current ?? start).height, points: silhouette(current.current ?? start).points } })
          .then(() => { if (valid() && !regionClosed) paint(geometry); })
          .catch(e => { if (valid()) setNativeError(String(e)); })
          .finally(() => { regionBusy = false; if (queuedRegion && valid() && !regionClosed) queueOutline(queuedRegion); });
      });
    };
    const changingContent = committedKey.current !== key;
    const closing = live.mode === 'compact' && changingContent;
    const valid = () => !disposed && latestKey.current === key;
    host.dataset.motionEpoch = String(epoch); host.dataset.motionPhase = 'preparing';
    host.dataset.targetMode = live.mode;
    hoverTrace('motion-start', { hover, key, fixedCompact, canvas, restCanvas }, host);
    host.dataset.motionEngine = live.settings.engine;
    const paint = (g: Geometry) => {
      if (!valid()) return;
      g = { ...g, width: Math.min(renderBound.maxWidth, Math.max(renderBound.minWidth, g.width)) };
      if (fixedCompact) g = { ...g, width: Math.min(limits.maxWidth, Math.max(limits.minWidth, g.width)), height: Math.min(limits.maxHeight, Math.max(limits.minHeight, g.height)) };
      current.current = { width: g.width, height: g.height, radius: g.radius, ear: g.ear };
      host.style.width = `${g.width}px`; host.style.height = `${g.height}px`;
      const svg = host.querySelector<SVGSVGElement>('.notch-surface')!;
      svg.setAttribute('width', String(g.width)); svg.setAttribute('height', String(g.height));
      const { path } = silhouette(g);
      svg.querySelectorAll('path[data-silhouette]').forEach(p => p.setAttribute('d', path));
      content.parentElement!.style.clipPath = `path("${path}")`;
      host.style.setProperty('--visible-height', `${g.height}px`);
    };
    const draw = (g: Geometry) => {
      if (!valid()) return;
      if (nativeIsland && nativeReady && !regionClosed) queueOutline(g);
      else paint(g);
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
      if (!valid() || settling) return;
      settling = true;
      clearTimeout(timer); regionClosed = true; regionScheduled = false; queuedRegion = null;
      observer?.disconnect(); meter?.remove();
      // Retain both sides of the last paint handoff; do not clip the previously presented frame.
      if (nativeIsland) {
        const previous = current.current ?? start;
        try { await geometryInvoke('update_island_region', { epoch, sequence: ++regionSequence,
          ...target, points: silhouette(target).points, previous: { width: previous.width, height: previous.height, points: silhouette(previous).points } }); }
        catch (e) { if (valid()) setNativeError(String(e)); }
      }
      if (!valid()) return;
      host.style.transition = 'none'; host.style.maxWidth = 'none'; host.style.minWidth = '0px';
      paint(target); commit(); drawFade({ alpha: 1, copy: 1, actions: 1, x: 0 });
      const finalize = async () => {
        if (!valid() || finalizing) return;
        finalizing = true; cancelAnimationFrame(finishFrame); clearTimeout(finishTimer);
        if (nativeIsland) {
          try { await geometryInvoke('commit_island_geometry', { epoch, width: target.width, height: target.height,
            points: silhouette(target).points, canvasWidth: restCanvas.width, canvasHeight: restCanvas.height }); }
          catch (e) { if (valid()) setNativeError(String(e)); }
        }
        if (!valid()) return;
        lastCanvas.current = { ...restCanvas, scale: nativeScale };
        host.dataset.motionPhase = 'settled'; host.style.willChange = 'auto'; content.style.willChange = 'auto';
        if (!microReady.current) { microReady.current = true; refreshRest(v => v + 1); }
      };
      if (nativeIsland) {
        finishFrame = requestAnimationFrame(() => { finishFrame = requestAnimationFrame(() => { void finalize(); }); });
        finishTimer = window.setTimeout(() => { void finalize(); }, 100); // Finite occluded-view fallback.
      } else { void finalize(); }
    };
    const begin = async () => {
      // Keep the same bounded coordinate space. No visible HWND resize at click or collapse boundaries.
      if (nativeIsland) {
        try { await geometryInvoke('resize_island_window', { epoch, width: canvas.width, height: canvas.height, outline: { width: start.width, height: start.height, points: silhouette(start).points } }); }
        catch (e) { if (valid()) setNativeError(String(e)); return; }
      }
      if (!valid()) return;
      nativeReady = true;
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
            // CSS interpolates a hidden measuring element. The painted surface uses the same
            // acknowledged native handoff as GSAP, rather than running one frame ahead of HRGN.
            meter = document.createElement('div'); meter.setAttribute('aria-hidden', 'true');
            meter.className = 'notch-motion-meter';
            Object.assign(meter.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
              left: '0px', top: '0px', width: `${start.width}px`, height: `${start.height}px`, contain: 'strict' });
            meter.style.maxWidth = `${fixedCompact ? limits.maxWidth : renderBound.maxWidth}px`;
            meter.style.minWidth = `${fixedCompact ? limits.minWidth : renderBound.minWidth}px`;
            host.appendChild(meter); meter.getBoundingClientRect();
            observer = new ResizeObserver(() => {
              if (!valid() || !meter) return;
              const r = meter.getBoundingClientRect();
              const ratio = start.width === target.width ? 1 : Math.min(1, Math.max(0, (r.width - start.width) / (target.width - start.width)));
              draw({ width: r.width, height: r.height, radius: start.radius + (target.radius - start.radius) * ratio,
                ear: start.ear + (target.ear - start.ear) * ratio });
            });
            observer.observe(meter);
            meter.style.transition = `width ${shellDuration}s ${CSS_WIDTH_EASE},height ${shellDuration}s cubic-bezier(.2,.9,.2,1)`;
            meter.style.width = `${target.width}px`; meter.style.height = `${target.height}px`;
          }, [], shellAt);
          tl.to({}, { duration: shellDuration }, shellAt);
        } else {
          host.style.transition = 'none'; host.style.maxWidth = 'none'; host.style.minWidth = '0px';
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
  }, [key, available, nativeScale, live.settings.engine, live.settings.shape, reduced, hover]);
  return { ref, contentRef, presented: displayed.current, nativeError, reduced };
}
