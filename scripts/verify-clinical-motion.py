"""Serial acceptance on the final code. Native QA must be running with explicit diagnostics."""
from pathlib import Path
import subprocess,json,hashlib,datetime,os
root=Path(__file__).resolve().parent.parent;out=root/'evidence/clinical-motion-20261004'
files=[p for folder in ['src','src-tauri/src','tests','server'] for p in (root/folder).rglob('*') if p.is_file()]
files += [root/'scripts/generate-clinical-tokens.mjs',root/'docs/Dynamic-Island-UI-Spec.md']
hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(out/'verified-source.json').write_text(json.dumps(hashes,indent=2),encoding='utf8')
rows=[];env={**os.environ,'ISLAND_QA_OUTPUT':'evidence/clinical-motion-20261004'}
commands=[('types','npx.cmd tsc -b --pretty false'),('unit','npm.cmd test'),('rust','cargo test --manifest-path src-tauri/Cargo.toml --lib --release --locked'),('e2e','npm.cmd run test:e2e'),('native-motion','node scripts/qa-clinical-motion.mjs'),('native-boundaries','node scripts/qa-clinical-boundaries.mjs'),('native-interaction','node scripts/qa-clinical-native.mjs'),('windows-1','python scripts/qa-clinical-windows.py'),('windows-2','python scripts/qa-clinical-windows.py')]
for name,command in commands:
 start=datetime.datetime.now().astimezone().isoformat()
 with (out/f'verified-{name}.log').open('w',encoding='utf8') as f:r=subprocess.run(command,cwd=root,shell=True,stdout=f,stderr=subprocess.STDOUT,env=env)
 rows.append({'name':name,'command':command,'start':start,'end':datetime.datetime.now().astimezone().isoformat(),'exit':r.returncode})
 (out/'verified-commands.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
 if name.startswith('windows-') and (out/'native-click-focus.json').exists():(out/f'{name}.json').write_bytes((out/'native-click-focus.json').read_bytes())
 print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
changed=[str(p.relative_to(root)) for p in files if hashlib.sha256(p.read_bytes()).hexdigest()!=hashes[str(p.relative_to(root))]]
assert not changed,changed
exe=root/'src-tauri/target/release/samewave-island.exe'
(out/'verified-build.json').write_text(json.dumps({'sourceChanges':changed,'exeSHA256':hashlib.sha256(exe.read_bytes()).hexdigest(),'exeBytes':exe.stat().st_size,'allPass':True},indent=2),encoding='utf8')
print('SERIAL_FINAL_ACCEPTANCE_PASS',flush=True)
