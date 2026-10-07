from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent;out=root/'evidence/uiux-final-20261006'
# This is the historical spec we annotated, NOT the immutable user-authored UI/UX input.
p=root/'docs/Dynamic-Island-UI-Spec.md';lines=p.read_text(encoding='utf8').splitlines()
lines=[line.rstrip() if line.startswith('版本：1.1') else line for line in lines]
p.write_text('\n'.join(lines)+'\n',encoding='utf8')
r=subprocess.run(['git','diff','--check'],cwd=root,capture_output=True,encoding='utf8',errors='replace')
(out/'diff-check.txt').write_text(r.stdout+r.stderr,encoding='utf8')
result=json.loads((out/'RESULTS.json').read_text(encoding='utf8'));result['tests']['gitDiffCheck']=r.returncode
(out/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
p=root/'scripts/uiux-final-report.py';s=p.read_text(encoding='utf8').replace("cwd=root,text=True,capture_output=True","cwd=root,text=True,capture_output=True,encoding='utf8',errors='replace'")
p.write_text(s,encoding='utf8')
print('diff-check',r.returncode)
raise SystemExit(r.returncode)
