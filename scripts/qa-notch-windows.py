"""Synthetic-only native focus, region and click-through probe. Run while the demo app is open."""
import ctypes as C, ctypes.wintypes as W, json, time, urllib.request, pathlib, tkinter as tk
from PIL import ImageGrab
u=C.windll.user32; g=C.windll.gdi32; u.SetProcessDPIAware()
u.SetWindowPos.argtypes=[W.HWND,W.HWND,C.c_int,C.c_int,C.c_int,C.c_int,W.UINT];u.GetForegroundWindow.restype=W.HWND; u.GetAncestor.argtypes=[W.HWND,W.UINT];u.GetAncestor.restype=W.HWND;u.WindowFromPoint.argtypes=[W.POINT];u.WindowFromPoint.restype=W.HWND;u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)];u.GetWindowRgn.argtypes=[W.HWND,W.HRGN];g.CreateRectRgn.restype=W.HRGN;g.GetRgnBox.argtypes=[W.HRGN,C.POINTER(W.RECT)];g.DeleteObject.argtypes=[W.HANDLE]
rootdir=pathlib.Path(__file__).resolve().parent.parent; out=rootdir/'evidence'; out.mkdir(exist_ok=True); report={}; windows=[]
@C.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
def enum(h,l):
    s=C.create_unicode_buffer(512);u.GetWindowTextW(h,s,512)
    if s.value=='Samewave Island' and u.IsWindowVisible(h): windows.append(h)
    return True
u.EnumWindows(enum,0)
if not windows: raise RuntimeError('Visible native island not found')
h=windows[0]; wr=W.RECT();u.GetWindowRect(h,C.byref(wr)); old=W.POINT();u.GetCursorPos(C.byref(old)); x=max(0,(u.GetSystemMetrics(0)-1340)//2)
def post(p):
    req=urllib.request.Request('http://127.0.0.1:17321/api/push',data=json.dumps(p).encode(),headers={'Content-Type':'application/json'});return urllib.request.urlopen(req,timeout=3).read()
def geometry():
    r=g.CreateRectRgn(0,0,0,0);b=W.RECT();kind=u.GetWindowRgn(h,r);g.GetRgnBox(r,C.byref(b));g.DeleteObject(r);return {'kind':kind,'bounds':[b.left,b.top,b.right,b.bottom]}
def hit(px,py): return int(u.GetAncestor(u.WindowFromPoint(W.POINT(px,py)),2) or 0)
post({'type':'reset'});post({'type':'configure','settings':{'theme':'ink','engine':'gsap','shape':'notch','privacy':True,'reduced':False,'focus':False}})
r=tk.Tk();r.overrideredirect(True);r.geometry(f'1340x200+{x}+0');r.configure(bg='#eef2f5');clicks=[0]
def clicked(): clicks[0]+=1;button.configure(text=f'Background click-through: {clicks[0]} received')
button=tk.Button(r,text='Samewave native QA / background click target',command=clicked,font=('Segoe UI',14),bg='#e1ebe7',relief='flat');button.pack(fill='x',ipady=32);tk.Label(r,text='SYNTHETIC TEST WINDOW\n\nNotifications preserve the prior foreground window.\nNo clinical systems or patient information are used.',font=('Segoe UI',14),bg='#eef2f5',fg='#40534c',justify='left').pack(padx=36,pady=35,anchor='w')
def capture():
    assert hit(x+10,190)==report['witnessHwnd'], 'Synthetic capture area is not in front; screenshot cancelled'
    ImageGrab.grab(bbox=(x,0,x+1340,200),include_layered_windows=True).save(out/'notch-native-desktop.png')
    (out/'notch-native-window-checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    u.SetCursorPos(old.x,old.y);r.destroy();print(json.dumps(report))
def finish():
    report['backgroundClickReceived']=clicks[0]==1
    report['expandedRegion']=geometry()
    u.GetWindowRect(h,C.byref(wr));report['windowTop']=wr.top
    report['primaryCentered']=abs((wr.left+wr.right)/2-u.GetSystemMetrics(0)/2)<=.5
    assert report['backgroundClickReceived'] and report['outsideExcludesIsland'] and report['insideHitsIsland']
    assert report['routineFocusPreserved'] and report['criticalFocusPreserved']
    assert report['windowTop']==0 and report['primaryCentered']
    u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10)
    r.after(250,capture)
def critical():
    report['routineFocusPreserved']=int(u.GetForegroundWindow() or 0)==report['focusBefore'];post({'type':'demo','scenario':'critical'});r.after(1000,click_probe)
def click_probe():
    report['criticalFocusPreserved']=int(u.GetForegroundWindow() or 0)==report['focusBefore'];u.GetWindowRect(h,C.byref(wr));px=wr.left+5;py=wr.top+50;report['outsideHitRoot']=hit(px,py);report['outsideExcludesIsland']=hit(px,py)!=int(h);assert hit(px,py)==report['witnessHwnd'], 'Click target is not the synthetic witness; input cancelled';u.SetCursorPos(px,py);r.after(120,lambda:u.mouse_event(2,0,0,0,0));r.after(220,lambda:u.mouse_event(4,0,0,0,0));r.after(650,finish)
def start():
    r.deiconify();r.update_idletasks();rootH=u.GetAncestor(r.winfo_id(),2);u.ShowWindow(rootH,5);u.SetWindowPos(rootH,W.HWND(-1),x,0,1340,200,0x40|0x10);u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10);report['witnessHwnd']=int(rootH);report['witnessVisible']=bool(u.IsWindowVisible(rootH));report['focusBefore']=int(u.GetForegroundWindow() or 0);report['islandHwnd']=int(h);u.GetWindowRect(h,C.byref(wr));report['compactRegion']=geometry();b=report['compactRegion']['bounds'];report['insideHitsIsland']=hit(wr.left+(b[0]+b[2])//2,wr.top+(b[1]+b[3])//2)==int(h);post({'type':'demo','scenario':'service'});r.after(1340,critical)
r.after(1340,start);r.after(12000,lambda:r.destroy());r.mainloop()
