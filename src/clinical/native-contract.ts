import {isRecord} from './model';
export interface Metrics {available:number;height:number;scale?:number;canvasWidth?:number;topReserved?:boolean}
export interface Platform {notificationState:number;animationsEnabled:boolean;outsideClickAvailable:boolean;shortcutRegistered:boolean}
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function parseMetrics(v:unknown):Metrics|null{
 if(!isRecord(v)||!positive(v.available)||!positive(v.height))return null;
 if(v.scale!==undefined&&!positive(v.scale)||v.canvasWidth!==undefined&&!positive(v.canvasWidth)||v.topReserved!==undefined&&typeof v.topReserved!=='boolean')return null;
 return {available:v.available,height:v.height,...(v.scale!==undefined?{scale:v.scale}:{}),...(v.canvasWidth!==undefined?{canvasWidth:v.canvasWidth}:{}),...(v.topReserved!==undefined?{topReserved:v.topReserved}:{})};
}
export function parsePlatform(v:unknown):Platform|null{
 if(!isRecord(v)||typeof v.notificationState!=='number'||!Number.isInteger(v.notificationState)||v.notificationState<0||v.notificationState>7||typeof v.animationsEnabled!=='boolean'||typeof v.outsideClickAvailable!=='boolean'||typeof v.shortcutRegistered!=='boolean')return null;
 return {notificationState:v.notificationState,animationsEnabled:v.animationsEnabled,outsideClickAvailable:v.outsideClickAvailable,shortcutRegistered:v.shortcutRegistered};
}
