import {memo} from 'react';
import type {CSSProperties} from 'react';
import {abnormal,rangeBar} from './model';
import type {LabItem,LabReport} from './model';
import './reader.css';
export type LabReportView=Omit<Readonly<LabReport>,'items'> & {readonly items:readonly Readonly<LabItem>[]};
function Value({item}:{item:Readonly<LabItem>}){return <>{item.text??(item.value===null?'—':String(item.value))}{item.unit&&<small>{item.unit}</small>}{['H','L'].includes(item.flag)&&<em>{item.flag==='H'?'↑':'↓'}</em>}</>;}
export const ReportRows=memo(function ReportRows({report,animate=true}:{report:LabReportView;animate?:boolean}){
 const bad:Readonly<LabItem>[]=[],normal:Readonly<LabItem>[]=[];for(const item of report.items)(abnormal(item)?bad:normal).push(item);let index=1;
 const groups=[{items:bad,label:'异常 '+bad.length+' 项'},{items:normal,label:'其余 '+normal.length+' 项正常'}];
 return <>{groups.map(({items,label},group)=>{
  if(!items.length)return null;const sectionIndex=group===0?index++:++index;
  return <div className="lab-group" key={group}><h3 className="lab-section" data-lab-i={Math.min(11,sectionIndex)}>{label}</h3>{items.map(item=>{const i=Math.min(11,++index),bar=rangeBar(item);return <article key={item.id} className={'lab-row lab-flag-'+item.flag} data-lab-i={i}>
   <div className="lab-name">{item.name}<small>{item.abbr}</small></div><span className="lab-reference">{item.text?'来源定性结果':item.lo===null&&item.hi===null?'参考范围未提供':'参考 '+(item.lo??'—')+'–'+(item.hi??'—')}</span><strong className="lab-value"><Value item={item}/></strong>
   {bar&&<div className="lab-bar" aria-hidden="true"><span className="lab-zone" style={{left:bar.left+'%',width:bar.width+'%'}}/><i className={animate?'lab-dot animated':'lab-dot'} style={{'--lab-p':bar.dot+'%','--lab-i':i} as CSSProperties}/></div>}
  </article>;})}</div>;
 })}</>;
});
