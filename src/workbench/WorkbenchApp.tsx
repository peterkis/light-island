import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {ClinicalStudio} from '../clinical/ClinicalStudio';
import {SourceView} from '../clinical/SourceView';
import {canView} from '../clinical/model';
import {nativeWorkbench} from '../lib/bridge';
import {useWorkbench} from './controller';
export default function WorkbenchApp(){
 const c=useWorkbench(),[serverError,setServerError]=useState(''),[messages,setMessages]=useState<Array<{direction:string;clientId:string;type:string;requestId?:string;status?:string}>>([]);
 useEffect(()=>{
  if(!nativeWorkbench)return;let dead=false,off:(()=>void)|undefined,offMessages:(()=>void)|undefined;
  const apply=(value:{error?:string})=>{if(!dead)setServerError(value.error??'');};
  void listen<{error?:string}>('workbench://status',event=>apply(event.payload)).then(fn=>{if(dead)fn();else off=fn;});
  void listen<{direction:string;clientId:string;type:string;requestId?:string;status?:string}>('workbench://message',event=>{if(!dead)setMessages(old=>[event.payload,...old].slice(0,30));}).then(fn=>{if(dead)fn();else offMessages=fn;});
  void invoke<{error?:string;messages?:typeof messages}>('workbench_status').then(value=>{apply(value);if(!dead&&Array.isArray(value.messages))setMessages(value.messages.slice(-30).reverse());}).catch(()=>setServerError('模拟服务状态读取失败'));
  return()=>{dead=true;off?.();offMessages?.();};
 },[]);
 useEffect(()=>{
  if(!import.meta.env.DEV)return;
  window.__CLINICAL_DEBUG__=()=>({connection:c.connection,queue:c.queue,selected:c.selected,view:c.view,timer:c.timer,route:c.route,settings:c.settings,lab:{stage:c.lab.stage,session:c.lab.session,remaining:c.lab.remaining,hasReport:Boolean(c.lab.report),hasActivity:Boolean(c.lab.activity),protected:c.lab.protectedSession()}});
  return()=>{delete window.__CLINICAL_DEBUG__;};
 },[c]);
 return <><ClinicalStudio c={c}/>{nativeWorkbench&&<section className="cs-message-console" aria-label="消息收发观察"><h2>消息收发观察</h2><p>最多保留 30 条元数据；实验反馈只说明本地动作，不表示临床接收。</p><table><thead><tr><th>方向</th><th>类型</th><th>请求</th><th>结果</th></tr></thead><tbody>{messages.map((message,i)=><tr key={i}><td>{message.direction==='in'?'接收':'发送'}</td><td>{message.type}</td><td>{message.requestId?.slice(0,12)??'—'}</td><td>{message.status??'—'}</td></tr>)}</tbody></table></section>}{(serverError||c.actionError)&&<div className="cs-runtime-error" role="alert">{serverError||c.actionError}</div>}
  {c.source&&canView(c.source,c.settings)&&<div className="cs-source-backdrop"><SourceView source={c.source} sourceLabReport={c.sourceLabReport} sourceError={c.sourceError} settings={c.settings} standalone={false} onClose={()=>c.setSource(null)}/></div>}
 </>;
}
