import {useCallback,useEffect,useRef,useState} from 'react';
import {listen} from '@tauri-apps/api/event';
import {invoke} from '@tauri-apps/api/core';
import {native} from '../lib/bridge';

export type MotionPreference='system'|'full'|'reduced';
export const MOTION_PREFERENCE_KEY=typeof location!=='undefined'&&location.pathname.endsWith('workbench.html')?'samewave.workbench.motion-preference.v1':'samewave.motion-preference.v1';
const EVENT='island://motion-preference';
export function parseMotionPreference(value:unknown):MotionPreference|null {
 return value==='system'||value==='full'||value==='reduced'?value:null;
}
export function resolveMotion(preference:MotionPreference,applicationReduced:boolean,mediaReduced:boolean,windowsAnimationsEnabled:boolean){
 if(applicationReduced||preference==='reduced')return {reduced:true,reason:'应用已选择减弱动效'};
 if(preference==='full')return {reduced:false,reason:'完整动效 · 仅本应用覆盖系统减弱偏好'};
 if(!windowsAnimationsEnabled)return {reduced:true,reason:'跟随 Windows：系统动画效果已关闭'};
 if(mediaReduced)return {reduced:true,reason:'跟随系统：浏览器检测到减弱动态偏好'};
 return {reduced:false,reason:'跟随系统：完整动效已生效'};
}
function readPreference():MotionPreference {
 try{return parseMotionPreference(localStorage.getItem(MOTION_PREFERENCE_KEY))??'system';}catch{return 'system';}
}
function persist(value:MotionPreference){try{localStorage.setItem(MOTION_PREFERENCE_KEY,value);}catch{/* Session choice still applies when storage is unavailable. */}}
/** Explicit, display-only preference. No OS setting, clinical state or source permission is written. */
export function useMotionPreference(){
 // A native profile cannot recover the file choice before its first paint.
 // Stay reduced until the native read confirms the policy, or the user chooses it.
 const [preference,setPreference]=useState<MotionPreference>(()=>native?'reduced':readPreference());
 const [saveError,setSaveError]=useState('');const revision=useRef(0);
 const [mediaReduced,setMediaReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  let disposed=false,unlisten:(()=>void)|undefined;
  const apply=(value:unknown)=>{const next=parseMotionPreference(value);if(!disposed&&next){revision.current++;persist(next);setPreference(next);}};
  const local=(event:Event)=>apply((event as CustomEvent<unknown>).detail);
  const storage=(event:StorageEvent)=>{if(event.key===MOTION_PREFERENCE_KEY)apply(event.newValue??'system');};
  const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setMediaReduced(media.matches);
  window.addEventListener(EVENT,local);window.addEventListener('storage',storage);media.addEventListener('change',change);
  if(native)void listen<unknown>(EVENT,event=>apply(event.payload)).then(off=>{
   if(disposed){off();return;}unlisten=off;const current=revision.current;
   void invoke<unknown>('get_motion_preference').then(value=>{if(!disposed&&revision.current===current)apply(value);}).catch(()=>{});
  }).catch(()=>{});
  return()=>{disposed=true;unlisten?.();window.removeEventListener(EVENT,local);window.removeEventListener('storage',storage);media.removeEventListener('change',change);};
 },[]);
 const choose=useCallback((value:MotionPreference)=>{
  revision.current++;setSaveError('');persist(value);setPreference(value);window.dispatchEvent(new CustomEvent(EVENT,{detail:value}));
  if(native)void invoke('set_motion_preference',{preference:value}).catch(()=>setSaveError('当前窗口已切换，但偏好未保存；请重试'));
 },[]);
 return {preference,mediaReduced,choose,saveError};
}
