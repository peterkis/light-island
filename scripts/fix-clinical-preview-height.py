from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/clinical/useClinicalLayout.ts'
s=p.read_text(encoding='utf8')
old='height:p.clientHeight||window.innerHeight'
assert s.count(old)==1
# A framed workstation preview is not the entire monitor work area.
# Native layout continues to use clinical_metrics; standalone browser view uses its viewport.
s=s.replace(old,'height:window.innerHeight')
p.write_text(s,encoding='utf8')
print('Browser preview height budget uses the actual viewport, not 60% of an already reduced mock monitor.')
