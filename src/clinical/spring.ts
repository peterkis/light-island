import T from './tokens.json';
export interface Spring { x: number; v: number; target: number }
export interface SpringParameters { k: number; c: number }
export const springAt = (x:number):Spring => ({x,v:0,target:x});
/** Retargeting never overwrites position or momentum. */
export function retarget(s:Spring,target:number):void {
 if(!Number.isFinite(target))throw new Error('Spring target must be finite');
 s.target=target;
}
/** Semi-implicit Euler, actual dt capped per UI/UX §9.8, with bounded substeps.
 * Substeps improve consistency at 60/120 Hz without a permanent simulation loop. */
export function stepSpring(s:Spring,p:SpringParameters,elapsed:number):boolean {
 const cfg=T.motion.integrator;
 if(![s.x,s.v,s.target,p.k,p.c,elapsed].every(Number.isFinite)||p.k<=0||p.c<=0||elapsed<0)throw new Error('Invalid spring input');
 const dt=Math.min(elapsed,cfg.maxFrameDelta),count=Math.max(1,Math.ceil(dt/cfg.substep)),h=dt/count;
 for(let i=0;i<count;i++){
  s.v+=(-p.k*(s.x-s.target)-p.c*s.v)*h;
  s.x+=s.v*h;
 }
 const quiet=Math.abs(s.v)<cfg.velocityTolerance&&Math.abs(s.x-s.target)<cfg.positionTolerance;
 if(quiet){s.x=s.target;s.v=0;}
 return quiet;
}
export function finishSpring(s:Spring):void {s.x=s.target;s.v=0;}
export function springSnapshot(s:Spring){return {x:s.x,v:s.v,target:s.target};}
