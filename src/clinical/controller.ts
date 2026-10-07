import {useCallback,useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {connect,send,native} from '../lib/bridge';
import type {Connection,Wire} from '../lib/bridge';
import {canView,defaults,emptyQueue,emptyTimer,identityKey,ingest,parseActivity,routeMatches,safeSettings,timerRemaining,versionKey} from './model';
import type {Activity,Settings,TimerState} from './model';
import tokens from './tokens.json';
import {previewDuration,mayInterrupt,previewAllowed} from './attention';
export type View='idle'|'compact'|'expanded';
export function useClinical(){
 const [queue,setQueue]=useState(emptyQueue),[settings,setSettings]=useState(defaults),[connection,setConnection]=useState<Connection>('connecting');
 const [timer,setTimer]=useState<TimerState>(emptyTimer),[now,setNow]=useState(Date.now());
 const [selected,setSelected]=useState<string|null>(null),[view,setView]=useState<View>('idle'),[reason,setReason]=useState<'explicit'|'preview'>('explicit');
 const [hovered,setHovered]=useState(false),[focusWithin,setFocusWithin]=useState(false);
 const [opened,setOpened]=useState<Record<string,boolean>>({}),[followed,setFollowed]=useState<Record<string,boolean>>({});
 const [route,setRoute]=useState<'idle'|'requesting'|'requested'|'opened'|'failed'|'mismatch'|'unauthorized'>('idle');
 const [source,setSource]=useState<Activity|null>(null),[sourceError,setSourceError]=useState('');
 const [readable,setReadable]=useState(false);
 const sourcePreviews=useRef(new Map<string,number>());
 const [pendingCount,setPendingCount]=useState(0),[log,setLog]=useState<string[]>([]);
 const sourceTicket=new URLSearchParams(location.search).get('source');
 const latest=useRef({queue,settings,selected,view,connection,followed});latest.current={queue,settings,selected,view,connection,followed};
 const request=useRef<{id:string;key:string;version:number;ticket?:string}|null>(null),routeTimer=useRef(0),alive=useRef(true);
 const addLog=useCallback((text:string)=>setLog(l=>[text,...l].slice(0,30)),[]);
 const receive=useCallback((e:Wire)=>{
  if(e.type==='clinical:reset'){request.current=null;clearTimeout(routeTimer.current);sourcePreviews.current.clear();setReadable(false);setQueue(emptyQueue());setTimer(emptyTimer());setSelected(null);setView('idle');setRoute('idle');setSource(null);setOpened({});setFollowed({});setPendingCount(0);setLog([]);}
  if(e.type==='clinical:settings'||e.type==='clinical:snapshot'){
   const next=safeSettings(e.settings,latest.current.settings);
   const old=latest.current.settings;
   if(next.privacy!==old.privacy||next.role!==old.role||next.locked!==old.locked||next.fullscreen!==old.fullscreen){request.current=null;clearTimeout(routeTimer.current);setRoute('idle');setSource(null);setOpened({});}
   latest.current.settings=next;setSettings(next);
  }
  if(e.type==='clinical:snapshot'){
   let q=emptyQueue(); if(Array.isArray(e.activities))for(const a of e.activities)q=ingest(q,a);
   latest.current.queue=q;setQueue(q);if(e.timer)setTimer(e.timer as TimerState);
   // A snapshot refresh restores authorized source records, not responsibility or local opened state.
  }
  if(e.type==='clinical:activity'){
   const a=parseActivity(e.activity);if(!a){setQueue(q=>({...q,rejected:q.rejected+1}));return;}
   const current=latest.current,old=current.queue.items.find(x=>identityKey(x.identity)===identityKey(a.identity));
   const nextQueue=ingest(current.queue,a);latest.current.queue=nextQueue;setQueue(nextQueue);if(old&&old.version>=a.version)return;
   const key=identityKey(a.identity);
   const active=current.queue.items.find(x=>identityKey(x.identity)===current.selected);
   if(mayInterrupt(a,active)){setSelected(key);setReadable(false);setReason('explicit');setView('expanded');}
   else if(current.view==='expanded'){if(key!==current.selected)setPendingCount(v=>v+1);}
   else if(a.priority==='important'||(!current.settings.quiet&&current.followed[key]!==false)){setSelected(key);const last=sourcePreviews.current.get(a.identity.source);
    if(current.settings.autoPreview&&previewAllowed(last,Date.now())){sourcePreviews.current.set(a.identity.source,Date.now());setReadable(false);setReason('preview');setView('expanded');}
    else setView('compact');}
   else setPendingCount(v=>v+1);
   if(request.current?.key===key){request.current=null;clearTimeout(routeTimer.current);setRoute('idle');setSource(null);}
   addLog(`${a.scenario} · 来源对象 v${a.version} 已同步`);
  }
  if(e.type==='clinical:overflow')setQueue(q=>({...q,overflow:q.overflow+Number(e.count||1)}));
  if(e.type==='clinical:timer'){setTimer(e.timer as TimerState);setNow(Date.now());}
  if(e.type==='clinical:view'){
   if(e.mode==='compact'){setView(latest.current.queue.items.length?'compact':'idle');setRoute('idle');return;}
   const a=latest.current.queue.items.find(x=>x.scenario===e.scenario);
   setSelected(e.mode==='timer'?'timer':a?identityKey(a.identity):null);setView('expanded');setReason('explicit');setPendingCount(0);
  }
  if(e.type==='clinical:route'){
   const pending=request.current;if(!pending||pending.id!==e.requestId)return;
   clearTimeout(routeTimer.current);
   if(e.error){setRoute(['mismatch','unauthorized'].includes(String(e.error))?e.error as 'mismatch'|'unauthorized':'failed');return;}
   const a=latest.current.queue.items.find(x=>identityKey(x.identity)===pending.key);
   if(!a||!canView(a,latest.current.settings)||!routeMatches(a,e.identity as Activity['identity'],Number(e.version))||pending.key!==latest.current.selected){setRoute('mismatch');request.current=null;return;}
   if(typeof e.ticket!=='string'||!/^[\da-f-]{36}$/.test(e.ticket)){setRoute('failed');return;}
   pending.ticket=e.ticket;setRoute('requested');
   if(native)void invoke('open_clinical_source',{ticket:e.ticket}).catch(()=>{if(alive.current&&request.current===pending)setRoute('failed');});
   else void send({type:'clinical:source-read',ticket:e.ticket});
  }
  if(e.type==='clinical:source'){
   if(sourceTicket!==e.ticket&&request.current?.ticket!==e.ticket)return;
   if(e.error){setSource(null);setSourceError(String(e.error));setRoute('failed');return;}
   const a=parseActivity(e.activity);
   if(a&&canView(a,latest.current.settings)){
    setSource(a);setSourceError('');setRoute('opened');setOpened(v=>({...v,[versionKey(a)]:true}));
    addLog('已打开模拟来源边界；未产生临床确认');
   }
  }
  if(e.type==='view'&&(e.mode==='compact'||e.mode==='inbox')){setView(e.mode==='compact'?'compact':'expanded');setReason('explicit');}
 },[addLog,sourceTicket]);
 useEffect(()=>{
  alive.current=true;let off:(()=>void)|undefined,dead=false;
  void connect(receive,s=>{if(!dead){setConnection(s);if(s==='online')void send({type:'clinical:sync'});}}).then(clean=>{
   if(dead)clean();else{off=clean;void send({type:'clinical:sync'});if(sourceTicket)void send({type:'clinical:source-read',ticket:sourceTicket});}
  });
  return()=>{alive.current=false;dead=true;off?.();clearTimeout(routeTimer.current);request.current=null;};
 },[receive,sourceTicket]);
 useEffect(()=>{
  if(timer.status!=='running'||timer.deadline===null)return;
  setNow(Date.now());if(timer.deadline<=Date.now())return;
  const tick=window.setInterval(()=>{const t=Date.now();setNow(t);if(t>=timer.deadline!)clearInterval(tick);},1000);
  const resume=()=>setNow(Date.now());window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return()=>{clearInterval(tick);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[timer]);
 useEffect(()=>{
  if(settings.privacy||settings.role==='none'||settings.locked||settings.fullscreen){request.current=null;clearTimeout(routeTimer.current);setRoute('idle');setSource(null);setOpened({});}
 },[settings.privacy,settings.role,settings.locked,settings.fullscreen]);
 // Preview clock is a single remaining-time budget, not a restart-on-hover timer.
 const preview=useRef({left:tokens.behavior.notificationPreviewTimeout,start:0});
 useEffect(()=>{const a=latest.current.queue.items.find(x=>identityKey(x.identity)===selected);preview.current.left=a?previewDuration(a):tokens.behavior.notificationPreviewTimeout;},[reason,selected]);
 useEffect(()=>{
  if(reason!=='preview'||view!=='expanded'||!readable||hovered||focusWithin)return;
  preview.current.start=performance.now();const timeout=window.setTimeout(()=>setView('compact'),preview.current.left);
  return()=>{clearTimeout(timeout);preview.current.left=Math.max(tokens.behavior.resumeDelay,preview.current.left-(performance.now()-preview.current.start));};
 },[reason,view,readable,hovered,focusWithin,selected]);
 const selectedActivity=queue.items.find(a=>identityKey(a.identity)===selected);
 const announcedDeadline=useRef<number|null>(null);
 useEffect(()=>{if(timer.status!=='running'||timer.deadline===null||timer.deadline>now||announcedDeadline.current===timer.deadline)return;announcedDeadline.current=timer.deadline;if(selectedActivity?.priority!=='important'){setSelected('timer');setView('expanded');setReason('explicit');}else setPendingCount(v=>v+1);},[timer.status,timer.deadline,now,selectedActivity?.priority]);
 useEffect(()=>{
  const syncedAt=selectedActivity?.syncedAt;if(!syncedAt)return;
  const left=syncedAt+1800000-Date.now();if(left<=0)return;
  const timeout=window.setTimeout(()=>setNow(Date.now()),left+1);
  return()=>clearTimeout(timeout);
 },[selectedActivity?.syncedAt]);
 const choose=(id:string)=>{request.current=null;clearTimeout(routeTimer.current);setSource(null);setRoute('idle');setSelected(id);setView('expanded');setReason('explicit');setPendingCount(0);};
 const expand=(preview=false)=>{if(!selected)setSelected(timer.status!=='idle'?'timer':queue.items[0]?identityKey(queue.items[0].identity):'timer');setView('expanded');setReason(preview?'preview':'explicit');};
 const collapse=()=>{request.current=null;clearTimeout(routeTimer.current);setSource(null);setRoute('idle');setView(queue.items.length||timer.status!=='idle'?'compact':'idle');setReason('explicit');};
 const openSource=async()=>{
  const a=selectedActivity;if(!a||!canView(a,settings)){setRoute('unauthorized');return;}
  if(connection!=='online'||settings.connectivity!=='fresh'){setRoute('failed');return;}
  const p={id:crypto.randomUUID(),key:identityKey(a.identity),version:a.version};request.current=p;setRoute('requesting');setSourceError('');
  clearTimeout(routeTimer.current);routeTimer.current=window.setTimeout(()=>{if(request.current===p){request.current=null;setRoute('failed');}},5000);
  const ok=await send({type:'clinical:open',requestId:p.id,identity:a.identity,version:a.version,routeKind:a.routeKind});
  if(request.current!==p)return;
  if(!ok){clearTimeout(routeTimer.current);request.current=null;setRoute('failed');return;}
 };
 const personal=(command:'start'|'pause'|'resume'|'end',duration?:number)=>void send({type:'clinical:personal',command,duration});
 const configure=(patch:Partial<Settings>)=>{setSettings(s=>safeSettings(patch,s));void send({type:Object.keys(patch).every(k=>['dock','compactText','backgroundDark','hideIdle','autoPreview','reduced','quiet'].includes(k))?'clinical:preferences':'clinical:configure',settings:patch});};
 const stale=connection!=='online'||settings.connectivity!=='fresh'||Boolean(selectedActivity?.syncedAt&&Date.now()-selectedActivity.syncedAt>1800000);
 return {queue,settings,connection,timer,remaining:timerRemaining(timer,now),selected,selectedActivity,view,reason,route,source,sourceError,pendingCount,opened,followed,log,stale,sourceTicket,
  choose,expand,collapse,openSource,personal,configure,setHovered,setFocusWithin,setSource,hovered,readable,setReadable,
  promote:()=>setReason('explicit'),collapseDisplay:()=>{setView(queue.items.length||timer.status!=='idle'?'compact':'idle');setReason('explicit');},
  follow:(a:Activity)=>setFollowed(f=>({...f,[identityKey(a.identity)]:f[identityKey(a.identity)]===false})),
  demo:(scenario:string,stage=0,separate=false)=>send({type:'clinical:scenario',scenario,stage,separate}),
  show:(scenario:string)=>send({type:'clinical:view',mode:scenario==='S01'?'timer':'open',scenario}),
  reset:()=>send({type:'clinical:reset'}),refresh:()=>send({type:'clinical:refresh'})};
}
export type ClinicalController=ReturnType<typeof useClinical>;
