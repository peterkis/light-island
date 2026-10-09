import {identityKey} from '../model';
import type {Identity} from '../model';
import tokens from './tokens.json';
export type LabState='idle'|'alert'|'sum'|'read'|'burn'|'done';
export type LabFlag='H'|'L'|'N'|'A'|'unknown';
export interface LabItem {id:string;name:string;abbr:string;unit:string;value:number|null;lo:number|null;hi:number|null;text?:string;flag:LabFlag}
export interface LabReport {id:string;identity:Identity;version:number;title:string;source:string;maskedName:string;sex:string;age:number;specimen:string;reportedAt:string;items:LabItem[]}
const str=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const num=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v));
/** Copy an allowlisted, bounded read-only contract. HTML/URLs/callbacks never enter the reader. */
export function parseLabReport(value:unknown,expected:{identity:Identity;version:number;id:string}):LabReport|null{
 if(!value||typeof value!=='object')return null;
 const r=value as LabReport;
 if(!r.identity||!['source','campus','encounter','object'].every(k=>str(r.identity[k as keyof Identity],160))||identityKey(r.identity)!==identityKey(expected.identity)||r.version!==expected.version||r.id!==expected.id)return null;
 if(![r.title,r.source,r.maskedName,r.sex,r.specimen,r.reportedAt].every(v=>str(v,160))||!/^.{1,2}\*\*$/.test(r.maskedName)||!Number.isInteger(r.age)||r.age<0||r.age>130)return null;
 if(!Array.isArray(r.items)||r.items.length>128||JSON.stringify(r).length>65536)return null;
 const ids=new Set<string>();
 if(!r.items.every(i=>i&&str(i.id,80)&&!ids.has(i.id)&&(ids.add(i.id),true)&&str(i.name,80)&&str(i.abbr,24)&&typeof i.unit==='string'&&i.unit.length<=32&&[i.value,i.lo,i.hi].every(num)&&['H','L','N','A','unknown'].includes(i.flag)&&(i.text===undefined||str(i.text,80))))return null;
 return {id:r.id,identity:{...expected.identity},version:r.version,title:r.title,source:r.source,maskedName:r.maskedName,sex:r.sex,age:r.age,specimen:r.specimen,reportedAt:r.reportedAt,items:r.items.map(i=>({id:i.id,name:i.name,abbr:i.abbr,unit:i.unit,value:i.value,lo:i.lo,hi:i.hi,flag:i.flag,...(i.text?{text:i.text}:{})}))};
}
export const abnormal=(i:LabItem)=>['H','L','A'].includes(i.flag);
/** Clear this owned mutable snapshot, including objects held by outgoing presentation.
 * JS string buffers/GC and OS memory copies cannot be guaranteed erased. */
export function disposeLabReport(r:LabReport|null){
 if(!r)return;
 for(const i of r.items){i.name='';i.abbr='';i.unit='';i.text=undefined;i.value=null;i.lo=null;i.hi=null;i.flag='unknown';i.id='';}
 r.items.length=0;r.id='';r.title='';r.source='';r.maskedName='';r.sex='';r.specimen='';r.reportedAt='';r.age=0;r.version=0;
 r.identity={source:'',campus:'',encounter:'',object:''};
}
export function rangeBar(i:Pick<LabItem,'lo'|'hi'|'value'|'text'>){
 if(i.text||i.lo===null||i.hi===null||i.value===null||i.hi<=i.lo)return null;
 const span=i.hi-i.lo,min=i.lo>0?i.lo-.6*span:0,max=i.hi+.6*span;if(max<=min)return null;
 const p=(v:number)=>Math.max(2,Math.min(98,(v-min)/(max-min)*100));
 return {left:p(i.lo),width:p(i.hi)-p(i.lo),dot:p(i.value)};
}
export function summaryItems(items:LabItem[]){
 const a=items.filter(abnormal);
 // The supplied eight-row fixture preserves its three-chip order. Expanded reports rank deviation.
 if(a.length<=3)return a;
 return [...a].sort((x,y)=>deviation(y)-deviation(x)).slice(0,3);
}
function deviation(i:LabItem){return i.value!==null&&i.lo!==null&&i.hi!==null&&i.hi>i.lo?Math.max(i.lo-i.value,i.value-i.hi,0)/(i.hi-i.lo):0;}
export const LAB=tokens.timing;
/** One elapsed-time budget: intervals render it, never decrement it by an assumed tick. */
export class ReadBudget{
 left=LAB.readMs;at=0;paused=false;
 constructor(now:number){this.at=now;}
 remaining(now:number){return Math.max(0,this.left-(this.paused?0:Math.max(0,now-this.at)));}
 pause(paused:boolean,now:number){this.left=this.remaining(now);this.at=now;this.paused=paused;}
}
