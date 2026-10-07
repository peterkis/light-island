from pathlib import Path
import subprocess,time,json,hashlib,datetime
root=Path(__file__).resolve().parent.parent;out=root/'evidence/uiux-final-20261006';out.mkdir(parents=True,exist_ok=True)
commands=[('typecheck',['cmd','/c','npx tsc -b --pretty false']),('unit',['cmd','/c','npm test']),('rust',['cargo','test','--manifest-path','src-tauri/Cargo.toml','--lib','--release','--locked']),('desktop',['cmd','/c','npm run desktop:build'])]
results=[]
for name,command in commands:
 start=time.monotonic()
 with (out/f'final-{name}.log').open('w',encoding='utf8') as f:r=subprocess.run(command,cwd=root,stdout=f,stderr=subprocess.STDOUT)
 results.append({'name':name,'command':command,'exitCode':r.returncode,'seconds':round(time.monotonic()-start,2)})
 (out/'final-commands.json').write_text(json.dumps(results,indent=2),encoding='utf8')
 print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
paths=[p for part in ['src','src-tauri/src','server'] for p in (root/part).rglob('*') if p.is_file()]
paths += [root/'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md',root/'src-tauri/target/release/samewave-island.exe']
(out/'tested-hashes.json').write_text(json.dumps({str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},indent=2),encoding='utf8')
print('FINAL_BUILD_RECORDED',datetime.datetime.now().astimezone().isoformat(),flush=True)
