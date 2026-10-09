import {useCallback,useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {nativeIsland,send} from '../../lib/bridge';
import {identityKey} from '../model';
import type {Activity} from '../model';
import type {Wire} from '../../lib/bridge';
import {LAB,ReadBudget,parseLabReport,disposeLabReport} from './model';
import type {LabReport,LabState} from './model';
interface Snapshot {stage:LabState;privacy:boolean;remaining:number;loading:boolean;error:string;session:number}
let serial=Date.now();
const initial=():Snapshot=>({stage:'idle',privacy:false,remaining:LAB.readMs,loading:false,error:'',session:0});
export function useLabReader(onExit:()=>void){
 const [snapshot,setSnapshot]=useState(initial),state=useRef(snapshot),report=useRef<LabReport|null>(null),activity=useRef<Activity|null>(null),budget=useRef<ReadBudget|null>(null);
 const timers=useRef({alert:0,privacy:0,transition:0,request:0,clock:0}),request=useRef<string|null>(null),mouse=useRef(false),alive=useRef(true),exit=useRef(onExit);exit.current=onExit;
 const reduction=useRef(false),setReduced=useCallback((value:boolean)=>{reduction.current=value;},[]);
 const update=useCallback((patch:Partial<Snapshot>)=>{state.current={...state.current,...patch};if(alive.current)setSnapshot(state.current);},[]);
 const clear=useCallback(()=>{Object.values(timers.current).forEach(clearTimeout);clearInterval(timers.current.clock);timers.current={alert:0,privacy:0,transition:0,request:0,clock:0};request.current=null;budget.current=null;mouse.current=false;},[]);
 const nativeClock=useCallback(()=>{
  const b=budget.current;if(nativeIsland)void invoke('clinical_reader_clock',{session:state.current.session,remainingMs:b?.remaining(Date.now())??0,paused:b?.paused??true}).catch(()=>{});
 },[]);
 const release=useCallback(()=>{
  const session=state.current.session;
  if(nativeIsland){void invoke('clinical_reader_clock',{session,remainingMs:0,paused:true}).catch(()=>{});requestAnimationFrame(()=>requestAnimationFrame(()=>void invoke('clinical_capture',{active:false,epoch:session}).catch(()=>{})));}
 },[]);
 const close=useCallback(()=>{if(state.current.stage==='idle'&&!activity.current&&!report.current)return;clear();disposeLabReport(report.current);report.current=null;activity.current=null;update({...initial(),session:state.current.session});release();exit.current();},[clear,release,update]);
 const protectedSession=useCallback(()=>['read','burn','done'].includes(state.current.stage),[]);
 const currentActivity=useCallback(()=>activity.current,[]);
 const burn=useCallback((reduced=reduction.current,purgeNow=false)=>{
  if(state.current.stage!=='read')return;
  clear();if(purgeNow){disposeLabReport(report.current);report.current=null;}
  update({stage:'burn',privacy:state.current.privacy||purgeNow,remaining:0});nativeClock();
  const session=state.current.session;
  timers.current.transition=window.setTimeout(()=>{
   if(state.current.session!==session||state.current.stage!=='burn')return;
   disposeLabReport(report.current);report.current=null;update({stage:'done',privacy:false});release();
   timers.current.transition=window.setTimeout(()=>{if(state.current.session===session)close();},LAB.doneMs);
  },reduced?50:LAB.burnMs);
 },[clear,close,nativeClock,release,update]);
 const mask=useCallback(()=>{
  if(state.current.stage!=='read')return;
  clearTimeout(timers.current.privacy);budget.current?.pause(false,Date.now());update({privacy:true,remaining:budget.current?.remaining(Date.now())??0});nativeClock();
 },[nativeClock,update]);
 const armPrivacy=useCallback(()=>{clearTimeout(timers.current.privacy);if(state.current.stage==='read'&&!state.current.privacy)timers.current.privacy=window.setTimeout(mask,LAB.privacyMs);},[mask]);
 const hover=useCallback((inside:boolean,pointerType='mouse')=>{
  if(pointerType!=='mouse')return;mouse.current=inside;
  if(state.current.stage==='read'&&!state.current.privacy){budget.current?.pause(inside&&!document.hidden,Date.now());update({remaining:budget.current?.remaining(Date.now())??0});nativeClock();}
  if(state.current.stage==='alert'){clearTimeout(timers.current.alert);if(!inside)timers.current.alert=window.setTimeout(close,LAB.alertLeaveMs);}
 },[close,nativeClock,update]);
 const touch=useCallback(()=>{if(state.current.stage==='read'&&!state.current.privacy)armPrivacy();},[armPrivacy]);
 const reveal=useCallback(()=>{if(state.current.stage!=='read'||!state.current.privacy)return;update({privacy:false});budget.current?.pause(mouse.current&&!document.hidden,Date.now());nativeClock();armPrivacy();},[armPrivacy,nativeClock,update]);
 const read=useCallback((reduced:boolean)=>{
  if(state.current.stage!=='sum'||!report.current)return;
  reduction.current=reduced;clearTimeout(timers.current.request);budget.current=new ReadBudget(Date.now());budget.current.pause(mouse.current,Date.now());update({stage:'read',privacy:false,remaining:LAB.readMs});armPrivacy();nativeClock();
  timers.current.clock=window.setInterval(()=>{const b=budget.current;if(state.current.stage!=='read'||!b)return;const left=b.remaining(Date.now());if(left<=0)burn(reduction.current);else update({remaining:left});},100);
 },[armPrivacy,burn,nativeClock,update]);
 const load=useCallback(async()=>{
  const a=activity.current;if(!a?.labRef||!['alert','sum'].includes(state.current.stage))return;
  clearTimeout(timers.current.alert);clearTimeout(timers.current.request);const session=state.current.session,id=crypto.randomUUID();request.current=id;
  update({stage:'sum',loading:true,error:''});
  try{if(nativeIsland)await invoke('clinical_capture',{active:true,epoch:session});}catch{if(state.current.session===session)update({loading:false,error:'无法启用窗口捕获保护，请重试或打开来源'});return;}
  if(state.current.session!==session||request.current!==id)return;
  timers.current.request=window.setTimeout(()=>{if(request.current===id){request.current=null;update({loading:false,error:'报告读取超时，请重试'});}},5000);
  if(!await send({type:'clinical:lab-read',requestId:id,identity:a.identity,version:a.version,reportId:a.labRef.id})&&request.current===id){clearTimeout(timers.current.request);request.current=null;update({loading:false,error:'模拟来源未连接，请重试'});}
 },[update]);
 const start=useCallback((a:Activity,stage:'alert'|'sum'='alert')=>{
  if(state.current.stage==='burn'||!a.labRef)return;
  clear();disposeLabReport(report.current);report.current=null;activity.current=a;const session=++serial;update({...initial(),stage,session});
  if(stage==='alert')timers.current.alert=window.setTimeout(close,LAB.alertMs);else void load();
 },[clear,close,load,update]);
 const receive=useCallback((e:Wire)=>{
  if(e.type!=='clinical:lab-report'||e.requestId!==request.current||state.current.stage!=='sum')return;
  clearTimeout(timers.current.request);request.current=null;const a=activity.current;
  const parsed=a?.labRef&&!e.error?parseLabReport(e.report,{identity:a.identity,version:a.version,id:a.labRef.id}):null;
  report.current=parsed;update({loading:false,error:parsed?'':'对象、版本、权限或报告格式已变化，请重试'});
 },[update]);
 const invalidate=useCallback((a:Activity|undefined,allowed:boolean)=>{const current=activity.current;if(current&&(!allowed||!a||identityKey(a.identity)!==identityKey(current.identity)||a.version!==current.version||a.withdrawn))close();},[close]);
 useEffect(()=>{
  alive.current=true;let dead=false,off:(()=>void)|undefined,offBlur:(()=>void)|undefined;
  const blur=()=>mask();const visibility=()=>{if(document.hidden)mask();if(state.current.stage==='read'&&budget.current&&budget.current.remaining(Date.now())<=0)burn(true,true);};
  window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  if(nativeIsland)void listen<{session:number}>('island://lab-expired',e=>{if(!dead&&e.payload.session===state.current.session)burn(true,true);}).then(clean=>{if(dead)clean();else off=clean;});
  if(nativeIsland)void listen('island://lab-blur',()=>{if(!dead)mask();}).then(clean=>{if(dead)clean();else offBlur=clean;});
  return()=>{alive.current=false;dead=true;off?.();offBlur?.();window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);clear();disposeLabReport(report.current);report.current=null;activity.current=null;release();};
 },[burn,clear,mask,release]);
 return {...snapshot,report:report.current,activity:activity.current,start,load,read,burn,mask,reveal,touch,hover,close,receive,invalidate,protectedSession,currentActivity,setReduced};
}
