import { describe, it, expect } from 'vitest';
import { islandGeometry, ISLAND_WIDTHS, silhouette, springResponse } from '../src/lib/geometry';
import { defaultSettings, sanitizeSettings } from '../src/lib/domain';
import type { Mode } from '../src/lib/domain';

describe('top-docked notch geometry', () => {
  for (const mode of Object.keys(ISLAND_WIDTHS) as Mode[]) {
    it(`${mode} preserves the shallow notification policy`, () => {
      const g = islandGeometry(mode, 1100);
      expect(g.height).toBe(mode === 'compact' ? 34 : 56);
      expect(g.width).toBe(ISLAND_WIDTHS[mode]); expect(g.ear).toBe(7);
    });
    it(`${mode} keeps legacy capsule height and fits a narrow parent`, () => {
      const g = islandGeometry(mode, 332, 'capsule');
      expect(g.width).toBeLessThanOrEqual(308); expect(g.height).toBe(56); expect(g.ear).toBe(0);
    });
  }
  it('uses a finite hover micro-expansion', () => {
    const g = islandGeometry('compact', 1100, 'notch', true);
    expect(g.width).toBe(170); expect(g.height).toBe(37);
  });
  it('migrates previous engines and top gaps without losing preferences', () => {
    const p = sanitizeSettings({ engine: 'mini', top: 12 }, defaultSettings);
    expect(p.engine).toBe('gsap'); expect(p.top).toBe(0); expect(p.shape).toBe('notch');
  });
  it('ignores unsupported geometry preferences', () => {
    expect(sanitizeSettings({ shape: '<script>' }, defaultSettings).shape).toBe('notch');
  });
  it('generates bounded finite native vertices from the exact visual path', () => {
    for (const shape of ['notch', 'capsule'] as const) for (const mode of Object.keys(ISLAND_WIDTHS) as Mode[]) {
      const g = islandGeometry(mode, 1100, shape); const s = silhouette(g);
      expect(s.points.length).toBeLessThanOrEqual(128); expect(s.path.endsWith('Z')).toBe(true);
      for (const [x,y] of s.points) { expect(x).toBeGreaterThanOrEqual(-.001); expect(x).toBeLessThanOrEqual(g.width+.001); expect(y).toBeGreaterThanOrEqual(-.001); expect(y).toBeLessThanOrEqual(g.height+.001); }
    }
  });
  it('uses a straight top edge and two inverse ears for the U-notch', () => {
    const s = silhouette(islandGeometry('compact', 1100));
    expect(s.path.startsWith('M0,0 L160,0')).toBe(true);
    expect(s.points.some(([x,y])=>x===7 && y===7)).toBe(true);
  });
  it('has one controlled lateral overshoot instead of a large elastic oscillation', () => {
    const samples = Array.from({length:1001},(_,i)=>springResponse(i/1000));
    expect(samples[0]).toBe(0); expect(samples[1000]).toBe(1);
    expect(Math.max(...samples)).toBeGreaterThan(1); expect(Math.max(...samples)).toBeLessThan(1.009);
    expect(Math.min(...samples)).toBe(0);
  });
  it('never produces negative or non-finite dimensions', () => {
    for (const width of [0,-20,Number.NaN]) expect(islandGeometry('expanded',width).width).toBeGreaterThan(0);
  });
});
