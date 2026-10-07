import {StrictMode,useEffect,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {invoke} from '@tauri-apps/api/core';
import {ArrowLeft,ArrowUpRight,ShieldCheck} from 'lucide-react';
import {useClinical} from './controller';
import {ClinicalIsland} from './ClinicalIsland';
const ClinicalStudio=lazy(()=>import('./ClinicalStudio').then(m=>({default:m.ClinicalStudio}))); 
import {canView} from './model';
import './tokens.css';
import './clinical.css';
import './uiux.css';
const query=new URLSearchParams(location.search),islandOnly=query.get('view')==='island';
document.documentElement.classList.toggle('clinical-native',islandOnly);
function App(){
 const c=useClinical();
 useEffect(()=>{if(import.meta.env.DEV)(window as unknown as {__CLINICAL_DEBUG__:()=>unknown}).__CLINICAL_DEBUG__=()=>({queue:c.queue,selected:c.selected,view:c.view,timer:c.timer,route:c.route,settings:c.settings});},[c]);
 const sourceVisible=c.source&&canView(c.source,c.settings);
 const source=<section className="cs-source" role="dialog" aria-modal={!c.sourceTicket} aria-label="模拟来源边界"><header><span><ArrowUpRight size={18}/>模拟来源边界 · 非真实 HIS / LIS</span><button aria-label="返回灵动岛" onClick={()=>{if(c.sourceTicket&&window.__TAURI_INTERNALS__)void invoke('close_clinical_source');else c.setSource(null);}}><ArrowLeft size={16}/>返回</button></header>{sourceVisible?<><span className="cs-eyebrow">SOURCE OBJECT / READ ONLY</span><h1>{c.source!.title}</h1><p>{c.source!.patient}</p><dl>{[['来源',c.source!.identity.source],['院区',c.source!.identity.campus],['原始就诊',c.source!.identity.encounter],['来源对象',c.source!.identity.object],['来源版本',`v${c.source!.version}`],['来源状态',c.source!.sourceState]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p>{c.source!.body}</p><div className="cs-source-guard"><ShieldCheck size={20}/><p>这里仅验证“跳转到正确对象”的原型链路。未连接真实医疗系统，未完成临床接收、复核、处置或任务转移。</p></div></>:<><h1>来源详情未显示</h1><p>{c.sourceError||'正在核对对象、版本与演示权限…'}</p><small>来源对象或权限变化后，请返回重新打开。</small></>}</section>;
 return c.sourceTicket?<main className="cs-source-page">{source}</main>:<>{islandOnly?<ClinicalIsland c={c}/>:<Suspense fallback={<div className="cs-loading">正在打开场景工作台…</div>}><ClinicalStudio c={c}/></Suspense>} {sourceVisible&&!islandOnly&&<div className="cs-source-backdrop">{source}</div>}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
