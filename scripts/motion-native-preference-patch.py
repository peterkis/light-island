from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(path,old,new):
 p=root/path;s=p.read_text(encoding='utf8');assert s.count(old)==1,(path,old[:70],s.count(old));p.write_text(s.replace(old,new),encoding='utf8')
edit('src-tauri/src/lib.rs','mod clinical_input;','mod clinical_input;\nmod motion_preferences;\nuse motion_preferences::{get_motion_preference,set_motion_preference,MotionPreferenceState};')
edit('src-tauri/src/lib.rs','.manage(Arc::new(Transport::default()))','.manage(Arc::new(Transport::default()))\n        .manage(MotionPreferenceState::default())')
edit('src-tauri/src/lib.rs','tauri::generate_handler![clinical_capture,','tauri::generate_handler![get_motion_preference,set_motion_preference,clinical_capture,')
edit('src/clinical/motionPreference.ts','useCallback,useEffect,useState','useCallback,useEffect,useRef,useState')
edit('src/clinical/motionPreference.ts',"import {emit,listen} from '@tauri-apps/api/event';","import {listen} from '@tauri-apps/api/event';\nimport {invoke} from '@tauri-apps/api/core';")
edit('src/clinical/motionPreference.ts'," const [preference,setPreference]=useState(readPreference);"," const [preference,setPreference]=useState(readPreference);\n const [saveError,setSaveError]=useState('');const revision=useRef(0);")
edit('src/clinical/motionPreference.ts',"if(!disposed&&next){persist(next);setPreference(next);}","if(!disposed&&next){revision.current++;persist(next);setPreference(next);}")
edit('src/clinical/motionPreference.ts',"if(native)void listen<unknown>(EVENT,event=>apply(event.payload)).then(off=>{if(disposed)off();else unlisten=off;}).catch(()=>{});","if(native)void listen<unknown>(EVENT,event=>apply(event.payload)).then(off=>{\n   if(disposed){off();return;}unlisten=off;const current=revision.current;\n   void invoke<unknown>('get_motion_preference').then(value=>{if(!disposed&&revision.current===current)apply(value);}).catch(()=>{});\n  }).catch(()=>{});")
edit('src/clinical/motionPreference.ts',"persist(value);setPreference(value);window.dispatchEvent", "revision.current++;setSaveError('');persist(value);setPreference(value);window.dispatchEvent")
edit('src/clinical/motionPreference.ts',"if(native)void emit(EVENT,value).catch(()=>{});","if(native)void invoke('set_motion_preference',{preference:value}).catch(()=>setSaveError('当前窗口已切换，但偏好未保存；请重试'));")
edit('src/clinical/motionPreference.ts',"return {preference,mediaReduced,choose};","return {preference,mediaReduced,choose,saveError};")
edit('src/clinical/MotionPreferenceSelect.tsx','<p role="status">{effective.reason}</p>','<p role="status">{motion.saveError||effective.reason}</p>')
print('Native preference saves only enum; clinical profiles remain ephemeral; OS setting untouched')
