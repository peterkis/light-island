import {useEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {nativeIsland} from '../lib/bridge';
import T from './tokens.json';
import {swipeDecision} from './presentation';
interface InputActions {expanded:boolean;surface:string;hidden:boolean;reduced:boolean;peekable?:boolean;gesturesDisabled?:boolean;hover:(v:boolean)=>void;expand:()=>void;collapse:()=>void;stack:()=>void;dismiss:()=>void;cycle:(direction:number)=>void;keyboardExpand?:()=>void}
export function useSurfaceInput(host:RefObject<HTMLDivElement|null>,actions:InputActions){
 const latest=useRef(actions);latest.current=actions;
 const [peek,setPeek]=useState(false),[pressed,setPressed]=useState(false);
 const [gesture,setGesture]=useState({shift:0,dragging:false,velocity:0,dismissing:false});
 const enterTimer=useRef(0),leaveTimer=useRef(0),longTimer=useRef(0),dismissTimer=useRef(0),alive=useRef(true),revision=useRef(0),longFired=useRef(false),origin=useRef<{x:number;y:number;pointer:number;lastX:number;lastTime:number;velocity:number;surface:string;moved:boolean}|null>(null);
 const cancel=()=>{clearTimeout(enterTimer.current);clearTimeout(leaveTimer.current);clearTimeout(longTimer.current);};
 useEffect(()=>{
  alive.current=true;let dead=false,offOutside:(()=>void)|undefined,offShortcut:(()=>void)|undefined;
  const up=(event:PointerEvent)=>{setPressed(false);clearTimeout(longTimer.current);if(!nativeIsland&&latest.current.expanded&&!host.current?.contains(event.target as Node))latest.current.collapse();};
  const abort=()=>{revision.current++;cancel();clearTimeout(dismissTimer.current);origin.current=null;setPressed(false);setGesture({shift:0,dragging:false,velocity:0,dismissing:false});};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',abort);window.addEventListener('blur',abort);
  if(nativeIsland){
   void listen('island://outside',()=>{if(!dead&&latest.current.expanded)latest.current.collapse();}).then(off=>{if(dead)off();else offOutside=off;});
   void listen('island://shortcut',()=>{if(!dead)(latest.current.keyboardExpand??latest.current.expand)();}).then(off=>{if(dead)off();else offShortcut=off;});
  }
  return()=>{dead=true;alive.current=false;revision.current++;cancel();clearTimeout(dismissTimer.current);offOutside?.();offShortcut?.();document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',abort);window.removeEventListener('blur',abort);};
 },[]);
 useEffect(()=>{if(actions.expanded||actions.hidden||actions.reduced){revision.current++;cancel();setPeek(false);setPressed(false);}if(actions.hidden){clearTimeout(dismissTimer.current);origin.current=null;setGesture({shift:0,dragging:false,velocity:0,dismissing:false});}},[actions.expanded,actions.hidden,actions.reduced]);
 useEffect(()=>{clearTimeout(dismissTimer.current);origin.current=null;setGesture({shift:0,dragging:false,velocity:0,dismissing:false});},[actions.surface]);
 const enter=()=>{revision.current++;clearTimeout(leaveTimer.current);clearTimeout(enterTimer.current);latest.current.hover(true);if((!latest.current.expanded||latest.current.peekable)&&!latest.current.reduced)enterTimer.current=window.setTimeout(()=>{if(alive.current&&(!latest.current.expanded||latest.current.peekable)&&!latest.current.hidden)setPeek(true);},T.motion.hover.delay);};
 const leave=()=>{const rev=++revision.current;clearTimeout(enterTimer.current);clearTimeout(longTimer.current);setPressed(false);clearTimeout(leaveTimer.current);
  leaveTimer.current=window.setTimeout(()=>{void(async()=>{
   let inside=host.current?.matches(':hover')??false;
   if(nativeIsland)try{inside=(await invoke<{inside:boolean}>('island_pointer_inside')).inside;}catch{inside=false;}
   if(!alive.current||revision.current!==rev||inside)return;setPeek(false);latest.current.hover(false);
  })();},T.motion.hover.leaveDelay);
 };
 return {peek,pressed,enter,leave,gesture,
  down:(e:React.PointerEvent)=>{if(latest.current.gesturesDisabled||e.button!==0||gesture.dismissing)return;
   const button=(e.target as Element).closest('button');if(button&&!button.matches('.ci-compact-button,.ux-alert-main,.ux-minimal'))return;
   origin.current={x:e.clientX,y:e.clientY,pointer:e.pointerId,lastX:e.clientX,lastTime:performance.now(),velocity:0,surface:latest.current.surface,moved:false};longFired.current=false;
   if(!latest.current.expanded){setPressed(true);longTimer.current=window.setTimeout(()=>{if(!alive.current||!origin.current)return;longFired.current=true;setPressed(false);latest.current.expand();},350);}},
  move:(e:React.PointerEvent)=>{const start=origin.current;if(!start||start.pointer!==e.pointerId)return;
   const dx=e.clientX-start.x,dy=e.clientY-start.y,now=performance.now();start.velocity=(e.clientX-start.lastX)/Math.max(1,now-start.lastTime);start.lastX=e.clientX;start.lastTime=now;
   if(Math.hypot(dx,dy)>8){start.moved=true;clearTimeout(longTimer.current);setPressed(false);}
   if(start.surface==='alert'&&start.moved&&Math.abs(dx)>Math.abs(dy)){
    if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);
    setGesture({shift:dx,dragging:true,velocity:start.velocity,dismissing:false});
   }},
  up:(e:React.PointerEvent)=>{setPressed(false);clearTimeout(longTimer.current);const start=origin.current;origin.current=null;if(!start||start.pointer!==e.pointerId)return;
   if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
   const dx=e.clientX-start.x,dy=e.clientY-start.y,velocity=performance.now()-start.lastTime>100?0:start.velocity;
   if(start.moved)longFired.current=true;
   if(start.surface==='alert'&&Math.abs(dx)>Math.abs(dy)){
    if(swipeDecision(dx,dy,velocity,host.current?.clientWidth??372)==='dismiss'){
     e.preventDefault();if(latest.current.reduced){latest.current.dismiss();return;}
     setGesture({shift:Math.sign(dx)*128,dragging:false,velocity,dismissing:true});clearTimeout(dismissTimer.current);
     dismissTimer.current=window.setTimeout(()=>{if(alive.current&&latest.current.surface==='alert')latest.current.dismiss();setGesture({shift:0,dragging:false,velocity:0,dismissing:false});},T.motion.content.base);
    }else setGesture({shift:0,dragging:false,velocity,dismissing:false});
   }else if(-dy>8&&latest.current.expanded&&!((e.target as Element).closest('.ci-scroll'))){e.preventDefault();longFired.current=true;latest.current.collapse();}
   else if(Math.abs(dx)>40){longFired.current=true;latest.current.cycle(dx<0?1:-1);}},
  wheel:(e:React.WheelEvent)=>{if(Math.abs(e.deltaX)>=40&&Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();latest.current.cycle(e.deltaX>0?1:-1);}},
  consumeLong:()=>{const value=longFired.current;longFired.current=false;return value;}};
}
