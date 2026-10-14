/** Isolated, loopback-only synthetic source mirror. Island commands cannot change clinical status. */
import catalogue from '../src/clinical/catalogue.json' with {type:'json'};
import {randomUUID} from 'node:crypto';
import {labFixture} from './lab-fixtures.mjs';
/** @typedef {import('../src/clinical/model').Activity} Activity
 * @typedef {import('../src/clinical/model').Identity} Identity
 * @typedef {import('../src/clinical/model').Settings} Settings
 * @typedef {import('../src/clinical/model').TimerState} TimerState
 * @typedef {import('../src/clinical/model').ScenarioId} ScenarioId
 * @typedef {import('../src/lib/protocol').ClinicalIncomingEvent} ClinicalIncomingEvent
 * @typedef {{label:string,title:string,body:string,sourceState:string,tone:string,fields:Array<{label:string,value:string}>,unknownTime?:boolean,unknownFieldTime?:boolean,stale?:boolean,important?:boolean,actionLabel?:string,withdrawn?:boolean,routeFault?:string}} ScenarioStage
 */
/** @param {unknown} value @returns {value is Record<string,unknown>} */
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
/** @template {string} T @param {unknown} value @param {readonly T[]} choices @returns {value is T} */
const member=(value,choices)=>choices.some(choice=>choice===value);
/** @param {unknown} value @returns {Identity|null} */
const identityOf=value=>record(value)&&typeof value.source==='string'&&typeof value.campus==='string'&&typeof value.encounter==='string'&&typeof value.object==='string'?{source:value.source,campus:value.campus,encounter:value.encounter,object:value.object}:null;
const routes=/** @type {const} */ ({S02:'orders',S03:'critical',S04:'reports',S05:'finance',S06:'handoff',S07:'followup',S08:'report-version',S09:'specimen',S10:'blood',S11:'pharmacy',S12:'examination',S13:'transport',S14:'consult',S15:'equipment'});
/** @param {unknown} value @returns {value is ScenarioId} */
const scenarioId=value=>typeof value==='string'&&Object.hasOwn(routes,value);
/** @returns {import('../src/lib/protocol').SourceSettings} */
const defaultSettings=()=>({privacy:false,role:'clinician',locked:false,fullscreen:false,connectivity:'fresh',routeFault:'none'});
/** @param {Identity} i */
const key=i=>JSON.stringify([i.source,i.campus,i.encounter,i.object]);
/** @param {(event:ClinicalIncomingEvent)=>void} broadcast @param {()=>number} [clock] */
export function createClinicalDemo(broadcast,clock=Date.now){
 let settings=defaultSettings(),serial=0;
 const activities=new Map(/** @type {Array<[string,Activity]>} */([])),tickets=new Map(/** @type {Array<[string,{activity:Activity,expires:number}]>} */([])),labReports=new Map(/** @type {Array<[string,import('../src/clinical/lab-reader/model').LabReport]>} */([]));
 /** @param {Activity} a */
 const allowed=a=>!settings.privacy&&!settings.locked&&!settings.fullscreen&&settings.role!=='none'&&(a.scope===settings.role||(a.scope==='logistics'&&settings.role==='clinician'));
 /** @param {Activity} a @returns {Activity} */
 const publicItem=a=>{
  if(allowed(a))return a;
  const masked={...a,patient:'患者信息已保护',title:a.compact,body:'身份或展示权限不允许查看详情。',sourceState:'详情已保护',fields:[],sourceAt:null,syncedAt:null};
  delete masked.labRef;
  return masked;
 };
 /** @returns {Extract<ClinicalIncomingEvent,{type:'clinical:snapshot'}>} */
 const snapshot=()=>({type:'clinical:snapshot',activities:[...activities.values()].map(publicItem),settings:{...settings}});
 function publish(){broadcast(snapshot());}
 /** @param {unknown} id @param {unknown} [stage] @param {{separate?:boolean,labVariant?:unknown}} [options] */
 function scenario(id,stage=0,options={}){
  if(!scenarioId(id)||typeof stage!=='number')throw new Error('Unknown synthetic clinical scenario');
  const def=catalogue.find(d=>d.id===id);if(!def||!Number.isInteger(stage)||!def.stages[stage])throw new Error('Unknown synthetic clinical scenario');
  /** @type {ScenarioStage} */
  const v=def.stages[stage];const now=clock();
  if(!member(v.tone,['info','warning','error','success','neutral'])||!member(def.scope,['clinician','finance','logistics']))throw new Error('Invalid scenario contract');
  const identity={source:def.source,campus:'DEMO-本部',encounter:id==='S07'?'DEMO-VISIT-OLD':id==='S15'?'DEMO-ASSET':'DEMO-VISIT-006',object:`DEMO-${id}${options.separate?'-'+(++serial):''}`};
  const old=activities.get(key(identity));
  const base={identity,version:(old?.version??0)+1,stage,compact:`${def.name} · 1 项动态`,title:v.title,body:v.body,
   sourceState:v.sourceState,sourceAt:v.unknownTime?null:now-60000,syncedAt:now-(v.stale?3600000:0),
   fields:v.fields.map((f,index)=>({...f,at:v.unknownFieldTime&&index>0?null:now-60000*(index+1)})),
   tone:v.tone,priority:/** @type {'important'|'routine'} */(v.important?'important':'routine'),scope:def.scope,
   patient:id==='S15'?'设备 DEMO-ECG-01':'王某某 · 成人 · 06床（仅模拟）',guard:def.guard,
   actionLabel:v.actionLabel??def.actionLabel,withdrawn:v.withdrawn===true};
  /** @type {Activity} */
  let a;
  switch(id){
   case 'S02':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S03':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S04':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S05':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S06':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S07':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S08':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S09':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S10':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S11':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S12':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S13':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S14':a={...base,scenario:id,routeKind:routes[id]};break;
   case 'S15':a={...base,scenario:id,routeKind:routes[id]};break;
  }
  if(activities.size>=20&&!old){broadcast({type:'clinical:overflow',count:1});return;}
  activities.set(key(identity),a);
  if(options.labVariant){
   if(a.scenario!=='S04'||!member(options.labVariant,['baseline','normal','extended']))throw new Error('Unknown synthetic report variant');
   const report=labFixture(identity,a.version,options.labVariant),count=report.items.filter(i=>['H','L','A'].includes(i.flag)).length;
   labReports.set(key(identity),report);Object.assign(a,{title:'检验报告已出',compact:'检验报告 · 1 项动态',body:'血常规 肝功能 CRP　'+(count?count+' 项异常':'全部正常'),patient:'模拟检验报告',sourceState:'只读报告已发布',fields:[],withdrawn:false,labRef:{id:report.id,abnormalCount:count}});
  }else labReports.delete(key(identity));
  if(member(v.routeFault,['none','failed','mismatch']))settings.routeFault=v.routeFault;
  broadcast({type:'clinical:settings',settings:{...settings}});
  broadcast({type:'clinical:activity',activity:publicItem(a)});
 }
 /** @param {unknown} data @param {(event:ClinicalIncomingEvent)=>void} [reply] */
 function handle(data,reply=()=>{}){
  if(!record(data)||typeof data.type!=='string'||!data.type.startsWith('clinical:'))return false;
  switch(data.type){
   case 'clinical:sync':reply(snapshot());break;
   case 'clinical:scenario':scenario(data.scenario,data.stage??0,{separate:data.separate===true,labVariant:data.labVariant});break;
   case 'clinical:reset':activities.clear();tickets.clear();labReports.clear();settings=defaultSettings();broadcast({type:'clinical:reset'});publish();break;
   case 'clinical:configure':{
    const p=record(data.settings)?data.settings:{};
    if(Object.keys(p).some(k=>!['privacy','role','locked','fullscreen','connectivity','routeFault'].includes(k)))throw new Error('Presentation preferences belong to each viewer');
    for(const k of /** @type {const} */ (['privacy','locked','fullscreen']))if(typeof p[k]==='boolean')settings[k]=p[k];
    if(member(p.role,['clinician','finance','logistics','none']))settings.role=p.role;
    if(member(p.connectivity,['fresh','stale','offline']))settings.connectivity=p.connectivity;
    if(member(p.routeFault,['none','failed','mismatch']))settings.routeFault=p.routeFault;
    tickets.clear();broadcast({type:'clinical:settings',settings:{...settings}});publish();break;
   }
   case 'clinical:refresh':{
    // Successful re-read is explicit. Reconnection alone never changes a source sync timestamp.
    if(settings.connectivity!=='fresh'){reply({type:'clinical:refresh-failed'});break;}
    for(const [k,a]of activities)activities.set(k,{...a,syncedAt:clock()});publish();break;
   }
   case 'clinical:open':{
    const id=data.requestId,identity=identityOf(data.identity); if(typeof id!=='string'||id.length>80||!identity)throw new Error('Invalid route request');
    const a=activities.get(key(identity));const answer={type:/** @type {const} */('clinical:route'),requestId:id};
    if(!a||a.version!==data.version||routes[a.scenario]!==data.routeKind){reply({...answer,error:'mismatch'});break;}
    if(!allowed(a)){reply({...answer,error:'unauthorized'});break;}
    if(settings.connectivity!=='fresh'||settings.routeFault!=='none'){reply({...answer,error:settings.routeFault==='mismatch'?'mismatch':'failed'});break;}
    const ticket=randomUUID();tickets.set(ticket,{activity:a,expires:clock()+60000});
    if(tickets.size>20){const oldest=tickets.keys().next().value;if(oldest!==undefined)tickets.delete(oldest);}
    reply({...answer,ticket,identity:a.identity,version:a.version});break;
   }
   case 'clinical:lab-read':{
    const identity=identityOf(data.identity);
    if(typeof data.requestId!=='string'||data.requestId.length>80||!identity)throw new Error('Invalid read-only report request');
    const a=activities.get(key(identity)),r=labReports.get(key(identity));
    if(!a||!r||a.version!==data.version||r.id!==data.reportId||!allowed(a)||settings.connectivity!=='fresh'||settings.routeFault!=='none'||a.withdrawn){reply({type:'clinical:lab-report',requestId:data.requestId,error:'Report identity, version or permission changed'});break;}
    reply({type:'clinical:lab-report',requestId:data.requestId,report:r});break;
   }
   case 'clinical:source-read':{
    if(typeof data.ticket!=='string')throw new Error('Invalid source ticket');
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
 return {handle,snapshot,inspect:()=>({settings:{...settings},activities:[...activities.values()],tickets:tickets.size})};
}
