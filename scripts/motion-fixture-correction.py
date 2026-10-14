from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tests/motion-restoration.spec.ts'
s=p.read_text(encoding='utf8');old="await full(page);await post(request,{type:'clinical:scenario',scenario:'S04',stage:0,labVariant:'baseline'});"
assert s.count(old)==1
s=s.replace(old,"await full(page);await post(request,{type:'clinical:configure',settings:{autoPreview:true}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0,labVariant:'baseline'});")
p.write_text(s,encoding='utf8')
print('Test fixture explicitly enables report preview before expecting alert; product behavior unchanged')
