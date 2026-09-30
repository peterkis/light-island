export interface FrameReport { frames: number; averageFps: number; medianMs: number; p95Ms: number; over25ms: number; durationMs: number; hidden: boolean }
export function measureFrames(durationMs = 5000): Promise<FrameReport> {
  return new Promise(resolve => {
    const values: number[] = []; let last = 0; let started = 0; let hidden = document.hidden;
    const tick = (now: number) => {
      hidden ||= document.hidden;
      if (!started) started = now;
      if (last) values.push(now - last);
      last = now;
      if (now - started < durationMs) { requestAnimationFrame(tick); return; }
      const ordered = [...values].sort((a, b) => a - b);
      const ms = now - started;
      resolve({ frames: values.length, averageFps: Number((values.length / ms * 1000).toFixed(1)), medianMs: Number((ordered[Math.floor(ordered.length * .5)] ?? 0).toFixed(2)), p95Ms: Number((ordered[Math.floor(ordered.length * .95)] ?? 0).toFixed(2)), over25ms: values.filter(v => v > 25).length, durationMs: Math.round(ms), hidden });
    };
    requestAnimationFrame(tick);
  });
}
