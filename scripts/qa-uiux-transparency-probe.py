"""One-variable, reversible DWM probe on the newly owned prototype QA HWND."""
from pathlib import Path
import ctypes as C
import ctypes.wintypes as W
import json, os, subprocess, sys

root=Path(__file__).resolve().parents[1]
owner_dir=root/'evidence/uiux-refinement-20261013/native'
owner=json.loads((owner_dir/'ownership.json').read_text(encoding='utf-8-sig'))
windows=json.loads(subprocess.check_output([sys.executable,'-X','utf8','-B',str(root/'scripts/inspect-uiux-native.py')],encoding='utf8'))
window=next(w for w in windows if w['title']=='Samewave Island')
assert window['pid']==owner['rootPid'] and owner['verified']
mode=sys.argv[1]
out=root/'evidence/uiux-refinement-20261013'/('screen-'+mode)
out.mkdir(exist_ok=False)
class Blur(C.Structure):
 _fields_=[('flags',W.DWORD),('enable',W.BOOL),('region',W.HRGN),('transition',W.BOOL)]
dwm=C.windll.dwmapi
dwm.DwmEnableBlurBehindWindow.argtypes=[W.HWND,C.POINTER(Blur)]
dwm.DwmSetWindowAttribute.argtypes=[W.HWND,W.DWORD,C.c_void_p,W.DWORD]
gdi=C.windll.gdi32
gdi.CreateRectRgn.argtypes=[C.c_int,C.c_int,C.c_int,C.c_int];gdi.CreateRectRgn.restype=W.HRGN
gdi.DeleteObject.argtypes=[W.HANDLE]
report={'mode':mode,'owner':owner,'before':window}
try:
 if mode=='no-blur':
  report['hresult']=dwm.DwmEnableBlurBehindWindow(window['hwnd'],C.byref(Blur(1,False,None,False)))
 elif mode=='redraw':
  C.windll.user32.RedrawWindow.argtypes=[W.HWND,C.c_void_p,W.HRGN,W.UINT]
  report['success']=bool(C.windll.user32.RedrawWindow(window['hwnd'],None,None,0x585))
 elif mode=='alpha':
  value=W.BOOL(True)
  report['hresult']=dwm.DwmSetWindowAttribute(window['hwnd'],39,C.byref(value),4)
 elif mode=='no-backdrop':
  value=W.DWORD(1)
  report['hresult']=dwm.DwmSetWindowAttribute(window['hwnd'],38,C.byref(value),4)
 else:raise ValueError(mode)
 result=subprocess.run([sys.executable,'-X','utf8','-B',str(root/'scripts/qa-uiux-refinement-screen.py')],cwd=root,env={**os.environ,'ISLAND_QA_OUTPUT':str(out.relative_to(root)),'ISLAND_QA_OWNER_OUTPUT':str(owner_dir.relative_to(root))},capture_output=True,text=True,encoding='utf8')
 report.update(exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr)
finally:
 if mode=='no-blur':
  region=gdi.CreateRectRgn(0,0,-1,-1)
  dwm.DwmEnableBlurBehindWindow(window['hwnd'],C.byref(Blur(3,True,region,False)))
  gdi.DeleteObject(region)
 if mode in ['alpha','no-backdrop']:
  value=W.DWORD(0)
  dwm.DwmSetWindowAttribute(window['hwnd'],39 if mode=='alpha' else 38,C.byref(value),4)
 (out/'probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=2))
