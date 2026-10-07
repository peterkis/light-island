import {useLayoutEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import gsap from 'gsap';
import {nativeIsland} from '../lib/bridge';
import {contour,layoutHeight,layoutWidth,radiusAt,motionShape,shapePolygons,satelliteGeometry} from './geometry';
import type {Shape,Surface,Dock} from './geometry';
import {springAt,retarget,stepSpring,finishSpring} from './spring';
import T from './tokens.json';

gsap.config({autoSleep:12});
let epochCounter=Date.now();
interface Options {surface?:Surface;dock?:Dock;peek?:boolean;pressed?:boolean;satellite?:boolean;onSettled?:()=>void}
interface Metrics {available:number;height:number;scale?:number;topReserved?:boolean}
/** One owner of the SVG viewport, shape and finite native handoff.
 * Source data is never snapshotted: revoking authorization removes it immediately. */
export function useClinicalLayout(requestedView:'idle'|'compact'|'expanded',contentKey:string,textScale:number,reduced:boolean,hidden:boolean,options:Options={}){
 const requested:Surface=options.surface??(requestedView==='expanded'?'rich':requestedView);
 const host=useRef<HTMLDivElement>(null),inner=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null);
 const [presented,setPresented]=useState<Surface>(requested),[metrics,setMetrics]=useState<Metrics>({available:1200,height:900});
 const [ready,setReady]=useState(!nativeIsland),[error,setError]=useState('');
 const painted=useRef<Shape|null>(null),committedKey=useRef(''),callback=useRef(options.onSettled);callback.current=options.onSettled;
 const physics=useRef({w:springAt(124),h:springAt(32),top:springAt(0),ear:springAt(10),sat:springAt(0)});
 const dock:Dock=metrics.topReserved?'floating':options.dock??'notch';
 const mainWidth=layoutWidth(requested,metrics.available,textScale);
 const mainHeight=layoutHeight(requested,0,metrics.height,textScale);
 const contentWidth=layoutWidth(presented,metrics.available,textScale),contentHeight=layoutHeight(presented,0,metrics.height,textScale);
 const factor=reduced?1:options.pressed?T.motion.press.factor:options.peek?T.motion.hover.factor:1;
 useLayoutEffect(()=>{
  let dead=false;
  if(nativeIsland){const measure=()=>void invoke<Metrics>('clinical_metrics').then(m=>{if(!dead){setMetrics(m);setReady(true);}}).catch(e=>{if(!dead)setError(String(e));});
   measure();window.addEventListener('resize',measure);return()=>{dead=true;window.removeEventListener('resize',measure);};}
  const parent=host.current?.parentElement;if(!parent)return;
  const measure=()=>setMetrics({available:parent.clientWidth,height:window.innerHeight});
  const ro=new ResizeObserver(measure);ro.observe(parent);measure();return()=>{dead=true;ro.disconnect();};
 },[]);
 useLayoutEffect(()=>{
  const e=host.current,body=inner.current,s=svg.current;if(!e||!body||!s||!ready)return;
  const initial=painted.current===null,newContent=committedKey.current!==contentKey;
  const target:Shape={width:mainWidth*factor,height:mainHeight*factor,radius:radiusAt(mainHeight*factor),ear:dock==='notch'?T.geometry.earRadius:0,top:dock==='floating'?T.geometry.floatTop:0,satellite:options.satellite?1:0};
  const epoch=++epochCounter;let dead=false,raf=0,swapTimer=0,delayTimer=0,finalFrame=0,watchdog=0,finalTimer=0;
  let order=0,busy=false,finishing=false,finalizing=false,queued:Shape|null=null,scheduled=false,revealed=false;
  let inFlight:Promise<void>=Promise.resolve(),fade:gsap.core.Timeline|undefined;
  const p=physics.current;
  if(initial){p.w=springAt(target.width);p.h=springAt(target.height);p.top=springAt(target.top!);p.ear=springAt(target.ear);p.sat=springAt(target.satellite!);}
  retarget(p.w,target.width);retarget(p.h,target.height);retarget(p.top,target.top!);retarget(p.ear,target.ear);retarget(p.sat,target.satellite!);
  const closing=target.height<(painted.current?.height??target.height)||target.width<(painted.current?.width??target.width);
  const micro=!newContent&&(requested==='idle'||requested==='compact');
  const params=micro?(options.pressed?T.motion.spring.press:T.motion.spring.peek):requested==='idle'||requested==='compact'?(closing?T.motion.spring.collapse:T.motion.spring.morph):T.motion.spring.expand;
  const heightParams=micro?params:closing?T.motion.spring.collapse:T.motion.spring.height;
  const valid=()=>!dead;
  const draw=(g:Shape)=>{
   if(!valid())return;
   const shape=motionShape(g),curve=contour(shape);painted.current=shape;
   e.style.width=`${shape.width}px`;e.style.height=`${shape.height}px`;e.style.transform=`translateY(${shape.top}px)`;
   s.style.left=`${-shape.ear}px`;s.setAttribute('width',String(shape.width+2*shape.ear));s.setAttribute('height',String(shape.height));
   s.setAttribute('viewBox',`${-shape.ear} 0 ${shape.width+2*shape.ear} ${shape.height}`);
   s.querySelectorAll('path[data-shell]').forEach(node=>node.setAttribute('d',node.getAttribute('data-shell')==='rim'&&shape.ear>0?curve.path.replace(/^M[^ ]+ L([^ ]+)/,'M$1').replace(/ Z$/,''):curve.path));
   body.parentElement!.style.clipPath=`path("${curve.path}")`;
   const secondary=e.querySelector<HTMLElement>('.ux-minimal'),sg=satelliteGeometry(shape);
   if(secondary){secondary.style.left=`${sg.x}px`;secondary.style.width=`${sg.size}px`;secondary.style.height=`${sg.size}px`;secondary.style.opacity=String(Math.min(1,shape.satellite??0));secondary.style.pointerEvents=sg.size>12?'auto':'none';}
   e.style.setProperty('--ci-radius',`${shape.radius}px`);
   e.style.setProperty('--ux-shadow-alpha',String(reduced?0:Math.max(0,Math.min(1,(shape.height-37.8)/50.2))));
   e.dataset.currentWidth=shape.width.toFixed(4);e.dataset.currentHeight=shape.height.toFixed(4);
   e.dataset.velocityX=p.w.v.toFixed(4);e.dataset.velocityY=p.h.v.toFixed(4);
  };
  const native=(g:Shape,phase:'frame'|'commit'|'cancel',old?:Shape)=>!nativeIsland?Promise.resolve(true):invoke<boolean>('clinical_layout',{
   epoch,sequence:++order,phase,expanded:requestedView==='expanded',top:g.top??0,shadowAlpha:reduced?0:Math.max(0,Math.min(1,(g.height-37.8)/50.2)),bodyWidth:g.width,height:g.height,radius:g.radius,ear:g.ear,visible:!hidden,
   polygons:shapePolygons(g),previous:old?{...motionShape(old),polygons:shapePolygons(old)}:null});
  const enqueue=(g:Shape)=>{
   if(!valid()||finishing)return;
   if(!nativeIsland){draw(g);return;}
   queued=motionShape(g);if(busy||scheduled)return;scheduled=true;
   queueMicrotask(()=>{
    scheduled=false;if(!valid()||finishing||!queued)return;
    const next=queued;queued=null;busy=true;
    inFlight=(async()=>{try{const applied=await native(next,'frame',painted.current??next);if(valid()&&!finishing&&applied)draw(next);}catch(err){if(valid())setError(String(err));}})()
     .finally(()=>{busy=false;if(queued&&valid()&&!finishing)enqueue(queued);});
   });
  };
  const reveal=(immediate=false)=>{
   if(!valid())return;
   revealed=true;committedKey.current=contentKey;setPresented(requested);body.inert=false;
   fade?.kill();
   if(immediate){body.style.opacity='1';body.style.filter='none';body.style.transform='none';return;}
   // Presentation updates before the next paint; final text layout never tracks shell width.
   finalFrame=requestAnimationFrame(()=>{
    if(!valid())return;
    fade=gsap.timeline();
    fade.fromTo(body,{opacity:0,filter:reduced?'none':`blur(${T.motion.content.enterBlur}px)`,y:reduced?0:T.motion.content.translateY,scale:reduced?1:T.motion.content.scale},
     {opacity:1,filter:'blur(0px)',y:0,scale:1,duration:(reduced?T.motion.reduced.duration:T.motion.content.enter)/1000,ease:reduced?'none':'power2.out',clearProps:'filter,transform'});
    if(!reduced){const children=body.querySelectorAll('[data-stagger]');fade.fromTo(children,{opacity:0,y:4},{opacity:1,y:0,stagger:T.motion.content.stagger/1000,duration:.2,ease:'power2.out',clearProps:'opacity,transform'},0);}
   });
  };
  const settle=async()=>{
   if(!valid()||finishing)return;finishing=true;queued=null;cancelAnimationFrame(raf);clearTimeout(watchdog);clearTimeout(swapTimer);
   await inFlight;if(!valid())return;
   try{if(!await native(target,'frame',painted.current??target)||!valid())return;}catch(err){if(valid())setError(String(err));return;}
   draw(target);Object.values(p).forEach(finishSpring);
   if(initial||hidden)reveal(true);else if(newContent&&!revealed)reveal();
   const finalize=async()=>{
    if(!valid()||finalizing)return;finalizing=true;clearTimeout(finalTimer);
    try{if(!await native(target,'commit')||!valid())return;}catch(err){if(valid())setError(String(err));return;}
    committedKey.current=contentKey;e.dataset.motionPhase='settled';e.style.willChange='auto';callback.current?.();
   };
   if(nativeIsland){finalFrame=requestAnimationFrame(()=>{finalFrame=requestAnimationFrame(()=>void finalize());});finalTimer=window.setTimeout(()=>void finalize(),100);}
   else void finalize();
  };
  e.dataset.layoutEpoch=String(epoch);e.dataset.motionPhase='preparing';e.dataset.motionDriver='numerical-spring';
  e.dataset.targetWidth=String(target.width);e.dataset.targetHeight=String(target.height);
  e.dataset.targetSurface=requested;e.dataset.dock=dock;
  const run=async()=>{
   try{if(!await native(painted.current??target,'frame',painted.current??target)||!valid())return;}catch(err){if(valid())setError(String(err));return;}
   if(initial||hidden){await settle();return;}
   if(reduced){reveal();await settle();return;}
   e.dataset.motionPhase=closing?'collapsing':'expanding';e.style.willChange='width,height';
   if(newContent){
    body.inert=true;fade=gsap.timeline().to(body,{opacity:0,filter:`blur(${closing?T.motion.content.exitCollapseBlur:T.motion.content.exitBlur}px)`,scale:closing?1:T.motion.content.scale,duration:T.motion.content.exit/1000,ease:'power2.in'});
    if(!closing)swapTimer=window.setTimeout(()=>reveal(),T.motion.content.delay);
   }else{body.inert=false;body.style.opacity='1';body.style.filter='none';body.style.transform='none';}
   let previousTime=performance.now(),started=previousTime;
   const tick=(now:number)=>{
    if(!valid())return;
    const dt=Math.max(0,(now-previousTime)/1000);previousTime=now;
    if(closing&&now-started<T.motion.collapse.delay){raf=requestAnimationFrame(tick);return;}
    const rest=[stepSpring(p.w,params,dt),stepSpring(p.h,heightParams,dt),stepSpring(p.top,T.motion.spring.morph,dt),stepSpring(p.ear,T.motion.spring.morph,dt),stepSpring(p.sat,T.motion.spring.morph,dt)].every(Boolean);
    enqueue({width:p.w.x,height:p.h.x,radius:radiusAt(p.h.x),ear:Math.max(0,p.ear.x),top:Math.max(0,p.top.x),satellite:Math.max(0,Math.min(1,p.sat.x))});
    if(rest&&(!newContent||now-started>=T.motion.content.delay)){void settle();return;}raf=requestAnimationFrame(tick);
   };
   raf=requestAnimationFrame(tick);
   watchdog=window.setTimeout(()=>{if(valid()){Object.values(p).forEach(finishSpring);void settle();}},T.motion.handoff.watchdogTimeout);
  };
  void run();
  return()=>{dead=true;queued=null;cancelAnimationFrame(raf);cancelAnimationFrame(finalFrame);clearTimeout(swapTimer);clearTimeout(delayTimer);clearTimeout(watchdog);clearTimeout(finalTimer);fade?.kill();
   if(nativeIsland)void native(painted.current??target,'cancel').catch(()=>{});
  };
 },[requested,mainWidth,mainHeight,contentKey,factor,dock,reduced,hidden,ready,metrics.scale,options.satellite]);
 return {host,inner,svg,width:contentWidth,height:contentHeight,view:presented==='idle'||presented==='compact'?presented:'expanded' as const,surface:presented,error,nativeFallback:false};
}
