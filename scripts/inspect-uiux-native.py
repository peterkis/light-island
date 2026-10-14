"""Read-only identity/geometry probe for the Samewave prototype and its QA witnesses."""
import ctypes as C
import ctypes.wintypes as W
import json

u=C.windll.user32
k=C.windll.kernel32
u.SetProcessDPIAware()
u.GetWindowThreadProcessId.argtypes=[W.HWND,C.POINTER(W.DWORD)]
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)]
u.GetClassNameW.argtypes=[W.HWND,W.LPWSTR,C.c_int]
u.GetWindowTextW.argtypes=[W.HWND,W.LPWSTR,C.c_int]
u.GetWindowLongPtrW.argtypes=[W.HWND,C.c_int]
u.GetWindowLongPtrW.restype=C.c_ssize_t
u.GetClassLongPtrW.argtypes=[W.HWND,C.c_int]
u.GetClassLongPtrW.restype=C.c_size_t
C.windll.dwmapi.DwmGetWindowAttribute.argtypes=[W.HWND,W.DWORD,C.c_void_p,W.DWORD]
k.OpenProcess.argtypes=[W.DWORD,W.BOOL,W.DWORD]
k.OpenProcess.restype=W.HANDLE
k.QueryFullProcessImageNameW.argtypes=[W.HANDLE,W.DWORD,W.LPWSTR,C.POINTER(W.DWORD)]
k.CloseHandle.argtypes=[W.HANDLE]
rows=[]
callback=C.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
def visit(hwnd,_):
 title=C.create_unicode_buffer(512)
 u.GetWindowTextW(hwnd,title,512)
 if not any(s in title.value for s in ['Samewave Island','synthetic witness','synthetic background']):return True
 pid=W.DWORD()
 u.GetWindowThreadProcessId(hwnd,C.byref(pid))
 process=k.OpenProcess(0x1000,False,pid.value)
 path=C.create_unicode_buffer(32768)
 length=W.DWORD(len(path))
 if process:
  k.QueryFullProcessImageNameW(process,0,path,C.byref(length));k.CloseHandle(process)
 rect=W.RECT();u.GetWindowRect(hwnd,C.byref(rect))
 cls=C.create_unicode_buffer(256);u.GetClassNameW(hwnd,cls,256)
 dwm={}
 for attribute in [1,2,33,34,37,38]:
  value=W.DWORD()
  result=C.windll.dwmapi.DwmGetWindowAttribute(hwnd,attribute,C.byref(value),4)
  dwm[str(attribute)]={'hresult':result,'value':value.value}
 rows.append({'hwnd':int(hwnd),'pid':pid.value,'title':title.value,'class':cls.value,'path':path.value,'dwm':dwm,'backgroundBrush':hex(u.GetClassLongPtrW(hwnd,-10)),
              'visible':bool(u.IsWindowVisible(hwnd)),'rect':[rect.left,rect.top,rect.right,rect.bottom],
              'style':hex(u.GetWindowLongPtrW(hwnd,-16)&0xffffffff),'exStyle':hex(u.GetWindowLongPtrW(hwnd,-20)&0xffffffff)})
 return True
u.EnumWindows(callback(visit),0)
print(json.dumps(rows,ensure_ascii=False,indent=2))
