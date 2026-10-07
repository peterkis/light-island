from pathlib import Path
root=Path(__file__).resolve().parent.parent
s=(root/'scripts/qa-uiux-preview.mjs').read_text(encoding='utf8')
s=s.replace("evidence/uiux-v1-20261006","evidence/uiux-final-20261006")
s=s.replace("scenario:'S03',stage:0","scenario:'S04',stage:0",1)
# The second scenario must be a separate source; retain the saved first demo flow.
pos=s.index("await snap('compact')")
s=s[:pos]+s[pos:].replace("scenario:'S04',stage:0","scenario:'S02',stage:0",1)
s=s.replace("await e.screenshot({path:`${out}/preview-${name}.png`});", "const r=await e.boundingBox();await page.screenshot({path:`${out}/preview-${name}.png`,clip:{x:r.x-48,y:Math.max(0,r.y-8),width:r.width+124,height:r.height+64}});")
(root/'scripts/qa-uiux-final-preview.mjs').write_text(s,encoding='utf8')
s=(root/'scripts/qa-clinical-native.mjs').read_text(encoding='utf8')
s=s.replace("evidence/clinical-20261004","evidence/uiux-final-20261006")
s=s.replace("await post({type:'clinical:scenario',scenario:'S03',stage:0});await settled('compact');", "await post({type:'clinical:scenario',scenario:'S03',stage:0});await post({type:'clinical:view',mode:'compact'});await settled('compact');")
s=s.replace('i<8','i<4').replace('regions.length<180','regions.length<500')
(root/'scripts/qa-uiux-final-native.mjs').write_text(s,encoding='utf8')
s=(root/'scripts/measure-clinical-process.ps1').read_text(encoding='utf8').replace('evidence\\clinical-20261004\\process-tree.json','evidence\\uiux-final-20261006\\process-tree.json')
(root/'scripts/measure-uiux-process.ps1').write_text(s,encoding='utf8')
print('Prepared current-spec QA copies; historical scripts/evidence remain intact')
