from pathlib import Path
import hashlib,json,zipfile,subprocess,datetime
root=Path(__file__).resolve().parent.parent;out=root/'evidence/uiux-v1-20261006';out.mkdir(parents=True,exist_ok=True)
backup=root/'evidence/backups/before-uiux-v1-20261006.zip';backup.parent.mkdir(exist_ok=True,parents=True)
if backup.exists():raise SystemExit('Baseline backup exists; do not overwrite')
files=[p for name in ['src','src-tauri/src','src-tauri/capabilities','tests','scripts','server','docs'] for p in (root/name).rglob('*') if p.is_file()]+[p for p in root.iterdir() if p.is_file() and p.suffix in ['.md','.json','.ts','.html']]
with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
 for p in set(files):z.write(p,p.relative_to(root))
spec=root/'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md'
result={'at':datetime.datetime.now().astimezone().isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'status':subprocess.check_output(['git','status','--short'],cwd=root,text=True),'specSHA256':hashlib.sha256(spec.read_bytes()).hexdigest(),'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in set(files)}}
(out/'baseline.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
assert result['specSHA256']=='a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa'
print('BASELINE_SAVED; local specification matches attachment byte for byte')
