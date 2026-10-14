from pathlib import Path
import hashlib,json,subprocess,zipfile,datetime,ctypes as C
root=Path(__file__).resolve().parents[1]
out=root/'evidence/motion-restore-20261013';out.mkdir(parents=True,exist_ok=True)
if (out/'baseline.json').exists():raise SystemExit('Preserve existing evidence; choose a new run')
status=subprocess.check_output(['git','status','--porcelain'],cwd=root).decode('utf-8')
files=[p for folder in ['src','src-tauri/src','tests','scripts','docs','server'] for p in (root/folder).rglob('*') if p.is_file()]+[root/p for p in ['AGENTS.md','README.md','package.json','package-lock.json','src-tauri/Cargo.lock','src-tauri/tauri.conf.json','playwright.config.ts']]
backup=root/'evidence/backups/motion-restore-20261013.zip';backup.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(backup,'x',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(root))
v=C.c_int(1);ok=C.windll.user32.SystemParametersInfoW(0x1042,0,C.byref(v),0)
result={'at':datetime.datetime.now().astimezone().isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),'status':status,'windowsAnimationsEnabled':bool(v.value) if ok else None,'scope':'Read-only OS probe; no system settings written','files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(out/'baseline.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in result.items() if k!='files'},ensure_ascii=False))
