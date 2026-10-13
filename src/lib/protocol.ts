import {isRecord,isScenario,parseActivity,parseIdentity,parseTimerState,safeSettings,defaults} from '../clinical/model';
import type {Activity,Identity,ScenarioId,Settings,TimerState} from '../clinical/model';
import type {Settings as LegacySettings} from './domain';

export type PresentationPreferences=Pick<Settings,'dock'|'compactText'|'backgroundDark'|'hideIdle'|'autoPreview'|'reduced'|'quiet'>;
export type ClinicalIslandCommand=
 | {type:'clinical:sync'|'clinical:refresh'}
 | {type:'clinical:preferences';settings:Partial<PresentationPreferences>}
 | {type:'clinical:personal';command:'start'|'pause'|'resume'|'end';duration?:number}
 | {type:'clinical:open';requestId:string;identity:Identity;version:number;routeKind:Activity['routeKind']}
 | {type:'clinical:source-read';ticket:string}
 | {type:'clinical:lab-read';requestId:string;identity:Identity;version:number;reportId:string};
export type ClinicalSimulatorCommand=
 | {type:'clinical:configure';settings:Partial<Settings>}
 | {type:'clinical:reset'}
 | {type:'clinical:scenario';scenario:ScenarioId;stage?:number;separate?:boolean;labVariant?:'baseline'|'normal'|'extended'}
 | {type:'clinical:view';mode:'open'|'compact'|'timer';scenario?:ScenarioId|'S01'};
export type LegacyCommand=
 | {type:'sync'|'reset'}
 | {type:'ack';id:string;revision:number;ackId:string}
 | {type:'configure';settings:Partial<LegacySettings>}
 | {type:'demo';scenario:string}
 | {type:'view';mode:'compact'|'inbox'|'expanded'|'thread'};
export type OutgoingCommand=ClinicalIslandCommand|ClinicalSimulatorCommand|LegacyCommand;
/** Transport data stays untrusted until the protocol-specific decoder accepts it. */
export interface WireEnvelope {type:string;[key:string]:unknown}
export function parseEnvelope(value:unknown):WireEnvelope|null{return isRecord(value)&&typeof value.type==='string'?{...value,type:value.type}:null;}
export type ClinicalIncomingEvent=
 | {type:'clinical:reset'|'clinical:refresh-failed'}
 | {type:'clinical:settings';settings:Partial<Settings>}
 | {type:'clinical:snapshot';settings:Partial<Settings>;activities:Activity[];timer:TimerState}
 | {type:'clinical:activity';activity:Activity}
 | {type:'clinical:timer';timer:TimerState}
 | {type:'clinical:overflow';count:number}
 | {type:'clinical:view';mode:'open'|'compact'|'timer';scenario?:ScenarioId|'S01'}
 | {type:'view';mode:'compact'|'inbox'}
 | {type:'clinical:route';requestId:string;error:'failed'|'mismatch'|'unauthorized'}
 | {type:'clinical:route';requestId:string;error?:never;identity:Identity;version:number;ticket:string}
 | {type:'clinical:source';ticket:string;error:string}
 | {type:'clinical:source';ticket:string;error?:never;activity:Activity;labReport?:unknown}
 | {type:'clinical:lab-report';requestId:string;error?:string;report?:unknown};
const positiveInteger=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
function parseSettings(value:unknown):Partial<Settings>|null{
 if(!isRecord(value))return null;
 const normalized=safeSettings(value,defaults),result:Partial<Settings>={};
 for(const key of ['privacy','locked','fullscreen','reduced','quiet','compactText','backgroundDark','hideIdle','autoPreview'] as const){
  if(Object.hasOwn(value,key)){if(typeof value[key]!=='boolean')return null;result[key]=normalized[key];}
 }
 if(Object.hasOwn(value,'role')){if((value.role!=='clinician'&&value.role!=='finance'&&value.role!=='logistics'&&value.role!=='none'))return null;result.role=normalized.role;}
 if(Object.hasOwn(value,'dock')){if(value.dock!=='notch'&&value.dock!=='floating')return null;result.dock=value.dock;}
 if(Object.hasOwn(value,'connectivity')){if(value.connectivity!=='fresh'&&value.connectivity!=='offline'&&value.connectivity!=='stale')return null;result.connectivity=value.connectivity;}
 if(Object.hasOwn(value,'routeFault')){if(value.routeFault!=='none'&&value.routeFault!=='failed'&&value.routeFault!=='mismatch')return null;result.routeFault=value.routeFault;}
 if(Object.hasOwn(value,'textScale')){if(typeof value.textScale!=='number'||!Number.isFinite(value.textScale))return null;result.textScale=normalized.textScale;}
 return result;
}
export function parseClinicalEvent(value:unknown):ClinicalIncomingEvent|null{
 const e=parseEnvelope(value);if(!e)return null;
 switch(e.type){
  case 'clinical:reset':case 'clinical:refresh-failed':return {type:e.type};
  case 'clinical:settings':{const settings=parseSettings(e.settings);return settings?{type:e.type,settings}:null;}
  case 'clinical:snapshot':{
   const settings=parseSettings(e.settings),timer=parseTimerState(e.timer);
   if(!settings||!timer||!Array.isArray(e.activities)||e.activities.length>20)return null;
   const activities:Activity[]=[];for(const raw of e.activities){const activity=parseActivity(raw);if(!activity)return null;activities.push(activity);}
   return {type:e.type,settings,timer,activities};
  }
  case 'clinical:activity':{const activity=parseActivity(e.activity);return activity?{type:e.type,activity}:null;}
  case 'clinical:timer':{const timer=parseTimerState(e.timer);return timer?{type:e.type,timer}:null;}
  case 'clinical:overflow':return positiveInteger(e.count)?{type:e.type,count:e.count}:null;
  case 'view':return e.mode==='compact'||e.mode==='inbox'?{type:e.type,mode:e.mode}:null;
  case 'clinical:view':{
   if(e.mode!=='open'&&e.mode!=='compact'&&e.mode!=='timer')return null;
   if(e.scenario!==undefined&&e.scenario!=='S01'&&!isScenario(e.scenario))return null;
   return {type:e.type,mode:e.mode,...(e.scenario!==undefined?{scenario:e.scenario}:{})};
  }
  case 'clinical:route':{
   if(typeof e.requestId!=='string'||e.requestId.length>80)return null;
   if(e.error==='failed'||e.error==='mismatch'||e.error==='unauthorized')return {type:e.type,requestId:e.requestId,error:e.error};
   const identity=parseIdentity(e.identity);
   return identity&&positiveInteger(e.version)&&typeof e.ticket==='string'&&/^[\da-f-]{36}$/.test(e.ticket)?{type:e.type,requestId:e.requestId,identity,version:e.version,ticket:e.ticket}:null;
  }
  case 'clinical:source':{
   if(typeof e.ticket!=='string')return null;
   if(typeof e.error==='string')return {type:e.type,ticket:e.ticket,error:e.error};
   const activity=parseActivity(e.activity);return activity?{type:e.type,ticket:e.ticket,activity,labReport:e.labReport}:null;
  }
  case 'clinical:lab-report':return typeof e.requestId==='string'&&(e.error===undefined||typeof e.error==='string')?{type:e.type,requestId:e.requestId,...(typeof e.error==='string'?{error:e.error}:{}),report:e.report}:null;
  default:return null;
 }
}
