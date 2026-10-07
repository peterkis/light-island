import {useEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {nativeIsland} from '../lib/bridge';
interface Platform {notificationState:number;animationsEnabled:boolean;outsideClickAvailable:boolean;shortcutRegistered:boolean}
export function usePlatform(host:RefObject<HTMLDivElement|null>,sourceKey:string,hidden:boolean){
 const [status,setStatus]=useState<Platform>({notificationState:5,animationsEnabled:true,outsideClickAvailable:false,shortcutRegistered:false});
 const [dark,setDark]=useState(false);const live=useRef(hidden);live.current=hidden;
 useEffect(()=>{
  if(!nativeIsland)return;let dead=false,off:(()=>void)|undefined;
  const update=(v:Platform)=>{if(!dead)setStatus(old=>JSON.stringify(old)===JSON.stringify(v)?old:v);};
  void invoke<Platform>('clinical_platform_status').then(update).catch(()=>{});
  void listen<Platform>('island://platform',event=>update(event.payload)).then(fn=>{if(dead)fn();else off=fn;});
  return()=>{dead=true;off?.();};
 },[]);
 useEffect(()=>{if(!nativeIsland)return;let dead=false;void invoke<Platform>('clinical_platform_status').then(v=>{if(!dead)setStatus(old=>JSON.stringify(old)===JSON.stringify(v)?old:v);}).catch(()=>{});return()=>{dead=true;};},[sourceKey]);
 useEffect(()=>{
  if(!nativeIsland)return;let dead=false,busy=false;
  const sample=()=>{if(dead||busy||live.current||host.current?.dataset.motionPhase!=='settled'||[1,2,3,4,6].includes(status.notificationState))return;
   busy=true;const height=Number(host.current?.dataset.currentHeight)||32;
   void invoke<number>('clinical_background_luminance',{bodyHeight:height}).then(v=>{if(!dead)setDark(v<.15);}).catch(()=>{}).finally(()=>{busy=false;});
  };
  sample();const timer=window.setInterval(sample,2000);return()=>{dead=true;clearInterval(timer);};
 },[status.notificationState]);
 return {status,dark,suspended:[1,2,3,4,6].includes(status.notificationState)};
}
