import {useEffect,lazy,Suspense} from 'react';
import {useClinical} from './controller';
import {ClinicalIsland} from './ClinicalIsland';
import {SourceView} from './SourceView';
import {canView} from './model';
const ClinicalStudio=lazy(()=>import('./ClinicalStudio').then(m=>({default:m.ClinicalStudio})));
const islandOnly=new URLSearchParams(location.search).get('view')==='island';
export default function ClinicalApp(){
 const c=useClinical();
 useEffect(()=>{
  if(!import.meta.env.DEV)return;
  const snapshot=()=>({queue:c.queue,selected:c.selected,view:c.view,timer:c.timer,route:c.route,settings:c.settings,lab:{stage:c.lab.stage,session:c.lab.session,remaining:c.lab.remaining,hasReport:Boolean(c.lab.report),hasActivity:Boolean(c.lab.activity),protected:c.lab.protectedSession()}});
  window.__CLINICAL_DEBUG__=snapshot;
  return()=>{if(window.__CLINICAL_DEBUG__===snapshot)delete window.__CLINICAL_DEBUG__;};
 },[c]);
 const sourceVisible=c.source&&canView(c.source,c.settings);
 return <>{islandOnly?<ClinicalIsland c={c}/>:<Suspense fallback={<div className="cs-loading">正在打开场景工作台…</div>}><ClinicalStudio c={c}/></Suspense>}
  {sourceVisible&&!islandOnly&&<div className="cs-source-backdrop"><SourceView source={c.source} sourceLabReport={c.sourceLabReport} sourceError={c.sourceError} settings={c.settings} standalone={false} onClose={()=>c.setSource(null)}/></div>}
 </>;
}
