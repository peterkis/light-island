import {parsePlatform} from './native-contract';
import type {Platform} from './native-contract';

// Event-driven refresh: at most one OS query, with a coalesced follow-up.
export function watchPlatformStatus(query:()=>Promise<unknown>,update:(value:Platform|null)=>void){
 let dead=false,busy=false,again=false;
 const refresh=()=>{
  if(dead)return;
  update(null);
  if(busy){again=true;return;}
  busy=true;
  void query().then(value=>{if(!dead&&!again)update(parsePlatform(value));}).catch(()=>{if(!dead&&!again)update(null);}).finally(()=>{
   busy=false;if(!dead&&again){again=false;refresh();}
  });
 };
 const visible=()=>{if(document.visibilityState==='visible')refresh();};
 window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);refresh();
 return()=>{dead=true;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
}
