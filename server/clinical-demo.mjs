/** Isolated, loopback-only synthetic source mirror. Island commands cannot change clinical status. */
import catalogue from '../src/clinical/catalogue.json' with {type:'json'};
import {randomUUID} from 'node:crypto';
import {labFixture} from './lab-fixtures.mjs';
const routes={S02:'orders',S03:'critical',S04:'reports',S05:'finance',S06:'handoff',S07:'followup',S08:'report-version',S09:'specimen',S10:'blood',S11:'pharmacy',S12:'examination',S13:'transport',S14:'consult',S15:'equipment'};
const defaultSettings=()=>({privacy:false,role:'clinician',locked:false,fullscreen:false,reduced:false,textScale:1,connectivity:'fresh',routeFault:'none',quiet:false,dock:'notch',compactText:false,backgroundDark:false,hideIdle:false,autoPreview:true});
const defaultTimer=()=>({status:'idle',duration:1500000,remaining:1500000,deadline:null});
const key=i=>JSON.stringify([i.source,i.campus,i.encounter,i.object]);
export function createClinicalDemo(broadcast,clock=Date.now){
 let settings=defaultSettings(),timer=defaultTimer(),serial=0;
 const activities=new Map(),tickets=new Map(),labReports=new Map();
 const allowed=a=>!settings.privacy&&!settings.locked&&!settings.fullscreen&&settings.role!=='none'&&(a.scope===settings.role||(a.scope==='logistics'&&settings.role==='clinician'));
 const publicItem=a=>allowed(a)?a:{...a,patient:'患者信息已保护',title:a.compact,body:'身份或展示权限不允许查看详情。',sourceState:'详情已保护',fields:[],sourceAt:null,syncedAt:null};
 const snapshot=()=>({type:'clinical:snapshot',activities:[...activities.values()].map(publicItem),settings:{...settings},timer:{...timer}});
 function publish(){broadcast(snapshot());}
 function scenario(id,stage=0,options={}){
  const def=catalogue.find(d=>d.id===id);if(!def||!Number.isInteger(stage)||!def.stages[stage])throw new Error('Unknown synthetic clinical scenario');
  const v=def.stages[stage],now=clock();
  const identity={source:def.source,campus:'DEMO-本部',encounter:id==='S07'?'DEMO-VISIT-OLD':id==='S15'?'DEMO-ASSET':'DEMO-VISIT-006',object:`DEMO-${id}${options.separate?'-'+(++serial):''}`};
  const old=activities.get(key(identity));
  const a={identity,scenario:id,version:(old?.version??0)+1,stage,compact:`${def.name} · 1 项动态`,title:v.title,body:v.body,
   sourceState:v.sourceState,sourceAt:v.unknownTime?null:now-60000,syncedAt:now-(v.stale?3600000:0),
   fields:v.fields.map((f,index)=>({...f,at:v.unknownFieldTime&&index>0?null:now-60000*(index+1)})),
   tone:v.tone,priority:v.important?'important':'routine',scope:def.scope,
   patient:id==='S15'?'设备 DEMO-ECG-01':'王某某 · 成人 · 06床（仅模拟）',guard:def.guard,
   actionLabel:v.actionLabel??def.actionLabel,routeKind:routes[id],withdrawn:v.withdrawn===true};
  if(activities.size>=20&&!old){broadcast({type:'clinical:overflow',count:1});return;}
  activities.set(key(identity),a);
  if(options.labVariant){
   if(id!=='S04'||!['baseline','normal','extended'].includes(options.labVariant))throw new Error('Unknown synthetic report variant');
   const report=labFixture(identity,a.version,options.labVariant),count=report.items.filter(i=>['H','L','A'].includes(i.flag)).length;
   labReports.set(key(identity),report);Object.assign(a,{title:'检验报告已出',compact:'检验报告 · 1 项动态',body:'血常规 肝功能 CRP　'+(count?count+' 项异常':'全部正常'),patient:'模拟检验报告',sourceState:'只读报告已发布',fields:[],withdrawn:false,labRef:{id:report.id,abnormalCount:count}});
  }else labReports.delete(key(identity));
  if(v.routeFault)settings.routeFault=v.routeFault;
  broadcast({type:'clinical:settings',settings:{...settings}});
  broadcast({type:'clinical:activity',activity:publicItem(a)});
 }
 function handle(data,reply=()=>{}){
  if(!data||typeof data.type!=='string'||!data.type.startsWith('clinical:'))return false;
  switch(data.type){
   case 'clinical:sync':reply(snapshot());break;
   case 'clinical:scenario':scenario(data.scenario,data.stage??0,{separate:data.separate===true,labVariant:data.labVariant});break;
   case 'clinical:reset':activities.clear();tickets.clear();labReports.clear();settings=defaultSettings();timer=defaultTimer();broadcast({type:'clinical:reset'});publish();break;
   case 'clinical:preferences':
   case 'clinical:configure':{
    const p=data.settings??{};
    if(data.type==='clinical:preferences'&&Object.keys(p).some(k=>!['dock','compactText','backgroundDark','hideIdle','autoPreview','reduced','quiet'].includes(k)))throw new Error('Only presentation preferences are permitted');
    for(const k of ['privacy','locked','fullscreen','reduced','quiet','compactText','backgroundDark','hideIdle','autoPreview'])if(typeof p[k]==='boolean')settings[k]=p[k];
    if(['notch','floating'].includes(p.dock))settings.dock=p.dock;
    if(['clinician','finance','logistics','none'].includes(p.role))settings.role=p.role;
    if(['fresh','stale','offline'].includes(p.connectivity))settings.connectivity=p.connectivity;
    if(['none','failed','mismatch'].includes(p.routeFault))settings.routeFault=p.routeFault;
    if(Number.isFinite(p.textScale))settings.textScale=Math.min(2.25,Math.max(1,p.textScale));
    tickets.clear();broadcast({type:'clinical:settings',settings:{...settings}});publish();break;
   }
   case 'clinical:refresh':{
    // Successful re-read is explicit. Reconnection alone never changes a source sync timestamp.
    if(settings.connectivity!=='fresh'){reply({type:'clinical:refresh-failed'});break;}
    for(const [k,a]of activities)activities.set(k,{...a,syncedAt:clock()});publish();break;
   }
   case 'clinical:personal':{
    const now=clock();const command=data.command;
    if(command==='start'){
     const duration=Number.isFinite(data.duration)?Math.min(3600000,Math.max(1000,data.duration)):1500000;
     timer={status:'running',duration,remaining:duration,deadline:now+duration};
    }else if(command==='pause'&&timer.status==='running')timer={...timer,status:'paused',remaining:Math.max(0,timer.deadline-now),deadline:null};
    else if(command==='resume'&&timer.status==='paused')timer={...timer,status:'running',deadline:now+timer.remaining};
    else if(command==='end')timer=defaultTimer();
    else if(!['pause','resume'].includes(command))throw new Error('Unknown personal timer command');
    broadcast({type:'clinical:timer',timer:{...timer}});break;
   }
   case 'clinical:view':
    if(!['open','compact','timer'].includes(data.mode))throw new Error('Unknown clinical view');
    broadcast({type:'clinical:view',mode:data.mode,scenario:data.scenario});break;
   case 'clinical:open':{
    const id=data.requestId; if(typeof id!=='string'||id.length>80||!data.identity)throw new Error('Invalid route request');
    const a=activities.get(key(data.identity));const answer={type:'clinical:route',requestId:id};
    if(!a||a.version!==data.version||routes[a.scenario]!==data.routeKind){reply({...answer,error:'mismatch'});break;}
    if(!allowed(a)){reply({...answer,error:'unauthorized'});break;}
    if(settings.connectivity!=='fresh'||settings.routeFault!=='none'){reply({...answer,error:settings.routeFault==='mismatch'?'mismatch':'failed'});break;}
    const ticket=randomUUID();tickets.set(ticket,{activity:a,expires:clock()+60000});
    if(tickets.size>20)tickets.delete(tickets.keys().next().value);
    reply({...answer,ticket,identity:a.identity,version:a.version});break;
   }
   case 'clinical:lab-read':{
    if(typeof data.requestId!=='string'||data.requestId.length>80||!data.identity)throw new Error('Invalid read-only report request');
    const a=activities.get(key(data.identity)),r=labReports.get(key(data.identity));
    if(!a||!r||a.version!==data.version||r.id!==data.reportId||!allowed(a)||settings.connectivity!=='fresh'||settings.routeFault!=='none'||a.withdrawn){reply({type:'clinical:lab-report',requestId:data.requestId,error:'Report identity, version or permission changed'});break;}
    reply({type:'clinical:lab-report',requestId:data.requestId,report:r});break;
   }
   case 'clinical:source-read':{
    const t=tickets.get(data.ticket);const a=t&&activities.get(key(t.activity.identity));
    if(!t||t.expires<clock()||!a||a.version!==t.activity.version||!allowed(a)||settings.connectivity!=='fresh'){
     reply({type:'clinical:source',ticket:data.ticket,error:'对象、权限或版本已变化，请返回重新打开。'});break;
    }
    reply({type:'clinical:source',ticket:data.ticket,activity:publicItem(a),...(a.labRef?{labReport:labReports.get(key(a.identity))}:{})});break;
   }
   default:throw new Error('Clinical mirror is read-only; acknowledgement/dispatch/completion commands are not implemented');
  }
  return true;
 }
 return {handle,snapshot,inspect:()=>({settings:{...settings},timer:{...timer},activities:[...activities.values()],tickets:tickets.size})};
}
