import {useEffect} from 'react';
import {useClinical} from './controller';
import {ClinicalIsland} from './ClinicalIsland';
export default function ClinicalApp(){
 const c=useClinical();
 useEffect(()=>{
  if(!import.meta.env.DEV)return;
  const snapshot=()=>({connection:c.connection,queue:c.queue,selected:c.selected,view:c.view,timer:c.timer,route:c.route,settings:c.settings,lab:{stage:c.lab.stage,session:c.lab.session,remaining:c.lab.remaining,hasReport:Boolean(c.lab.report),hasActivity:Boolean(c.lab.activity),protected:c.lab.protectedSession()}});
  window.__CLINICAL_DEBUG__=snapshot;
  return()=>{if(window.__CLINICAL_DEBUG__===snapshot)delete window.__CLINICAL_DEBUG__;};
 },[c]);
 return <ClinicalIsland c={c}/>;
}
