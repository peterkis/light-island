"""Read-only capture of the explicitly named synthetic source window, not the desktop."""
import ctypes as C, ctypes.wintypes as W, pathlib, json
from PIL import Image
u=C.windll.user32;g=C.windll.gdi32;u.SetProcessDPIAware()
u.FindWindowW.argtypes=[W.LPCWSTR,W.LPCWSTR];u.FindWindowW.restype=W.HWND
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)];u.GetWindowDC.argtypes=[W.HWND];u.GetWindowDC.restype=W.HDC
u.PrintWindow.argtypes=[W.HWND,W.HDC,W.UINT];u.ReleaseDC.argtypes=[W.HWND,W.HDC]
g.CreateCompatibleDC.argtypes=[W.HDC];g.CreateCompatibleDC.restype=W.HDC
g.CreateCompatibleBitmap.argtypes=[W.HDC,C.c_int,C.c_int];g.CreateCompatibleBitmap.restype=W.HBITMAP
g.SelectObject.argtypes=[W.HDC,W.HGDIOBJ];g.SelectObject.restype=W.HGDIOBJ
g.DeleteObject.argtypes=[W.HGDIOBJ];g.DeleteDC.argtypes=[W.HDC]
class Header(C.Structure):_fields_=[('size',W.DWORD),('width',W.LONG),('height',W.LONG),('planes',W.WORD),('bits',W.WORD),('compression',W.DWORD),('image',W.DWORD),('xppm',W.LONG),('yppm',W.LONG),('colors',W.DWORD),('important',W.DWORD)]
h=u.FindWindowW(None,'模拟来源边界 · 不连接真实临床系统');assert h,'Synthetic source window not found'
r=W.RECT();assert u.GetWindowRect(h,C.byref(r));w=r.right-r.left;v=r.bottom-r.top
src=u.GetWindowDC(h);dc=g.CreateCompatibleDC(src);bitmap=g.CreateCompatibleBitmap(src,w,v);old=g.SelectObject(dc,bitmap)
try:
 assert u.PrintWindow(h,dc,2),'PrintWindow failed'
 header=Header(C.sizeof(Header),w,-v,1,32,0,w*v*4,0,0,0,0);buf=C.create_string_buffer(w*v*4)
 g.GetDIBits.argtypes=[W.HDC,W.HBITMAP,W.UINT,W.UINT,C.c_void_p,C.c_void_p,W.UINT]
 assert g.GetDIBits(dc,bitmap,0,v,buf,C.byref(header),0)
 out=pathlib.Path(__file__).resolve().parent.parent/'evidence/clinical-20261004/native-source-window.png'
 Image.frombuffer('RGB',(w,v),buf.raw,'raw','BGRX',0,1).save(out)
 print(json.dumps({'windowFound':True,'size':[w,v],'path':str(out)}))
finally:g.SelectObject(dc,old);g.DeleteObject(bitmap);g.DeleteDC(dc);u.ReleaseDC(h,src)
