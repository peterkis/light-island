import {useCallback,useEffect,useRef,useState} from 'react';
import {createEventConnection} from '../lib/bridge';
import {parseClinicalEvent} from '../lib/protocol';
import {canView,defaults,emptyQueue,identityKey,ingest,safeSettings} from './model';
import type {Activity,Settings} from './model';
import {disposeLabReport,parseLabReport} from './lab-reader/model';
import type {LabReport} from './lab-reader/model';

/** A source window owns only its verified mirror and report, never an island reader/clock. */
export function useSourceWindow(ticket:string){
 const [stream]=useState(()=>createEventConnection('source'));
 const sendClinical=stream.send;
 const [source,setSource]=useState<Activity|null>(null),[report,setReport]=useState<LabReport|null>(null),[error,setError]=useState('');
 const [settings,setSettings]=useState<Settings>(defaults);
 const cancelRequest=useRef<()=>void>(()=>{});
 const owned=useRef<{source:Activity|null;report:LabReport|null}>({source:null,report:null});
 const clear=useCallback((message='')=>{cancelRequest.current();disposeLabReport(owned.current.report);owned.current={source:null,report:null};setSource(null);setReport(null);setError(message);},[]);
 useEffect(()=>{
  const abort=new AbortController();let dead=false,queue=emptyQueue(),policy=defaults,online=false,requested=false,awaiting=false,snapshotSeen=false,requestTimer=0;
  cancelRequest.current=()=>{awaiting=false;clearTimeout(requestTimer);requestTimer=0;};
  const invalid='来源对象、权限或版本已变化，请返回重新打开。';
  const invalidate=()=>{
   const shown=owned.current.source;if(!shown)return;
   const current=queue.items.find(a=>identityKey(a.identity)===identityKey(shown.identity));
   if(current&&current.version===shown.version&&!current.withdrawn&&canView(current,policy)&&policy.connectivity==='fresh')return;
   awaiting=false;clear(invalid);
  };
  void stream.connect(raw=>{
   if(dead)return;const event=parseClinicalEvent(raw);if(!event)return;
   if(event.type==='clinical:reset'){awaiting=false;requested=true;queue=emptyQueue();snapshotSeen=true;policy=defaults;setSettings(policy);clear(invalid);return;}
   if(event.type==='clinical:settings'||event.type==='clinical:snapshot'){
    const next=safeSettings(event.settings,policy);
    if(next.privacy!==policy.privacy||next.role!==policy.role||next.locked!==policy.locked||next.fullscreen!==policy.fullscreen){awaiting=false;clear(invalid);}
    policy=next;setSettings(policy);
   }
   if(event.type==='clinical:snapshot'){
    queue=emptyQueue();for(const a of event.activities)queue=ingest(queue,a);snapshotSeen=true;invalidate();
    if(online&&!requested){requested=true;awaiting=true;requestTimer=window.setTimeout(()=>{if(!dead&&awaiting)clear('来源读取超时，请返回重新打开。');},5000);void sendClinical({type:'clinical:source-read',ticket}).then(ok=>{if(!dead&&!ok){awaiting=false;clear('模拟来源未连接，请返回重新打开。');}});}
   }
   if(event.type==='clinical:activity'){queue=ingest(queue,event.activity);invalidate();}
   if(event.type==='clinical:source'&&event.ticket===ticket&&awaiting){
    cancelRequest.current();
    if(event.error!==undefined){clear(event.error);return;}
    const a=event.activity,current=queue.items.find(item=>identityKey(item.identity)===identityKey(a.identity));
    if(!online||!snapshotSeen||!current||current.version!==a.version||current.withdrawn||a.withdrawn||!canView(a,policy)||!canView(current,policy)||policy.connectivity!=='fresh'){clear(invalid);return;}
    const nextReport=a.labRef?parseLabReport(event.labReport,{identity:a.identity,version:a.version,id:a.labRef.id}):null;
    disposeLabReport(owned.current.report);owned.current={source:a,report:nextReport};setSource(a);setReport(nextReport);setError('');
   }
  },state=>{
   if(dead)return;
   online=state==='online';
   if(online){requested=false;awaiting=false;snapshotSeen=false;void sendClinical({type:'clinical:sync'});}
   else {awaiting=false;clear(state==='offline'?'模拟来源连接已断开，请返回重新打开。':'');}
  },abort.signal).catch(()=>{if(!dead)clear('模拟来源连接失败，请返回重新打开。');});
  return()=>{dead=true;cancelRequest.current();cancelRequest.current=()=>{};abort.abort();disposeLabReport(owned.current.report);owned.current={source:null,report:null};};
 },[ticket,clear,stream,sendClinical]);
 return {source,sourceLabReport:report,sourceError:error,settings,clear};
}
