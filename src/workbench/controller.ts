import {useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {useClinical} from '../clinical/controller';
import {sendSimulator,sendExperiment,nativeWorkbench} from '../lib/bridge';
import {sourceSettingKeys,preferenceKeys} from '../lib/protocol';
import type {ExperimentAction,SourceSettings,PresentationPreferences} from '../lib/protocol';
import {defaults} from '../clinical/model';
import type {Settings,ScenarioId} from '../clinical/model';

/** Simulation controls belong to this application, never to the island controller. */
export function useWorkbench(){
 const c=useClinical();
 const [desktopPreferences,setDesktopPreferences]=useState<Partial<PresentationPreferences>>({});
 const [target,setTarget]=useState('preview'),[actionError,setActionError]=useState('');
 const run=async(action:ExperimentAction)=>{
  setActionError('');
  if(target==='preview'){
   if(action.kind==='personal')c.personal(action.command,action.duration);
   else if(action.kind==='preferences')c.configurePreferences(action.settings);
   else c.present(action);
   return true;
  }
  const ok=await sendExperiment(target,action);if(ok&&action.kind==='preferences')setDesktopPreferences(old=>({...old,...action.settings}));if(!ok)setActionError('桌面实验未发送，请确认灵动岛连接。');return ok;
 };
 const simulation=async(event:Parameters<typeof sendSimulator>[0])=>{
  const ok=await sendSimulator(event,target);setActionError(ok?'':'模拟命令未发送，请检查消息源或目标连接。');return ok;
 };
 const configureSimulation=(patch:Partial<Settings>)=>{
  const source:Partial<SourceSettings>={},preferences:Partial<PresentationPreferences>={};
  for(const k of sourceSettingKeys)if(Object.hasOwn(patch,k))Object.assign(source,{[k]:patch[k]});
  for(const k of preferenceKeys)if(Object.hasOwn(patch,k))Object.assign(preferences,{[k]:patch[k]});
  if(Object.keys(source).length)void simulation({type:'clinical:configure',settings:source});
  if(Object.keys(preferences).length)void run({kind:'preferences',settings:preferences});
 };
 return {...c,target,setTarget,actionError,configureSimulation,controlsSettings:target==='preview'?c.settings:{...defaults,...desktopPreferences,...c.controls.desktop},
  launchIsland:async()=>{try{if(nativeWorkbench)await invoke('launch_island');else setActionError('浏览器预览不启动桌面程序，请运行灵动岛 EXE。');}catch{setActionError('未找到灵动岛 EXE，请将两个构建产物放在同一目录。');}},
  demo:(scenario:ScenarioId,stage=0,separate=false)=>simulation({type:'clinical:scenario',scenario,stage,separate}),
  labDemo:(variant:'baseline'|'normal'|'extended'='baseline')=>{if(target==='preview'){if(c.lab.stage==='burn')return Promise.resolve(false);c.lab.close();}return simulation({type:'clinical:scenario',scenario:'S04',stage:0,labVariant:variant});},
  show:(scenario:ScenarioId|'S01')=>run({kind:'view',mode:scenario==='S01'?'timer':'open',scenario}),
  experimentPersonal:(command:'start'|'pause'|'resume'|'end',duration?:number)=>run({kind:'personal',command,...(duration===undefined?{}:{duration})}),
  reset:()=>simulation({type:'clinical:reset'}),refresh:()=>target==='preview'?c.refresh():simulation({type:'clinical:refresh'}),
  addAnother:(scenario:ScenarioId)=>simulation({type:'clinical:scenario',scenario,stage:0,separate:true})
 };
}
export type WorkbenchController=ReturnType<typeof useWorkbench>;
