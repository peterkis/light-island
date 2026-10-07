"""Build and record actual commands on the current Windows working tree."""
from pathlib import Path
import subprocess, json, datetime, hashlib
root=Path(__file__).resolve().parent.parent
out=root/'evidence/clinical-20261004';out.mkdir(parents=True,exist_ok=True)
records=[]
commands=[('typecheck','npx.cmd tsc -b --pretty false'),('unit','npm.cmd test'),('desktop-build','npm.cmd run desktop:build'),('rust','cargo test --manifest-path src-tauri/Cargo.toml --lib --release --locked')]
for name,command in commands:
 start=datetime.datetime.now().astimezone().isoformat()
 with (out/f'final-{name}.log').open('w',encoding='utf8') as log:
  result=subprocess.run(command,cwd=root,shell=True,stdout=log,stderr=subprocess.STDOUT)
 records.append({'name':name,'command':command,'start':start,'end':datetime.datetime.now().astimezone().isoformat(),'exit':result.returncode})
 (out/'final-build-commands.json').write_text(json.dumps(records,indent=2),encoding='utf8')
 print(name,result.returncode,flush=True)
 if result.returncode:raise SystemExit(result.returncode)
files=[p for folder in ['src','src-tauri/src','server'] for p in (root/folder).rglob('*') if p.is_file()]
files += [root/f for f in ['package.json','package-lock.json','vite.config.ts','src-tauri/tauri.conf.json']]
(out/'tested-source-hashes.json').write_text(json.dumps({str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files},indent=2),encoding='utf8')
print('Source hashes recorded',flush=True)
