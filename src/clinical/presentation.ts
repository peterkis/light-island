import type {Activity,Settings} from './model';
import {canView,versionKey} from './model';

/** Session-only presentation choices. They never change source records. */
export interface UndoPreview {key:string;expires:number}
export function previewMuted(a:Activity,muted:readonly string[]):boolean {
 return a.priority==='routine'&&muted.includes(a.identity.source);
}
export function undoActivity(undo:UndoPreview|null,items:Activity[],settings:Settings,now:number):Activity|undefined {
 if(!undo||now>=undo.expires)return undefined;
 return items.find(a=>versionKey(a)===undo.key&&canView(a,settings));
}
export function swipeDecision(dx:number,dy:number,velocity:number,width:number):'dismiss'|'return' {
 return Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)&&
  (Math.abs(dx)>=width*.4||(Math.abs(dx)>=40&&Math.abs(velocity)>=.6))?'dismiss':'return';
}
