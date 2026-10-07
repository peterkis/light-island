from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/clinical/model.ts';s=p.read_text(encoding='utf8')
s=s.replace("quiet:boolean }","quiet:boolean; dock:'notch'|'floating'; compactText:boolean; backgroundDark:boolean; hideIdle:boolean; autoPreview:boolean }")
s=s.replace("routeFault:'none',quiet:false}","routeFault:'none',quiet:false,dock:'notch',compactText:false,backgroundDark:false,hideIdle:false,autoPreview:true}")
s=s.replace("'reduced','quiet'] as const","'reduced','quiet','compactText','backgroundDark','hideIdle','autoPreview'] as const")
s=s.replace("if(['clinician','finance'", "if(p.dock==='notch'||p.dock==='floating')next.dock=p.dock;\n if(['clinician','finance'",1)
p.write_text(s,encoding='utf8')
p=root/'server/clinical-demo.mjs';s=p.read_text(encoding='utf8')
s=s.replace("routeFault:'none',quiet:false}","routeFault:'none',quiet:false,dock:'notch',compactText:false,backgroundDark:false,hideIdle:false,autoPreview:true}")
s=s.replace("['privacy','locked','fullscreen','reduced','quiet']","['privacy','locked','fullscreen','reduced','quiet','compactText','backgroundDark','hideIdle','autoPreview']")
s=s.replace("if(['clinician','finance'", "if(['notch','floating'].includes(p.dock))settings.dock=p.dock;\n    if(['clinician','finance'",1)
p.write_text(s,encoding='utf8')
print('Presentation settings added without changing source state permissions')
