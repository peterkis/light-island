from pathlib import Path
root=Path(__file__).resolve().parent.parent
s=(root/'scripts/qa-clinical-windows.py').read_text(encoding='utf8')
# Same owned-witness / real input checks; point is now 16 DIP outside the 372-wide shell,
# inside its rendered shadow. No unrelated desktop target is permitted.
s=s.replace("click_case('expanded transparent side',r[2]-5,150)","click_case('expanded shadow pixels remain click-through',(r[0]+r[2])//2+202,140)")
assert 'expanded shadow pixels remain click-through' in s
(root/'scripts/qa-uiux-shadow-windows.py').write_text(s,encoding='utf8')
print('Created a controlled actual-shadow click case from the established witness test')
