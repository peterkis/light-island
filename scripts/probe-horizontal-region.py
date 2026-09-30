"""Read-only probe of our window region against WebView2 alpha coverage."""
import ctypes as C, ctypes.wintypes as W, json, sys
from PIL import Image
u=C.windll.user32;g=C.windll.gdi32;u.SetProcessDPIAware()
u.FindWindowW.argtypes=[W.LPCWSTR,W.LPCWSTR];u.FindWindowW.restype=W.HWND
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)];u.GetWindowRgn.argtypes=[W.HWND,W.HRGN]
g.CreateRectRgn.argtypes=[C.c_int]*4;g.CreateRectRgn.restype=W.HRGN
g.CreateRoundRectRgn.argtypes=[C.c_int]*6;g.CreateRoundRectRgn.restype=W.HRGN
g.PtInRegion.argtypes=[W.HRGN,C.c_int,C.c_int];g.PtInRegion.restype=W.BOOL
g.DeleteObject.argtypes=[W.HANDLE]
h=u.FindWindowW(None,'Samewave Island');assert h, 'Prototype window not found'
r=W.RECT();assert u.GetWindowRect(h,C.byref(r))
im=Image.open(sys.argv[1]).convert('RGBA');assert im.size==(r.right-r.left,r.bottom-r.top), 'Screenshot/physical window scale mismatch'
region=g.CreateRectRgn(0,0,0,0);assert u.GetWindowRgn(h,region)>0
bounds=im.getchannel('A').getbbox();assert bounds
x,y,right,bottom=bounds;legacy=g.CreateRoundRectRgn(x,y,right+1,bottom+1,bottom-y,bottom-y)
partial=0;clipped=0;legacy_clipped=0
for py in range(im.height):
 for px in range(im.width):
  alpha=im.getpixel((px,py))[3]
  if 0<alpha<255:
   partial+=1;clipped+=not bool(g.PtInRegion(region,px,py));legacy_clipped+=not bool(g.PtInRegion(legacy,px,py))
g.DeleteObject(region);g.DeleteObject(legacy)
report={'windowRect':[r.left,r.top,r.right,r.bottom],'alphaBounds':bounds,'partiallyCoveredPixels':partial,'clippedAntialiasPixels':clipped,'tightRegionClippedPixels':legacy_clipped,'topDocked':r.top==0 and y==0,'primaryCentered':abs((r.left+r.right)/2-u.GetSystemMetrics(0)/2)<=.5}
assert partial>0 and clipped==0 and report['topDocked'] and report['primaryCentered'], report
print(json.dumps(report))
