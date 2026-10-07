import type {Activity} from './model';
import T from './tokens.json';
/** Importance is supplied by the source, never inferred from a lab value here. */
export function attentionPriority(a:Activity):0|2{return a.priority==='important'?0:2;}
export function previewDuration(a:Activity,buttons=false):number {
 const chars=Array.from(a.title+a.body).length;
 return (Math.min(8,Math.max(4,chars/15))+(buttons?2:0))*1000;
}
export function sortActivities(items:Activity[]):Activity[]{return [...items].sort((a,b)=>attentionPriority(a)-attentionPriority(b)||(b.sourceAt??0)-(a.sourceAt??0));}
export function mayInterrupt(next:Activity,current:Activity|undefined):boolean{return attentionPriority(next)===0&&(!current||attentionPriority(current)>0);}
export function previewAllowed(last:number|undefined,now:number):boolean{return last===undefined||now-last>=T.behavior.sourceThrottle;}
