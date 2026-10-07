import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contour,layoutWidth,layoutHeight,motionShape,radiusAt,shapePolygons} from '../src/clinical/geometry';
import {springAt,retarget,stepSpring} from '../src/clinical/spring';
import T from '../src/clinical/tokens.json';

describe('current UI/UX 1.0 specification, superseding historical 160x34 geometry',()=>{
 it('tokens are tied to the unchanged user-authored source',()=>{
  const text=readFileSync(T.source,'utf8');expect(T.sourceSHA256).toBe(createHash('sha256').update(text).digest('hex'));
  expect(T.schemaVersion).toBe('uiux-1.0');expect(T.css['spring-expand']).toBe('190,22');expect(T.geometry.earRadius).toBe(10);
  for(const [surface,w,h]of [['idle',124,32],['compact',268,36],['alert',372,88],['rich',372,168],['stack',400,280]] as const){expect(layoutWidth(surface,1920)).toBe(w);expect(layoutHeight(surface,0,1080)).toBe(h);}
 });
 for(const dpi of [1,1.25,1.5,2])for(const dock of ['notch','floating'])it(`${dock}: bounded smooth SVG and native polygons at ${dpi} DPI`,()=>{
  for(const surface of ['idle','compact','alert','rich','stack'] as const){const w=layoutWidth(surface,1920),h=layoutHeight(surface,0,1080),ear=dock==='notch'?10:0;
   const g={width:w,height:h,radius:radiusAt(h),ear,top:ear?0:8,satellite:surface==='compact'?1:0};const s=contour(g);
   expect(s.path).toContain('C');expect(s.path).not.toContain('A');
   for(const [x,y]of s.points){expect(x).toBeGreaterThanOrEqual(-ear-.001);expect(x).toBeLessThanOrEqual(w+ear+.001);expect(y).toBeGreaterThanOrEqual(-.001);expect(y).toBeLessThanOrEqual(h+.001);expect(Math.abs(Math.round(x*dpi)-x*dpi)).toBeLessThanOrEqual(.50001);}
   expect(shapePolygons(g).length).toBe(surface==='compact'?2:1);
  }
 });
 it('normal-text stack respects 30% cap while enlarged text keeps reachable controls',()=>{
  expect(layoutHeight('stack',0,800)).toBeLessThanOrEqual(240);
  for(const s of [1,2,2.25])for(const available of [320,390,1920]){expect(layoutWidth('rich',available,s)%4).toBe(0);expect(layoutWidth('rich',available,s)).toBeLessThanOrEqual(available-32);expect(layoutHeight('rich',0,900,s)).toBeLessThanOrEqual(s===1?268:480);}
 });
 it('named template radii interpolate with current height',()=>{expect([32,36,88,168,280].map(radiusAt)).toEqual([16,18,36,40,44]);});
 it('native payload contains only numerical shape fields, never GSAP metadata',()=>{const g={width:124,height:32,radius:16,ear:10,_gsap:{target:null as unknown}};g._gsap.target=g;expect(()=>JSON.stringify(motionShape(g))).not.toThrow();expect(motionShape(g)).not.toHaveProperty('_gsap');});
});
describe('on-demand numerical springs inherit velocity rather than replaying easing',()=>{
 for(const hz of [60,120])for(const name of ['expand','collapse','peek'] as const)it(`${name} at ${hz} Hz respects its overshoot budget and settles`,()=>{
  const s=springAt(name==='collapse'?372:124),initial=s.x,target=name==='collapse'?124:name==='peek'?130.2:372;
  retarget(s,target);let peak=0,rest=false,frames=0;
  for(;frames<hz*3;frames++){rest=stepSpring(s,T.motion.spring[name],1/hz);peak=Math.max(peak,(name==='collapse'?target-s.x:s.x-target)/Math.abs(target-initial));if(rest)break;}
  expect(rest).toBe(true);expect(s.x).toBe(target);expect(s.v).toBe(0);expect(peak).toBeLessThanOrEqual(T.motion.budgets[name]);
 });
 it('reverse target does not reset current position or velocity',()=>{const s=springAt(124);retarget(s,400);for(let i=0;i<12;i++)stepSpring(s,T.motion.spring.expand,1/120);const old={...s};retarget(s,124);expect(s.x).toBe(old.x);expect(s.v).toBe(old.v);stepSpring(s,T.motion.spring.collapse,1/120);expect(Math.abs(s.x-old.x)).toBeLessThan(12);});
 it('a dropped frame is bounded, invalid inputs are rejected',()=>{const a=springAt(124),b=springAt(124);retarget(a,372);retarget(b,372);stepSpring(a,T.motion.spring.expand,10);stepSpring(b,T.motion.spring.expand,1/30);expect(a).toEqual(b);expect(()=>retarget(a,NaN)).toThrow();expect(()=>stepSpring(a,{k:-1,c:22},.01)).toThrow();});
});
