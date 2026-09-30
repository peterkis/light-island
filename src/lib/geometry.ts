import type { Mode } from './domain';

export type IslandShape = 'notch' | 'capsule';
export interface Geometry { width: number; height: number; radius: number; ear: number }
export const ISLAND_HEIGHT = 56;
export const ISLAND_WIDTHS: Record<Mode, number> = {
  compact: 160, peek: 560, expanded: 880, inbox: 980, thread: 980, success: 480,
};
export function islandGeometry(mode: Mode, available: number, shape: IslandShape = 'notch', hover = false): Geometry {
  const safe = Number.isFinite(available) ? Math.max(1, available - 24) : 1080;
  const idle = mode === 'compact';
  const width = (idle && shape === 'capsule' ? 192 : ISLAND_WIDTHS[mode]) + (idle && hover ? 10 : 0);
  const height = shape === 'notch' && idle ? (hover ? 37 : 34) : ISLAND_HEIGHT;
  return { width: Math.min(width, safe), height, radius: shape === 'capsule' ? height / 2 : idle ? 18 : 24, ear: shape === 'notch' ? 7 : 0 };
}
export type Point = [number, number];
/** One source for SVG silhouette and native polygon. Points include the inverse top fillets. */
export function silhouette(g: Geometry): { path: string; points: Point[] } {
  const { width: w, height: h } = g;
  const e = Math.min(g.ear, w / 8, h / 4);
  const r = Math.min(g.radius, (w - 2 * e) / 2, h - e);
  let p: Point = [0, 0]; const points: Point[] = []; const commands: string[] = [];
  const num = (x: number) => Number(x.toFixed(4));
  function move(x: number, y: number) { p = [x, y]; points.push(p); commands.push(`M${num(x)},${num(y)}`); }
  function line(x: number, y: number) { p = [x, y]; points.push(p); commands.push(`L${num(x)},${num(y)}`); }
  function curve(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    const [x0, y0] = p;
    commands.push(`C${num(x1)},${num(y1)} ${num(x2)},${num(y2)} ${num(x)},${num(y)}`);
    for (let i = 1; i <= 12; i++) { const t = i / 12, s = 1 - t;
      points.push([s ** 3 * x0 + 3 * s * s * t * x1 + 3 * s * t * t * x2 + t ** 3 * x,
        s ** 3 * y0 + 3 * s * s * t * y1 + 3 * s * t * t * y2 + t ** 3 * y]); }
    p = [x, y];
  }
  if (e === 0) {
    const k = .5522847498;
    move(r, 0); line(w - r, 0); curve(w - r + k * r, 0, w, r - k * r, w, r);
    line(w, h - r); curve(w, h - r + k * r, w - r + k * r, h, w - r, h);
    line(r, h); curve(r - k * r, h, 0, h - r + k * r, 0, h - r);
    line(0, r); curve(0, r - k * r, r - k * r, 0, r, 0);
  } else {
    // Soft inverse ears; two cubic segments per lower corner avoid a quarter-circle look.
    move(0, 0); line(w, 0); curve(w - .55 * e, 0, w - e, .45 * e, w - e, e);
    line(w - e, h - r);
    curve(w - e, h - .55 * r, w - e, h - .35 * r, w - e - .175 * r, h - .175 * r);
    curve(w - e - .35 * r, h, w - e - .55 * r, h, w - e - r, h);
    line(e + r, h);
    curve(e + .55 * r, h, e + .35 * r, h, e + .175 * r, h - .175 * r);
    curve(e, h - .35 * r, e, h - .55 * r, e, h - r);
    line(e, e); curve(e, .45 * e, .55 * e, 0, 0, 0);
  }
  commands.push('Z');
  return { path: commands.join(' '), points };
}
/** Mildly underdamped response, not an 'overdamped bounce'. One small overshoot. */
export function springResponse(t: number): number {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const zeta = .84, omega = 13, q = Math.sqrt(1 - zeta * zeta);
  const response = (x: number) => 1 - Math.exp(-zeta * omega * x) * (Math.cos(omega * q * x) + zeta / q * Math.sin(omega * q * x));
  return response(t) / response(1);
}
