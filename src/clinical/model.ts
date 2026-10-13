import tokens from './tokens.json';
export type ScenarioId = 'S02'|'S03'|'S04'|'S05'|'S06'|'S07'|'S08'|'S09'|'S10'|'S11'|'S12'|'S13'|'S14'|'S15';
export type Role = 'clinician'|'finance'|'logistics'|'none';
export type Tone = 'info'|'warning'|'error'|'success'|'neutral';
export interface Identity { source: string; campus: string; encounter: string; object: string }
export interface SourceField {label:string; value:string; at:number|null}
interface ActivityFields {
 identity: Identity; version: number; stage: number;
 compact: string; title: string; body: string; sourceState:string; sourceAt:number|null; syncedAt:number|null;
 fields:SourceField[]; tone:Tone; priority:'routine'|'important'; scope:Role;
 patient:string; guard:string; actionLabel:string; withdrawn:boolean;
}
export const allowedRoutes={S02:'orders',S03:'critical',S04:'reports',S05:'finance',S06:'handoff',S07:'followup',S08:'report-version',S09:'specimen',S10:'blood',S11:'pharmacy',S12:'examination',S13:'transport',S14:'consult',S15:'equipment'} as const satisfies Record<ScenarioId,string>;
type ScenarioActivity = {[S in ScenarioId]: ActivityFields & {scenario:S;routeKind:typeof allowedRoutes[S]} & (S extends 'S04'?{labRef?:{id:string;abnormalCount:number}}:{labRef?:never})};
export type Activity=ScenarioActivity[ScenarioId];
export interface Settings { privacy:boolean; role:Role; locked:boolean; fullscreen:boolean; reduced:boolean; textScale:number; connectivity:'fresh'|'offline'|'stale'; routeFault:'none'|'failed'|'mismatch'; quiet:boolean; dock:'notch'|'floating'; compactText:boolean; backgroundDark:boolean; hideIdle:boolean; autoPreview:boolean }
export const defaults:Settings={privacy:false,role:'clinician',locked:false,fullscreen:false,reduced:false,textScale:1,connectivity:'fresh',routeFault:'none',quiet:false,dock:'notch',compactText:false,backgroundDark:false,hideIdle:false,autoPreview:true};
export type TimerState={duration:number;remaining:number}&({status:'running';deadline:number}|{status:'idle'|'paused';deadline:null});
export const emptyTimer=():TimerState=>({status:'idle',duration:25*60*1000,remaining:25*60*1000,deadline:null});
export interface Queue {items:Activity[];duplicates:number;rejected:number;overflow:number}
export const emptyQueue=():Queue=>({items:[],duplicates:0,rejected:0,overflow:0});
export const identityKey=(i:Identity)=>JSON.stringify([i.source,i.campus,i.encounter,i.object]);
export const versionKey=(a:Activity)=>`${identityKey(a.identity)}@${a.version}`;
function text(v:unknown,n:number):v is string {return typeof v==='string'&&v.length<=n&&v.length>0;}
export function isRecord(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export function isScenario(value:unknown):value is ScenarioId{return typeof value==='string'&&Object.hasOwn(allowedRoutes,value);}
export function parseIdentity(value:unknown):Identity|null{
 if(!isRecord(value))return null;
 const {source,campus,encounter,object}=value;
 return text(source,160)&&text(campus,160)&&text(encounter,160)&&text(object,160)?{source,campus,encounter,object}:null;
}
const finiteNonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export function parseTimerState(value:unknown):TimerState|null{
 if(!isRecord(value))return null;
 const {status,duration,remaining,deadline}=value;
 if(!finiteNonnegative(duration)||!finiteNonnegative(remaining))return null;
 if(status==='running'&&finiteNonnegative(deadline))return {status,duration,remaining,deadline};
 if((status==='idle'||status==='paused')&&deadline===null)return {status,duration,remaining,deadline};
 return null;
}
export function parseActivity(input:unknown):Activity|null {
 if(!isRecord(input))return null;
 const {scenario,version,stage,title,compact,body,sourceState,guard,patient,actionLabel,tone,priority,scope,withdrawn,sourceAt,syncedAt}=input;
 const identity=parseIdentity(input.identity);
 if(!identity||!isScenario(scenario)||input.routeKind!==allowedRoutes[scenario]||!finiteNonnegative(version)||!Number.isSafeInteger(version)||version<1||!finiteNonnegative(stage)||!Number.isInteger(stage))return null;
 if(!text(title,180)||!text(compact,80)||!text(body,900)||!text(sourceState,160)||!text(guard,400)||!text(patient,120)||!text(actionLabel,80))return null;
 if(tone!=='info'&&tone!=='warning'&&tone!=='error'&&tone!=='success'&&tone!=='neutral')return null;
 if(priority!=='routine'&&priority!=='important')return null;
 if(scope!=='clinician'&&scope!=='finance'&&scope!=='logistics')return null;
 if(typeof withdrawn!=='boolean'||(sourceAt!==null&&!finiteNonnegative(sourceAt))||(syncedAt!==null&&!finiteNonnegative(syncedAt)))return null;
 if(!Array.isArray(input.fields)||input.fields.length>8)return null;
 const fields:SourceField[]=[];
 for(const field of input.fields){
  if(!isRecord(field)||!text(field.label,80)||!text(field.value,400)||(field.at!==null&&(typeof field.at!=='number'||!Number.isFinite(field.at))))return null;
  fields.push({label:field.label,value:field.value,at:field.at});
 }
 let labRef:{id:string;abnormalCount:number}|undefined;
 if(Object.hasOwn(input,'labRef')){
  const ref=input.labRef;
  if(scenario!=='S04'||!isRecord(ref)||!text(ref.id,160)||!finiteNonnegative(ref.abnormalCount)||!Number.isInteger(ref.abnormalCount)||ref.abnormalCount>128)return null;
  labRef={id:ref.id,abnormalCount:ref.abnormalCount};
 }
 const base:ActivityFields={identity,version,stage,title,compact,body,sourceState,guard,patient,actionLabel,tone,priority,scope,withdrawn,sourceAt,syncedAt,fields};
 // Preserve the scenario/route correlation without asserting unvalidated JSON.
 switch(scenario){
  case 'S02':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S03':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S04':return {...base,scenario,routeKind:allowedRoutes[scenario],...(labRef?{labRef}:{})};
  case 'S05':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S06':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S07':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S08':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S09':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S10':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S11':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S12':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S13':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S14':return {...base,scenario,routeKind:allowedRoutes[scenario]};
  case 'S15':return {...base,scenario,routeKind:allowedRoutes[scenario]};
 }
}
export function ingest(q:Queue,input:unknown):Queue {
 const a=parseActivity(input);if(!a)return {...q,rejected:q.rejected+1};
 const i=q.items.findIndex(x=>identityKey(x.identity)===identityKey(a.identity));
 const existing=q.items[i];
 if(existing){if(existing.version>=a.version)return {...q,duplicates:q.duplicates+1};return {...q,items:q.items.map((x,j)=>j===i?a:x)};}
 if(q.items.length>=tokens.behavior.maxStoredActivities)return {...q,overflow:q.overflow+1};
 return {...q,items:[a,...q.items]};
}
export function canView(a:Activity|undefined,s:Settings):boolean {
 return Boolean(a&&!s.privacy&&!s.locked&&!s.fullscreen&&s.role!=='none'&&(a.scope===s.role||(a.scope==='logistics'&&s.role==='clinician')));
}
export function safeSettings(patch:unknown,current:Settings):Settings {
 if(!patch||typeof patch!=='object')return current;
 const p=patch as Partial<Settings>; const next={...current};
 for(const k of ['privacy','locked','fullscreen','reduced','quiet','compactText','backgroundDark','hideIdle','autoPreview'] as const)if(typeof p[k]==='boolean')next[k]=p[k]!;
 if(p.dock==='notch'||p.dock==='floating')next.dock=p.dock;
 if(['clinician','finance','logistics','none'].includes(p.role??''))next.role=p.role!;
 if(['fresh','offline','stale'].includes(p.connectivity??''))next.connectivity=p.connectivity!;
 if(['none','failed','mismatch'].includes(p.routeFault??''))next.routeFault=p.routeFault!;
 if(typeof p.textScale==='number'&&Number.isFinite(p.textScale))next.textScale=Math.min(2.25,Math.max(1,p.textScale));
 return next;
}
export function timerRemaining(t:TimerState,now=Date.now()):number{return t.status==='running'&&t.deadline!==null?Math.max(0,t.deadline-now):t.remaining;}
export function timerAction(t:TimerState,action:'start'|'pause'|'resume'|'end',now=Date.now(),duration=t.duration):TimerState{
 if(action==='end')return {...emptyTimer(),duration,remaining:duration};
 if(action==='start')return {status:'running',duration,remaining:duration,deadline:now+duration};
 if(action==='pause'&&t.status==='running')return {...t,status:'paused',remaining:timerRemaining(t,now),deadline:null};
 if(action==='resume'&&t.status==='paused')return {...t,status:'running',deadline:now+t.remaining};
 return t;
}
export function routeMatches(a:Activity,identity:Identity,version:number):boolean{return Boolean(identity&&['source','campus','encounter','object'].every(k=>typeof identity[k as keyof Identity]==='string')&&identityKey(a.identity)===identityKey(identity)&&a.version===version);}
