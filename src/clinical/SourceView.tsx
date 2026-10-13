import {ArrowLeft,ArrowUpRight,ShieldCheck} from 'lucide-react';
import {canView} from './model';
import type {Activity,Settings} from './model';
import type {LabReport} from './lab-reader/model';
import {ReportRows} from './lab-reader/ReportRows';
import type {CSSProperties} from 'react';

interface SourceViewProps {source:Activity|null;sourceLabReport:LabReport|null;sourceError:string;settings:Settings;standalone:boolean;onClose:()=>void}
export function SourceView({source,sourceLabReport,sourceError,settings,standalone,onClose}:SourceViewProps){
 const visible=source&&canView(source,settings);
 return <section className="cs-source" role="dialog" aria-modal={!standalone} aria-label="模拟来源边界">
  <header><span><ArrowUpRight size={18}/>模拟来源边界 · 非真实 HIS / LIS</span><button aria-label="返回灵动岛" onClick={onClose}><ArrowLeft size={16}/>返回</button></header>
  {visible&&source?<><span className="cs-eyebrow">SOURCE OBJECT / READ ONLY</span><h1>{source.title}</h1><p>{source.patient}</p>
   <dl>{[['来源',source.identity.source],['院区',source.identity.campus],['原始就诊',source.identity.encounter],['来源对象',source.identity.object],['来源版本',`v${source.version}`],['来源状态',source.sourceState]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{source.body}</p>
   {sourceLabReport&&<div className="lab-source-report" style={{'--ci-text-scale':1} as CSSProperties}><h2>{sourceLabReport.title}</h2><p>{sourceLabReport.maskedName}　{sourceLabReport.specimen}　{sourceLabReport.reportedAt}</p><ReportRows report={sourceLabReport} animate={false}/></div>}
   <div className="cs-source-guard"><ShieldCheck size={20}/><p>这里仅验证“跳转到正确对象”的原型链路。未连接真实医疗系统，未完成临床接收、复核、处置或任务转移。</p></div>
  </>:<><h1>来源详情未显示</h1><p>{sourceError||'正在核对对象、版本与演示权限…'}</p><small>来源对象或权限变化后，请返回重新打开。</small></>}
 </section>;
}
