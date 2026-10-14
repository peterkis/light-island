from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'scripts/qa-clinical-windows.py').read_text(encoding='utf8')
s=s.replace("if hit(left+8,580)!=root_h:raise AssertionError('Witness covered; screen capture cancelled')", "if hit(left+8,580)!=root_h:\n  actual=hit(left+8,580);pid=W.DWORD();u.GetWindowThreadProcessId(W.HWND(actual),C.byref(pid));report['coverageFailure']={'expectedWitness':root_h,'actualRoot':actual,'coveringPID':pid.value};raise AssertionError('Witness covered; screen capture cancelled')")
s=s.replace("finally:\n move(old.x,old.y);", "finally:\n report['receivedClicks']=clicks\n move(old.x,old.y);")
(root/'scripts/qa-motion-witness.py').write_text(s,encoding='utf8')
print('Fresh witness derivative keeps every original safety guard and retains click receipts even if coverage fails')
