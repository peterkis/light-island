import {ArrowRight,ArrowUpRight,Check,EyeOff,FlaskConical,Flame} from 'lucide-react';
import {useEffect,useRef} from 'react';
import type {CSSProperties} from 'react';
import {abnormal,rangeBar,summaryItems} from './model';
import type {LabItem,LabReport,LabState} from './model';
import type {useLabReader} from './useLabReader';
import './reader.css';
type Reader=ReturnType<typeof useLabReader>;
function Value({item}:{item:LabItem}){return <>{item.text??(item.value===null?'—':String(item.value))}{item.unit&&<small>{item.unit}</small>}{['H','L'].includes(item.flag)&&<em>{item.flag==='H'?'↑':'↓'}</em>}</>;}
export function ReportRows({report,animate=true}:{report:LabReport;animate?:boolean}){
 const bad=report.items.filter(abnormal),normal=report.items.filter(i=>!abnormal(i));let index=1;
 return <>{[[bad,'异常 '+bad.length+' 项'],[normal,'其余 '+normal.length+' 项正常']].map(([values,label],group)=>{
  const items=values as LabItem[];if(!items.length)return null;const sectionIndex=group===0?index++:++index;
  return <div className="lab-group" key={group}><h3 className="lab-section" data-lab-i={Math.min(11,sectionIndex)}>{label as string}</h3>{items.map(item=>{const i=Math.min(11,++index),bar=rangeBar(item);return <article key={item.id} className={'lab-row lab-flag-'+item.flag} data-lab-i={i}>
   <div className="lab-name">{item.name}<small>{item.abbr}</small></div><span className="lab-reference">{item.text?'来源定性结果':item.lo===null&&item.hi===null?'参考范围未提供':'参考 '+(item.lo??'—')+'–'+(item.hi??'—')}</span><strong className="lab-value"><Value item={item}/></strong>
   {bar&&<div className="lab-bar" aria-hidden="true"><span className="lab-zone" style={{left:bar.left+'%',width:bar.width+'%'}}/><i className={animate?'lab-dot animated':'lab-dot'} style={{'--lab-p':bar.dot+'%','--lab-i':i} as CSSProperties}/></div>}
  </article>;})}</div>;
 })}</>;
}
export function LabScene({lab,stage,reduced,openSource,sourceDisabled,routeText}:{lab:Reader;stage:LabState;reduced:boolean;openSource:()=>void;sourceDisabled:boolean;routeText?:string}){
 const scroller=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(stage==='read'&&lab.stage==='read'&&!lab.privacy&&lab.report)scroller.current?.focus({preventScroll:true});},[stage,lab.stage,lab.privacy,lab.report]);
 const r=lab.report,count=lab.activity?.labRef?.abnormalCount??0;
 if(stage==='alert')return <button className="lab-alert" aria-label="查看检验报告摘要" onClick={()=>void lab.load()}><span className="lab-tile" data-lab-i="0"><FlaskConical size={24}/></span><span><strong data-lab-i="1">检验报告已出</strong><span className="lab-secondary" data-lab-i="2">血常规 肝功能 CRP　<b className={count?'lab-orange':''}>{count?count+' 项异常':'全部正常'}</b></span></span><ArrowRight size={18} data-lab-i="3"/></button>;
 if(stage==='done')return <div className={'lab-done '+(reduced?'lab-reduced':'')} role="status"><Check size={22}/><span>本次快览已清除</span></div>;
 if(stage==='sum')return <section className="lab-summary" aria-label="检验报告摘要"><header data-lab-i="0"><span className="lab-tile mini"><FlaskConical size={12}/></span><span>检验科 LIS</span><time>刚刚</time></header><div data-lab-i="1"><h2>{r?.title??'检验报告'}</h2>{r&&<p className="lab-secondary">{r.maskedName}　{r.sex} {r.age} 岁　{r.reportedAt} 出具</p>}</div>
  {r&&<div className="lab-chips" data-lab-i="2">{summaryItems(r.items).map(item=><span key={item.id} className={'lab-chip lab-flag-'+item.flag}>{item.abbr}<b>{item.text??item.value} {item.flag==='H'?'↑':item.flag==='L'?'↓':''}</b></span>)}{r.items.filter(abnormal).length>3&&<span className="lab-chip">+{r.items.filter(abnormal).length-3}</span>}</div>}
  {lab.loading&&<p className="lab-secondary" role="status">正在校验报告对象与版本…</p>}{lab.error&&<p className="lab-error" role="alert">{lab.error}</p>}
  <footer data-lab-i="3"><button className="lab-button" onClick={lab.close}>稍后</button>{lab.error?<><button className="lab-button" disabled={sourceDisabled} onClick={openSource}>打开来源</button><button className="lab-button primary" onClick={()=>void lab.load()}>重试读取</button></>:<button className="lab-button primary" disabled={!r||lab.loading} onClick={()=>lab.read(reduced)}>阅读报告</button>}</footer></section>;
 return <section className={'lab-reader '+(stage==='burn'?'lab-burning ':'')+(reduced?'lab-reduced':'')} aria-label="检验报告阅读" onPointerEnter={e=>lab.hover(true,e.pointerType)} onPointerLeave={e=>lab.hover(false,e.pointerType)} onPointerMove={lab.touch} onPointerDown={lab.touch} onWheel={lab.touch} onKeyDown={lab.touch}>
  <div className="lab-paper"><header className="lab-reader-header" data-lab-i="0"><div><h2>{lab.privacy?'检验报告已隐藏':r?.title??'本次快览已清除'}</h2>{r&&!lab.privacy&&<p className="lab-secondary">{r.maskedName}　{r.sex} {r.age} 岁　{r.specimen}　{r.reportedAt} 出具</p>}<p className="lab-session-note">模拟报告　仅会话展示</p></div><div className={'lab-countdown '+(lab.remaining<=10000?'warning':'')} aria-label={'阅读剩余 '+Math.ceil(lab.remaining/1000)+' 秒'}><svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><circle className="fg" cx="18" cy="18" r="15" strokeDasharray="94.2" strokeDashoffset={94.2*(1-lab.remaining/60000)}/></svg><span aria-hidden="true">{Math.max(0,Math.ceil(lab.remaining/1000))}</span></div></header>
  <div ref={scroller} className="lab-body ci-scroll" tabIndex={lab.privacy?-1:0} role="region" aria-label="检验项目滚动区域">{lab.privacy?<div className="lab-shield"><button className="lab-button" onClick={lab.reveal} disabled={stage==='burn'}><EyeOff size={22}/>已隐藏，轻触查看</button></div>:r&&<ReportRows report={r} animate={!reduced}/>}</div>
  <footer className="lab-reader-footer"><button className="lab-button" disabled={stage==='burn'||sourceDisabled||!r} onClick={openSource}>完整报告<ArrowUpRight size={15}/></button><button className="lab-button fire" disabled={stage==='burn'} onClick={()=>lab.burn(reduced)}><Flame size={15}/>阅后即焚</button></footer>{routeText&&<p className="lab-route" role="status">{routeText}</p>}</div><span className="lab-ember" aria-hidden="true"/>
 </section>;
}
