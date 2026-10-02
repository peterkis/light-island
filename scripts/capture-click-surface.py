"""Finite, read-only screen sampling over our own synthetic witness. No mouse/keyboard input."""
import ctypes as C, ctypes.wintypes as W, pathlib, json, time, sys, tkinter as tk
from PIL import ImageGrab
u=C.windll.user32;u.SetProcessDPIAware()
u.FindWindowW.argtypes=[W.LPCWSTR,W.LPCWSTR];u.FindWindowW.restype=W.HWND
u.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)]
u.GetAncestor.argtypes=[W.HWND,W.UINT];u.GetAncestor.restype=W.HWND
u.WindowFromPoint.argtypes=[W.POINT];u.WindowFromPoint.restype=W.HWND
u.SetWindowPos.argtypes=[W.HWND,W.HWND,C.c_int,C.c_int,C.c_int,C.c_int,W.UINT]
h=u.FindWindowW(None,'Samewave Island');assert h,'Dedicated window not found'
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
width=min(1200,u.GetSystemMetrics(0));left=(u.GetSystemMetrics(0)-width)//2
r=tk.Tk();r.title('Samewave synthetic capture witness');r.overrideredirect(True)
r.geometry(f'{width}x120+{left}+0');r.configure(bg='#c2ced5');r.attributes('-topmost',True)
rows=[];pictures=[];began=0

def capture():
 global began
 root=u.GetAncestor(r.winfo_id(),2)
 if u.GetAncestor(u.WindowFromPoint(W.POINT(left+10,100)),2)!=root:
  rows.append({'error':'Witness covered; no screenshot taken'});r.destroy();return
 now=time.perf_counter();wr=W.RECT();u.GetWindowRect(h,C.byref(wr))
 image=ImageGrab.grab(bbox=(left,0,left+width,100),include_layered_windows=True)
 columns=[x for x in range(width) if max(image.getpixel((x,4))[:3])<80]
 rows.append({'at':time.time()*1000,'elapsed':now-began,'rect':[wr.left,wr.top,wr.right,wr.bottom],
  'centerPainted':max(image.getpixel((width//2,4))[:3])<80,
  'row4Bounds':[min(columns),max(columns)+1] if columns else None})
 pictures.append(image)
 if now-began<8:r.after(15,capture)
 else:r.destroy()
def start():
 global began
 r.update_idletasks();u.SetWindowPos(h,W.HWND(-1),0,0,0,0,0x1|0x2|0x10)
 (out/'ready.json').write_text(json.dumps({'at':time.time()*1000,'left':left,'width':width}),encoding='utf8')
 began=time.perf_counter();capture()
r.after(200,start);r.after(11000,r.destroy)
try:r.mainloop()
finally:
 for i,image in enumerate(pictures):image.save(out/f'frame-{i:04}.png')
 (out/'frames.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
 print(json.dumps({'frames':len(pictures),'folder':str(out)}))
