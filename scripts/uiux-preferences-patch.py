from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'server/clinical-demo.mjs';s=p.read_text(encoding='utf8')
s=s.replace("case 'clinical:configure':{", "case 'clinical:preferences':\n   case 'clinical:configure':{")
s=s.replace("const p=data.settings??{};", "const p=data.settings??{};\n    if(data.type==='clinical:preferences'&&Object.keys(p).some(k=>!['dock','compactText','backgroundDark','hideIdle','autoPreview','reduced','quiet'].includes(k)))throw new Error('Only presentation preferences are permitted');")
p.write_text(s,encoding='utf8')
p=root/'src-tauri/src/lib.rs';s=p.read_text(encoding='utf8').replace('"clinical:source-read", "clinical:personal"','"clinical:source-read", "clinical:personal", "clinical:preferences"');p.write_text(s,encoding='utf8')
p=root/'src/clinical/controller.ts';s=p.read_text(encoding='utf8').replace("void send({type:'clinical:configure',settings:patch});", "void send({type:Object.keys(patch).every(k=>['dock','compactText','backgroundDark','hideIdle','autoPreview','reduced','quiet'].includes(k))?'clinical:preferences':'clinical:configure',settings:patch});")
p.write_text(s,encoding='utf8')
p=root/'src/clinical/ClinicalIsland.tsx';s=p.read_text(encoding='utf8').replace("},[c.selected,c.settings.privacy,c.settings.role]);","},[c.settings.privacy,c.settings.role]);")
s=s.replace("useEffect(()=>{if(surface==='alert'", "useEffect(()=>{if(['failed','mismatch','unauthorized'].includes(c.route))setPanel('details');},[c.route]);\n useEffect(()=>{if(surface==='alert'",1)
p.write_text(s,encoding='utf8')
print('Native island may change only presentation settings, never roles or clinical states')
