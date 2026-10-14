import {useEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {nativeIsland,nativeWorkbench} from '../lib/bridge';
import {parsePlatform} from './native-contract';
import type {Platform} from './native-contract';
export function usePlatform(host:RefObject<HTMLDivElement|null>,sourceKey:string,samplingSuspended:boolean){
 const [status,setStatus]=useState<Platform>({notificationState:5,animationsEnabled:true,outsideClickAvailable:false,shortcutRegistered:false});
 const samplingBusy=useRef(false);
 useEffect(()=>{if(!nativeWorkbench)return;let dead=false;void invoke<unknown>('workbench_platform_status').then(value=>{const next=parsePlatform(value);if(next&&!dead)setStatus(next);}).catch(()=>{});return()=>{dead=true;};},[]);
 const [dark,setDark]=useState(false);const live=useRef(samplingSuspended);live.current=samplingSuspended;
 useEffect(()=>{
  if(!nativeIsland)return;let dead=false,off:(()=>void)|undefined;
  const update=(value:unknown)=>{const v=parsePlatform(value);if(!dead&&v)setStatus(old=>JSON.stringify(old)===JSON.stringify(v)?old:v);};
  void listen<unknown>('island://platform',event=>update(event.payload)).then(fn=>{if(dead)fn();else off=fn;}).catch(()=>{});
  return()=>{dead=true;off?.();};
 },[]);
 useEffect(()=>{if(!nativeIsland)return;let dead=false;void invoke<unknown>('clinical_platform_status').then(value=>{const v=parsePlatform(value);if(!dead&&v)setStatus(old=>JSON.stringify(old)===JSON.stringify(v)?old:v);}).catch(()=>{});return()=>{dead=true;};},[sourceKey]);
 useEffect(()=>{
  if(!nativeIsland)return;let dead=false;
  const sample=()=>{if(dead||samplingBusy.current||live.current||host.current?.dataset.motionPhase!=='settled'||[1,2,3,4,6].includes(status.notificationState))return;
   samplingBusy.current=true;const height=Number(host.current?.dataset.currentHeight)||32;
   void invoke<number>('clinical_background_luminance',{bodyHeight:height}).then(v=>{if(!dead&&!live.current&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)setDark(v<.15);}).catch(()=>{}).finally(()=>{samplingBusy.current=false;});
  };
  sample();const timer=window.setInterval(sample,2000);return()=>{dead=true;clearInterval(timer);};
 },[status.notificationState]);
 return {status,dark,suspended:[1,2,3,4,6].includes(status.notificationState)};
}
