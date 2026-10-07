import tokens from './tokens.json';
export type ScenarioId = 'S02'|'S03'|'S04'|'S05'|'S06'|'S07'|'S08'|'S09'|'S10'|'S11'|'S12'|'S13'|'S14'|'S15';
export type Role = 'clinician'|'finance'|'logistics'|'none';
export type Tone = 'info'|'warning'|'error'|'success'|'neutral';
export interface Identity { source: string; campus: string; encounter: string; object: string }
export interface SourceField {label:string; value:string; at:number|null}
export interface Activity {
 identity: Identity; scenario: ScenarioId; version: number; stage: number;
 compact: string; title: string; body: string; sourceState:string; sourceAt:number|null; syncedAt:number|null;
 fields:SourceField[]; tone:Tone; priority:'routine'|'important'; scope:Role;
 patient:string; guard:string; actionLabel:string; routeKind:string; withdrawn:boolean;
}
export interface Settings { privacy:boolean; role:Role; locked:boolean; fullscreen:boolean; reduced:boolean; textScale:number; connectivity:'fresh'|'offline'|'stale'; routeFault:'none'|'failed'|'mismatch'; quiet:boolean; dock:'notch'|'floating'; compactText:boolean; backgroundDark:boolean; hideIdle:boolean; autoPreview:boolean }
export const defaults:Settings={privacy:false,role:'clinician',locked:false,fullscreen:false,reduced:false,textScale:1,connectivity:'fresh',routeFault:'none',quiet:false,dock:'notch',compactText:false,backgroundDark:false,hideIdle:false,autoPreview:true};
export interface TimerState {status:'idle'|'running'|'paused'; duration:number; remaining:number; deadline:number|null}
export const emptyTimer=():TimerState=>({status:'idle',duration:25*60*1000,remaining:25*60*1000,deadline:null});
export interface Queue {items:Activity[];duplicates:number;rejected:number;overflow:number}
export const emptyQueue=():Queue=>({items:[],duplicates:0,rejected:0,overflow:0});
export const identityKey=(i:Identity)=>JSON.stringify([i.source,i.campus,i.encounter,i.object]);
export const versionKey=(a:Activity)=>`${identityKey(a.identity)}@${a.version}`;
export const allowedRoutes:Record<ScenarioId,string>={S02:'orders',S03:'critical',S04:'reports',S05:'finance',S06:'handoff',S07:'followup',S08:'report-version',S09:'specimen',S10:'blood',S11:'pharmacy',S12:'examination',S13:'transport',S14:'consult',S15:'equipment'};
function text(v:unknown,n:number):v is string {return typeof v==='string'&&v.length<=n&&v.length>0;}
export function parseActivity(input:unknown):Activity|null {
 if(!input||typeof input!=='object')return null;
 const a=input as Activity;
 if(!a.identity||!Object.values(a.identity).every(v=>text(v,160))||!['source','campus','encounter','object'].every(k=>text(a.identity[k as keyof Identity],160)))return null;
 if(!(a.scenario in allowedRoutes)||a.routeKind!==allowedRoutes[a.scenario]||!Number.isSafeInteger(a.version)||a.version<1||!Number.isInteger(a.stage)||a.stage<0)return null;
 if(!text(a.title,180)||!text(a.compact,80)||!text(a.body,900)||!text(a.sourceState,160)||!text(a.guard,400)||!text(a.patient,120)||!text(a.actionLabel,80))return null;
 if(!['info','warning','error','success','neutral'].includes(a.tone)||!['routine','important'].includes(a.priority)||!['clinician','finance','logistics'].includes(a.scope)||typeof a.withdrawn!=='boolean')return null;
 if(![a.sourceAt,a.syncedAt].every(v=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0)))return null;
 if(!Array.isArray(a.fields)||a.fields.length>8||!a.fields.every(f=>f&&text(f.label,80)&&text(f.value,400)&&(f.at===null||Number.isFinite(f.at))))return null;
 // Copy only the known contract; ignore payload HTML, URLs, action callbacks or extraneous data.
 return {identity:{source:a.identity.source,campus:a.identity.campus,encounter:a.identity.encounter,object:a.identity.object},scenario:a.scenario,version:a.version,stage:a.stage,compact:a.compact,title:a.title,body:a.body,sourceState:a.sourceState,sourceAt:a.sourceAt,syncedAt:a.syncedAt,fields:a.fields.map(f=>({label:f.label,value:f.value,at:f.at})),tone:a.tone,priority:a.priority,scope:a.scope,patient:a.patient,guard:a.guard,actionLabel:a.actionLabel,routeKind:a.routeKind,withdrawn:a.withdrawn};
}
export function ingest(q:Queue,input:unknown):Queue {
 const a=parseActivity(input);if(!a)return {...q,rejected:q.rejected+1};
 const i=q.items.findIndex(x=>identityKey(x.identity)===identityKey(a.identity));
 if(i>=0){if(q.items[i].version>=a.version)return {...q,duplicates:q.duplicates+1};return {...q,items:q.items.map((x,j)=>j===i?a:x)};}
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
