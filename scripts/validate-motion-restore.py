from pathlib import Path
import subprocess,time,json,os,hashlib,sys
root=Path(__file__).resolve().parents[1];out=root/'evidence/motion-restore-20261013'
name=sys.argv[1] if len(sys.argv)>1 else 'build-first'
folder=out/name;folder.mkdir(parents=True,exist_ok=False)
commands=[('typecheck',['cmd','/c','npm run typecheck']),('unit',['cmd','/c','npm test -- --reporter=json --outputFile='+str(folder/'unit.json')]),('rust',['cargo','test','--manifest-path','src-tauri/Cargo.toml','--lib','--release','--locked']),('clippy',['cargo','clippy','--manifest-path','src-tauri/Cargo.toml','--all-targets','--all-features','--locked','--','-D','warnings']),('desktop',['cmd','/c','npm run desktop:build']),('bundle',['cmd','/c','npm run bundle:check'])]
rows=[]
for label,command in commands:
 started=time.perf_counter()
 with (folder/(label+'.log')).open('wb') as log:process=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 row={'name':label,'command':command,'exitCode':process.returncode,'seconds':round(time.perf_counter()-started,2)};rows.append(row);print(json.dumps(row),flush=True)
 (folder/'commands.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
 if process.returncode:sys.exit(process.returncode)
exe=root/'src-tauri/target/release/samewave-island.exe'
files=[p for folderName in ['src','src-tauri/src','tests','server'] for p in (root/folderName).rglob('*') if p.is_file()]+[exe,root/'package.json',root/'package-lock.json',root/'src-tauri/Cargo.lock']
(folder/'tested-hashes.json').write_text(json.dumps({str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2),encoding='utf8')
print('FINAL_BUILD_HASH',hashlib.sha256(exe.read_bytes()).hexdigest(),flush=True)
