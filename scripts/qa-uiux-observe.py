"""Passive finite screen/rectangle sampling. This script never injects input."""
from pathlib import Path
import argparse, ctypes as C, ctypes.wintypes as W, json, time
from PIL import ImageGrab

parser=argparse.ArgumentParser()
parser.add_argument('--pid', type=int, required=True)
parser.add_argument('--seconds', type=float, default=8)
parser.add_argument('--output', type=Path, required=True)
args=parser.parse_args()
if not 0 < args.seconds <= 15: raise ValueError('Finite 15-second maximum')
user=C.windll.user32
user.SetProcessDPIAware()
user.GetWindowThreadProcessId.argtypes=[W.HWND,C.POINTER(W.DWORD)]
user.GetWindowRect.argtypes=[W.HWND,C.POINTER(W.RECT)]
user.GetDpiForWindow.argtypes=[W.HWND];user.GetDpiForWindow.restype=W.UINT
user.GetForegroundWindow.restype=W.HWND
matches=[]
@C.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
def enum(hwnd,_):
    pid=W.DWORD();user.GetWindowThreadProcessId(hwnd,C.byref(pid))
    title=C.create_unicode_buffer(256);user.GetWindowTextW(hwnd,title,256)
    if pid.value==args.pid and title.value=='Samewave Island':matches.append(hwnd)
    return True
user.EnumWindows(enum,0)
if len(matches)!=1: raise RuntimeError('Expected one island window belonging to verified PID')
hwnd=matches[0];args.output.mkdir(parents=True,exist_ok=True)
start=time.monotonic();rows=[]
while time.monotonic()-start < args.seconds:
    rect=W.RECT();assert user.GetWindowRect(hwnd,C.byref(rect))
    # Restrict captures to the prototype's retained canvas; no whole-desktop archive.
    image=ImageGrab.grab(bbox=(rect.left,rect.top,rect.right,rect.bottom),all_screens=True)
    name=f'frame-{len(rows):03}.png';image.save(args.output/name)
    rows.append(dict(ms=round((time.monotonic()-start)*1000,2),rect=[rect.left,rect.top,rect.right,rect.bottom],dpi=user.GetDpiForWindow(hwnd),foreground=int(user.GetForegroundWindow() or 0),image=name))
    time.sleep(.06)
report=dict(scope='Actual screen samples, not WebView screenshots or DWM present telemetry',pid=args.pid,hwnd=int(hwnd),frames=len(rows),windowRectChanges=sum(a['rect']!=b['rect'] for a,b in zip(rows,rows[1:])),rows=rows)
(args.output/'samples.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='rows'}))
