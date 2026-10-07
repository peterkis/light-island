from pathlib import Path
import hashlib,json,zipfile,subprocess,datetime
root=Path(__file__).resolve().parent.parent
out=root/'evidence/uiux-final-20261006';out.mkdir(parents=True,exist_ok=True)
paths=[p for part in ['src','src-tauri/src','src-tauri/capabilities','tests','scripts','server','docs'] for p in (root/part).rglob('*') if p.is_file()]
paths += [p for p in root.iterdir() if p.is_file() and p.suffix in ['.md','.json','.ts','.html']]
backup=root/'evidence/backups/before-uiux-final-20261006.zip'
if not backup.exists():
 with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
  for p in set(paths):z.write(p,p.relative_to(root))
 result={'at':datetime.datetime.now().astimezone().isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'status':subprocess.check_output(['git','status','--short'],cwd=root,text=True),'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in set(paths)}}
 (out/'baseline.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('Preserved current dirty workspace; no index/branch changes')
