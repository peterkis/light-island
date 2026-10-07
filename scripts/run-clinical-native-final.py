from pathlib import Path
import subprocess,json,datetime
root=Path(__file__).resolve().parent.parent;out=root/'evidence/clinical-20261004';rows=[]
commands=[('boundaries','node scripts/qa-clinical-boundaries.mjs'),('interaction','node scripts/qa-clinical-native.mjs')]+[(f'windows-{n}','python scripts/qa-clinical-windows.py') for n in range(1,4)]
for name,cmd in commands:
 start=datetime.datetime.now().astimezone().isoformat()
 with (out/f'delivery-native-{name}.log').open('w',encoding='utf8') as log:r=subprocess.run(cmd,cwd=root,shell=True,stdout=log,stderr=subprocess.STDOUT)
 rows.append({'name':name,'command':cmd,'start':start,'end':datetime.datetime.now().astimezone().isoformat(),'exit':r.returncode})
 (out/'delivery-native-commands.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
 if name.startswith('windows-') and (out/'native-click-focus.json').exists():
  (out/f'{name}.json').write_bytes((out/'native-click-focus.json').read_bytes())
 print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
print('Final native matrix complete',flush=True)
