from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'scripts/qa-clinical-windows.py';s=p.read_text(encoding='utf8')
s=s.replace("  report['cases'].append({'name':name,'point':[p.x,p.y],'target':root_h})", "  report['cases'].append({'name':name,'point':[p.x,p.y],'target':root_h})\n  root.after(120,lambda:u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10))")
s=s.replace(" root.after(250,lambda:post({'type':'clinical:scenario','scenario':'S03','stage':0}))", " root.after(250,push_important)")
s=s.replace('def important():', "def push_important():\n global focus_before\n focus_before=int(u.GetForegroundWindow() or 0)\n assert focus_before==root_h,'Synthetic witness did not receive focus before push'\n report['focusBeforePush']=focus_before\n post({'type':'clinical:scenario','scenario':'S03','stage':0})\ndef important():")
s=s.replace(" image=ImageGrab.grab(bbox=(left,0,left+width,560),include_layered_windows=True)", " assert hit(left+width//2,5)==int(h),'Native island is covered or hidden; capture failed'\n image=ImageGrab.grab(bbox=(left,0,left+width,560),include_layered_windows=True)")
p.write_text(s,encoding='utf8')
print('Witness clicks restore only overlay z-order, not focus. Source focus is sampled after the deliberate background click.')
