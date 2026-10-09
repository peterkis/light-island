import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import {springAt,retarget,stepSpring} from './spring';
import T from './tokens.json';

/** Delegated, finite press feedback. Never scales clinical text or the SVG owner. */
export function useButtonFeedback(host:RefObject<HTMLDivElement|null>,reduced:boolean,contentKey:string){
 const failed=useRef('');
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const moving=new Map<HTMLButtonElement,{spring:ReturnType<typeof springAt>;raf:number;last:number}>();
  let active:HTMLButtonElement|null=null;
  const reset=(button:HTMLButtonElement)=>{const state=moving.get(button);if(state)cancelAnimationFrame(state.raf);moving.delete(button);button.style.removeProperty('--ux-press');};
  const animate=(button:HTMLButtonElement,target:number)=>{
   if(reduced)return;
   let state=moving.get(button);
   if(!state){state={spring:springAt(1),raf:0,last:performance.now()};moving.set(button,state);}
   retarget(state.spring,target);cancelAnimationFrame(state.raf);state.last=performance.now();
   const current=state;
   const tick=(now:number)=>{if(!button.isConnected){reset(button);return;}const rest=stepSpring(current.spring,T.motion.spring.press,Math.max(0,(now-current.last)/1000));current.last=now;
    // A control fill compresses; its label and focus target keep their size.
    button.style.setProperty('--ux-press',String(Math.max(.9,Math.min(1.04,current.spring.x))));
    if(rest){if(target===1)reset(button);return;}current.raf=requestAnimationFrame(tick);
   };current.raf=requestAnimationFrame(tick);
  };
  const down=(event:PointerEvent|KeyboardEvent)=>{
   if(event instanceof PointerEvent&&event.button!==0)return;
   if(event instanceof KeyboardEvent&&(event.repeat||![' ','Enter'].includes(event.key)))return;
   const button=(event.target as Element).closest<HTMLButtonElement>('button');
   if(!button||button.disabled||button.matches('.ci-compact-button,.ux-minimal'))return;
   active=button;animate(button,T.motion.press.buttonFactor);
  };
  const release=()=>{if(active)animate(active,1);active=null;};
  root.addEventListener('pointerdown',down);root.addEventListener('keydown',down);
  document.addEventListener('pointerup',release);document.addEventListener('keyup',release);document.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  return()=>{root.removeEventListener('pointerdown',down);root.removeEventListener('keydown',down);document.removeEventListener('pointerup',release);document.removeEventListener('keyup',release);document.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);for(const b of moving.keys())reset(b);};
 },[host,reduced,contentKey]);
 return (button:HTMLButtonElement|null,revision:string)=>{
  if(!button){failed.current='';return;}if(failed.current===revision)return;failed.current=revision;
  if(reduced)return;
  const animation=button.animate([{translate:'0'},{translate:'-3px'},{translate:'3px'},{translate:'-3px'},{translate:'3px'},{translate:'0'}],{duration:120,iterations:1});
  animation.onfinish=()=>animation.cancel();
  return()=>animation.cancel();
 };
}
