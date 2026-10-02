import { describe, it, expect } from 'vitest';
import { compactCanvas, compactLimits, islandGeometry, transitionCanvas, sameGeometry, silhouette, cubicPeak, CSS_OVERSHOOT, canvasFor } from '../src/lib/geometry';
import type { IslandShape } from '../src/lib/geometry';

describe('compact native canvas invariants', () => {
 for (const shape of ['notch','capsule'] as IslandShape[]) for (const scale of [1,1.25,1.5,2]) {
  it(`${shape} ${scale}: idle, hover, begin and settle use one quantized canvas`, () => {
   for (const available of [84,170,320,1920,3840]) {
    const idle=islandGeometry('compact',available,shape,false), hover=islandGeometry('compact',available,shape,true);
    const canvas=compactCanvas(available,shape,scale);
    for (const [from,to] of [[idle,hover],[hover,idle]]) {
     expect(transitionCanvas(from,to,canvas,true,scale)).toEqual(canvas);
     expect(canvas.width*scale).toBeCloseTo(Math.round(canvas.width*scale),8);
     expect(canvas.height*scale).toBeCloseTo(Math.round(canvas.height*scale),8);
     const offset=(canvas.width*scale-to.width*scale)/2;
     expect(offset).toBeGreaterThanOrEqual(3);
     for(const [x,y] of silhouette(to).points){expect(offset+x*scale+2).toBeLessThanOrEqual(canvas.width*scale);expect(y*scale+2).toBeLessThanOrEqual(canvas.height*scale);}
    }
   }
  });
 }
 it('CSS overshoot bound includes every interrupted reversal, GSAP micro is monotone', () => {
  expect(CSS_OVERSHOOT).toBeGreaterThan(0);expect(CSS_OVERSHOOT).toBeLessThan(.008);
  const bounds=compactLimits(1920,'notch');
  for (const from of [bounds.minWidth,160,165,170,bounds.maxWidth]) for(const target of [160,170]) {
   for(let i=0;i<=2000;i++){
    const t=i/2000,s=1-t,y=3*s*s*t*.9+3*s*t*t*1.008+t*t*t;
    const width=from+(target-from)*y;
    expect(width).toBeLessThanOrEqual(bounds.maxWidth+1e-6);
    expect(width).toBeGreaterThanOrEqual(bounds.minWidth-1e-6);
   }
  }
  expect(cubicPeak(.9,1)).toBe(1);
 });
 it('notification interruption gets room, then returns to the fixed compact canvas', () => {
  const start=islandGeometry('expanded',1920),target=islandGeometry('compact',1920);
  const compact=compactCanvas(1920,'notch',1.25),during=transitionCanvas(start,target,compact,false,1.25);
  expect(during.width).toBeGreaterThan(start.width);expect(during.height).toBeGreaterThanOrEqual(start.height);
  expect(transitionCanvas(target,islandGeometry('compact',1920,'notch',true),compact,true,1.25)).toEqual(compact);
 });
 it('same target including reduced hover does not need another transition', () => {
  const a=islandGeometry('compact',1920,'notch',false);expect(sameGeometry(a,{...a})).toBe(true);
  expect(sameGeometry(a,islandGeometry('compact',1920,'notch',true))).toBe(false);
  expect(sameGeometry(null,a)).toBe(false);expect(canvasFor(a.width,a.height)).not.toEqual(compactCanvas(1920,'notch'));
 });
});
