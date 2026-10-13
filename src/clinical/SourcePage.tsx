import {invoke} from '@tauri-apps/api/core';
import {native} from '../lib/bridge';
import {useSourceWindow} from './useSourceWindow';
import {SourceView} from './SourceView';
export default function SourcePage({ticket}:{ticket:string}){
 const source=useSourceWindow(ticket);
 const close=()=>{source.clear();if(native)void invoke('close_clinical_source').catch(()=>source.clear('来源窗口未能关闭，请使用窗口关闭操作。'));else location.assign('/clinical.html');};
 return <main className="cs-source-page"><SourceView {...source} standalone onClose={close}/></main>;
}
