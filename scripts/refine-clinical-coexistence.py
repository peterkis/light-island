from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/clinical/ClinicalIsland.tsx'
s=p.read_text(encoding='utf8')
s=s.replace(" const selectedTone=primary?.tone??'info';", " const selectedTone=primary?.tone??'info';\n const importantAlongside=timerSelected?c.queue.items.find(a=>a.priority==='important'):undefined;")
s=s.replace('<button className="ci-more" onClick={()=>setMenu(v=>!v)} aria-expanded={menu}><span>{c.queue.items.length>1||c.pendingCount?', '<button className="ci-more" onClick={()=>{if(importantAlongside){c.choose(identityKey(importantAlongside.identity));setMenu(false);}else setMenu(v=>!v);}} aria-expanded={menu}><span>{importantAlongside?`另有 ${importantAlongside.compact} · 计时继续`:c.queue.items.length>1||c.pendingCount?')
s=s.replace('就诊 {primary.identity.encounter} · v{primary.version}', '就诊 {primary.identity.encounter} · 来源快照 r{primary.version}')
p.write_text(s,encoding='utf8')
print('Named important-event entry coexists with personal timer; source snapshot revision is distinct from report version.')
