"""Finite native click-through/focus/paint probe over an owned synthetic witness only."""
import os
import ctypes as C, ctypes.wintypes as W, json, time, pathlib, urllib.request, tkinter as tk
from PIL import ImageGrab
u=C.windll.user32;u.SetProcessDPIAware()
u.FindWindowW.argtypes=[W.LPCWSTR,W.LPCWSTR];u.FindWindowW.restype=W.HWND
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)];u.GetCursorPos.argtypes=[C.POINTER(W.POINT)]
u.GetAncestor.argtypes=[W.HWND,W.UINT];u.GetAncestor.restype=W.HWND
u.WindowFromPoint.argtypes=[W.POINT];u.WindowFromPoint.restype=W.HWND
u.GetForegroundWindow.restype=W.HWND;u.SetForegroundWindow.argtypes=[W.HWND]
u.SetWindowPos.argtypes=[W.HWND,W.HWND,C.c_int,C.c_int,C.c_int,C.c_int,W.UINT]
class Mouse(C.Structure):_fields_=[('dx',W.LONG),('dy',W.LONG),('data',W.DWORD),('flags',W.DWORD),('time',W.DWORD),('extra',C.c_size_t)]
class Input(C.Structure):_fields_=[('kind',W.DWORD),('mouse',Mouse)]
u.SendInput.argtypes=[W.UINT,C.POINTER(Input),C.c_int];u.SendInput.restype=W.UINT
out=pathlib.Path(__file__).resolve().parent.parent/os.environ.get('ISLAND_QA_OUTPUT','evidence/clinical-20261004');out.mkdir(exist_ok=True,parents=True)
h=u.FindWindowW(None,'Samewave Island');assert h,'Native prototype required'
old=W.POINT();u.GetCursorPos(C.byref(old));width=min(900,u.GetSystemMetrics(0));left=(u.GetSystemMetrics(0)-width)//2
root=tk.Tk();root.title('Clinical Island synthetic witness');root.overrideredirect(True);root.geometry(f'{width}x590+{left}+0');root.configure(bg='#dbe5e8');root.attributes('-topmost',True)
clicks=[];report={'cases':[],'frames':[],'errors':[]};root.bind('<ButtonRelease-1>',lambda e:clicks.append([e.x_root,e.y_root]))
root_h=None;start_time=0;focus_before=None

def post(data):
 req=urllib.request.Request('http://127.0.0.1:17322/api/push',data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=3) as r:assert r.status==202

def rect():
 r=W.RECT();assert u.GetWindowRect(h,C.byref(r));return [r.left,r.top,r.right,r.bottom]

def hit(x,y):return int(u.GetAncestor(u.WindowFromPoint(W.POINT(x,y)),2) or 0)
def move(x,y):
 vx,vy,vw,vh=[u.GetSystemMetrics(i) for i in [76,77,78,79]]
 i=Input(0,Mouse(round((x-vx)*65535/(vw-1)),round((y-vy)*65535/(vh-1)),0,0x8000|0x4000|1,0,0));assert u.SendInput(1,C.byref(i),C.sizeof(i))==1

def click_case(name,x,y):
 assert hit(x,y)==root_h,'No input sent outside the owned witness'
 move(x,y)
 def down():
  p=W.POINT();u.GetCursorPos(C.byref(p));assert hit(p.x,p.y)==root_h,'Mouse moved outside witness; cancelled'
  for flag in [2,4]:
   i=Input(0,Mouse(0,0,0,flag,0,0));assert u.SendInput(1,C.byref(i),C.sizeof(i))==1
  report['cases'].append({'name':name,'point':[p.x,p.y],'target':root_h})
  root.after(120,lambda:u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10))
 root.after(60,down)

def capture():
 if hit(left+8,580)!=root_h:raise AssertionError('Witness covered; screen capture cancelled')
 assert hit(left+width//2,5)==int(h),'Native island is covered or hidden; capture failed'
 image=ImageGrab.grab(bbox=(left,0,left+width,560),include_layered_windows=True)
 report['frames'].append({'elapsed':time.monotonic()-start_time,'rect':rect(),'centerPainted':max(image.getpixel((width//2,5))[:3])<80})
 if len(report['frames']) in [1,14,36,60]:image.save(out/f'native-screen-{len(report["frames"]):03}.png')
 if not report['frames'][-1]['centerPainted']:
  report['frames'][-1]['centerPixel']=list(image.getpixel((width//2,5)))
  image.save(out/f'native-gap-{len(report["frames"]):03}.png')
 if time.monotonic()-start_time<5:root.after(30,capture)

def start():
 global root_h,start_time,focus_before
 root.update_idletasks();root_h=int(u.GetAncestor(root.winfo_id(),2));u.SetForegroundWindow(root_h);u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10)
 post({'type':'clinical:reset'});post({'type':'clinical:configure','settings':{'reduced':False,'textScale':1,'privacy':False,'role':'clinician','locked':False,'fullscreen':False}});move(left+10,550);focus_before=int(u.GetForegroundWindow() or 0)
 root.after(400,idle)
def idle():
 r=rect();report['baseline']=r;click_case('compact transparent canvas',r[0]+5,70)
 root.after(250,push_important)
 root.after(600,important)
def push_important():
 global focus_before
 focus_before=int(u.GetForegroundWindow() or 0)
 assert focus_before==root_h,'Synthetic witness did not receive focus before push'
 report['focusBeforePush']=focus_before
 post({'type':'clinical:scenario','scenario':'S03','stage':0})
def important():
 report['importantPreservesFocus']=int(u.GetForegroundWindow() or 0)==focus_before
 post({'type':'clinical:view','mode':'open','scenario':'S03'});root.after(800,expanded)
def expanded():
 r=rect();click_case('expanded shadow pixels remain click-through',(r[0]+r[2])//2+202,140)
 root.after(200,lambda:post({'type':'clinical:scenario','scenario':'S04','stage':0}))
 root.after(450,routine)
def routine():
 global start_time
 report['routinePreservesFocus']=int(u.GetForegroundWindow() or 0)==focus_before
 post({'type':'clinical:view','mode':'compact'});root.after(650,lambda:click_case('collapsed former details',u.GetSystemMetrics(0)//2,200))
 start_time=time.monotonic();root.after(750,capture)
 for i in range(6):root.after(1000+i*700,lambda i=i:post({'type':'clinical:view','mode':'open' if i%2==0 else 'compact','scenario':'S03'}))
 root.after(6200,finish)
def finish():
 report['receivedClicks']=clicks;report['blankFrames']=sum(not f['centerPainted'] for f in report['frames']);report['uniqueRects']=list({tuple(f['rect']) for f in report['frames']})
 assert len(clicks)==3 and report['importantPreservesFocus'] and report['routinePreservesFocus']
 assert report['blankFrames']==0 and len(report['uniqueRects'])==1
 report['pass']=True;root.destroy()
def callback_error(kind,value,trace):
 report['errors'].append(str(value));root.destroy()
root.report_callback_exception=callback_error;root.after(200,start);root.after(16000,root.destroy)
try:root.mainloop()
finally:
 move(old.x,old.y);(out/'native-click-focus.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='frames'}));
if not report.get('pass'):raise SystemExit(1)
