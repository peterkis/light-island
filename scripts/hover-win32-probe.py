"""Finite QA input/sampling on the prototype. No installed service or runtime polling."""
import ctypes as C, ctypes.wintypes as W, json, time, sys
u=C.windll.user32
u.SetProcessDPIAware()
u.FindWindowW.argtypes=[W.LPCWSTR,W.LPCWSTR];u.FindWindowW.restype=W.HWND
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)];u.GetCursorPos.argtypes=[C.POINTER(W.POINT)]
u.GetDpiForWindow.argtypes=[W.HWND];u.GetDpiForWindow.restype=W.UINT
u.GetForegroundWindow.restype=W.HWND
u.WindowFromPoint.argtypes=[W.POINT];u.WindowFromPoint.restype=W.HWND
u.GetAncestor.argtypes=[W.HWND,W.UINT];u.GetAncestor.restype=W.HWND
class Mouse(C.Structure): _fields_=[('dx',W.LONG),('dy',W.LONG),('data',W.DWORD),('flags',W.DWORD),('time',W.DWORD),('extra',C.c_size_t)]
class Input(C.Structure): _fields_=[('kind',W.DWORD),('mouse',Mouse)]
u.SendInput.argtypes=[W.UINT,C.POINTER(Input),C.c_int];u.SendInput.restype=W.UINT
h=u.FindWindowW(None,'Samewave Island')
if not h: raise RuntimeError('Prototype HWND not found')
def snapshot():
 r=W.RECT();p=W.POINT();assert u.GetWindowRect(h,C.byref(r));assert u.GetCursorPos(C.byref(p))
 return {'at':time.time()*1000,'rect':[r.left,r.top,r.right,r.bottom],'cursor':[p.x,p.y],'dpi':u.GetDpiForWindow(h),'foreground':int(u.GetForegroundWindow() or 0),'hitRoot':int(u.GetAncestor(u.WindowFromPoint(p),2) or 0),'hwnd':int(h)}
def move(x,y):
 vx,vy,vw,vh=[u.GetSystemMetrics(i) for i in [76,77,78,79]]
 i=Input(0,Mouse(round((x-vx)*65535/(vw-1)),round((y-vy)*65535/(vh-1)),0,0x8000|0x4000|0x1,0,0))
 assert u.SendInput(1,C.byref(i),C.sizeof(i))==1,'SendInput failed'
def click():
 for flag in [2,4]:
  i=Input(0,Mouse(0,0,0,flag,0,0));assert u.SendInput(1,C.byref(i),C.sizeof(i))==1;time.sleep(.06)
arg=json.loads(sys.argv[1]);op=arg['op']
if op=='move':
 old=snapshot()['cursor'];steps=arg.get('steps',1)
 for i in range(1,steps+1): move(round(old[0]+(arg['x']-old[0])*i/steps),round(old[1]+(arg['y']-old[1])*i/steps));time.sleep(arg.get('delay',.02))
 print(json.dumps(snapshot()))
elif op=='hold':
 rows=[];end=time.monotonic()+min(12,arg.get('seconds',5))
 while time.monotonic()<end: rows.append(snapshot());time.sleep(.025)
 print(json.dumps(rows))
elif op=='click': click();print(json.dumps(snapshot()))
else: print(json.dumps(snapshot()))
