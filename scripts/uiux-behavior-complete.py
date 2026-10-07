from pathlib import Path
root=Path(__file__).resolve().parent.parent
def edit(path,old,new):
 p=root/path;s=p.read_text(encoding='utf8');assert old in s,(path,old[:100]);p.write_text(s.replace(old,new),encoding='utf8')
edit('src/clinical/controller.ts',"import tokens from './tokens.json';","import tokens from './tokens.json';\nimport {previewDuration,mayInterrupt,previewAllowed} from './attention';")
edit('src/clinical/controller.ts',"   if(current.view==='expanded'){if(key!==current.selected)setPendingCount(v=>v+1);}","   const active=current.queue.items.find(x=>identityKey(x.identity)===current.selected);\n   if(mayInterrupt(a,active)){setSelected(key);setReadable(false);setReason('explicit');setView('expanded');}\n   else if(current.view==='expanded'){if(key!==current.selected)setPendingCount(v=>v+1);}")
edit('src/clinical/controller.ts',"const last=sourcePreviews.current.get(a.identity.source)??0;","const last=sourcePreviews.current.get(a.identity.source);")
edit('src/clinical/controller.ts',"Date.now()-last>=tokens.behavior.sourceThrottle","previewAllowed(last,Date.now())")
edit('src/clinical/controller.ts',"useEffect(()=>{preview.current.left=tokens.behavior.notificationPreviewTimeout;},[reason,selected]);", "useEffect(()=>{const a=latest.current.queue.items.find(x=>identityKey(x.identity)===selected);preview.current.left=a?previewDuration(a):tokens.behavior.notificationPreviewTimeout;},[reason,selected]);")
edit('src/clinical/controller.ts',"setView(selected||queue.items.length?'compact':'idle')","setView(queue.items.length||timer.status!=='idle'?'compact':'idle')")
edit('src/clinical/controller.ts',"const selectedActivity=queue.items.find(a=>identityKey(a.identity)===selected);", "const selectedActivity=queue.items.find(a=>identityKey(a.identity)===selected);\n const announcedDeadline=useRef<number|null>(null);\n useEffect(()=>{if(timer.status!=='running'||timer.deadline===null||timer.deadline>now||announcedDeadline.current===timer.deadline)return;announcedDeadline.current=timer.deadline;if(selectedActivity?.priority!=='important'){setSelected('timer');setView('expanded');setReason('explicit');}else setPendingCount(v=>v+1);},[timer.status,timer.deadline,now,selectedActivity?.priority]);")
# Keep global shortcut focusable while preserving ordinary pointer focus behavior.
edit('src/clinical/ClinicalIsland.tsx',"import {openStudio,nativeIsland} from '../lib/bridge';", "import {openStudio,nativeIsland} from '../lib/bridge';\nimport {sortActivities} from './attention';")
edit('src/clinical/ClinicalIsland.tsx'," const secondary=c.queue.items.find", " const ordered=sortActivities(c.queue.items);\n const secondary=ordered.find")
edit('src/clinical/ClinicalIsland.tsx',"{c.queue.items.map(a=>", "{ordered.map(a=>")
edit('src/clinical/ClinicalIsland.tsx',"className=\"ux-hero\" aria-live=\"off\"", "className={`ux-hero ${c.timer.status==='running'&&c.remaining===0?'ux-timer-finished':''}`} aria-live=\"off\"")
edit('src/clinical/ClinicalIsland.tsx',"<button onClick={()=>quiet(3600000)}>勿扰 1 小时</button>","<button onClick={()=>quiet(3600000)}>勿扰 1 小时</button><button onClick={()=>quiet(Math.max(1000,new Date(new Date().setHours(24,0,0,0)).getTime()-Date.now()))}>到明天</button>")
edit('src/clinical/ClinicalIsland.tsx',"{error&&<span", "{c.queue.overflow>0&&view==='expanded'&&<span className=\"ux-overflow\" role=\"status\">超出容量 {c.queue.overflow} 项，请回工作空间查看</span>}\n   {error&&<span")
print('Attention precedence, reading budget, timer completion and micro feedback integrated')
