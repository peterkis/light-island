import {useEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {nativeIsland} from '../lib/bridge';
import T from './tokens.json';
interface InputActions {expanded:boolean;hidden:boolean;reduced:boolean;hover:(v:boolean)=>void;expand:()=>void;collapse:()=>void;stack:()=>void;keyboardExpand?:()=>void}
export function useSurfaceInput(host:RefObject<HTMLDivElement|null>,actions:InputActions){
 const latest=useRef(actions);latest.current=actions;
 const [peek,setPeek]=useState(false),[pressed,setPressed]=useState(false);
 const enterTimer=useRef(0),leaveTimer=useRef(0),longTimer=useRef(0),alive=useRef(true),revision=useRef(0),longFired=useRef(false),origin=useRef<{x:number;y:number;pointer:number}|null>(null);
 const cancel=()=>{clearTimeout(enterTimer.current);clearTimeout(leaveTimer.current);clearTimeout(longTimer.current);};
 useEffect(()=>{
  alive.current=true;let dead=false,offOutside:(()=>void)|undefined,offShortcut:(()=>void)|undefined;
  const up=(event:PointerEvent)=>{setPressed(false);clearTimeout(longTimer.current);if(!nativeIsland&&latest.current.expanded&&!host.current?.contains(event.target as Node))latest.current.collapse();};
  const abort=()=>{revision.current++;cancel();origin.current=null;setPressed(false);};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',abort);window.addEventListener('blur',abort);
  if(nativeIsland){
   void listen('island://outside',()=>{if(!dead&&latest.current.expanded)latest.current.collapse();}).then(off=>{if(dead)off();else offOutside=off;});
   void listen('island://shortcut',()=>{if(!dead)(latest.current.keyboardExpand??latest.current.expand)();}).then(off=>{if(dead)off();else offShortcut=off;});
  }
  return()=>{dead=true;alive.current=false;revision.current++;cancel();offOutside?.();offShortcut?.();document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',abort);window.removeEventListener('blur',abort);};
 },[]);
 useEffect(()=>{if(actions.expanded||actions.hidden||actions.reduced){revision.current++;cancel();setPeek(false);setPressed(false);}},[actions.expanded,actions.hidden,actions.reduced]);
 const enter=()=>{revision.current++;clearTimeout(leaveTimer.current);clearTimeout(enterTimer.current);latest.current.hover(true);if(!latest.current.expanded&&!latest.current.reduced)enterTimer.current=window.setTimeout(()=>{if(alive.current&&!latest.current.expanded&&!latest.current.hidden)setPeek(true);},T.motion.hover.delay);};
 const leave=()=>{const rev=++revision.current;clearTimeout(enterTimer.current);clearTimeout(longTimer.current);setPressed(false);clearTimeout(leaveTimer.current);
  leaveTimer.current=window.setTimeout(()=>{void(async()=>{
   let inside=host.current?.matches(':hover')??false;
   if(nativeIsland)try{inside=(await invoke<{inside:boolean}>('island_pointer_inside')).inside;}catch{inside=false;}
   if(!alive.current||revision.current!==rev||inside)return;setPeek(false);latest.current.hover(false);
  })();},T.motion.hover.leaveDelay);
 };
 return {peek,pressed,enter,leave,
  down:(e:React.PointerEvent)=>{if(e.button!==0)return;origin.current={x:e.clientX,y:e.clientY,pointer:e.pointerId};longFired.current=false;if(!latest.current.expanded){setPressed(true);longTimer.current=window.setTimeout(()=>{if(!alive.current||!origin.current)return;longFired.current=true;setPressed(false);latest.current.expand();},350);}},
  up:(e:React.PointerEvent)=>{setPressed(false);clearTimeout(longTimer.current);const start=origin.current;origin.current=null;if(!start||start.pointer!==e.pointerId)return;if(start.y-e.clientY>8&&latest.current.expanded){e.preventDefault();longFired.current=true;latest.current.collapse();}else if(Math.abs(start.x-e.clientX)>40){longFired.current=true;latest.current.stack();}},
  consumeLong:()=>{const value=longFired.current;longFired.current=false;return value;}};
}
