"""Read-only window inventory/capture for one ownership-verified synthetic QA PID."""
import ctypes as C
import ctypes.wintypes as W
import json
import pathlib
import sys

args = json.loads(sys.argv[1])
user = C.windll.user32
user.SetProcessDPIAware()
user.GetWindowThreadProcessId.argtypes = [W.HWND, C.POINTER(W.DWORD)]
user.GetWindowRect.argtypes = [W.HWND, C.POINTER(W.RECT)]
user.GetWindowTextW.argtypes = [W.HWND, W.LPWSTR, C.c_int]
user.GetForegroundWindow.restype = W.HWND
user.IsWindowVisible.argtypes = [W.HWND]
windows = []
callback_type = C.WINFUNCTYPE(W.BOOL, W.HWND, W.LPARAM)

@callback_type
def visit(hwnd, _):
    pid = W.DWORD()
    user.GetWindowThreadProcessId(hwnd, C.byref(pid))
    if pid.value != args['pid']:
        return True
    title = C.create_unicode_buffer(512)
    user.GetWindowTextW(hwnd, title, len(title))
    if not title.value:
        return True
    rect = W.RECT()
    user.GetWindowRect(hwnd, C.byref(rect))
    windows.append({'hwnd': int(hwnd), 'title': title.value, 'visible': bool(user.IsWindowVisible(hwnd)), 'foreground': hwnd == user.GetForegroundWindow(), 'rect': [rect.left, rect.top, rect.right, rect.bottom]})
    return True

user.EnumWindows(visit, 0)
result = {'pid': args['pid'], 'windows': windows, 'capture': 'NOT_REQUESTED'}
source = next((w for w in windows if w['title'].startswith('模拟来源边界') and w['visible']), None)
if 'capture' in args:
    path = pathlib.Path(args['capture']).resolve()
    evidence = pathlib.Path(__file__).resolve().parent.parent / 'evidence'
    if not path.is_relative_to(evidence.resolve()):
        raise RuntimeError('Capture path must stay inside project evidence')
    if source and source['foreground']:
        from PIL import ImageGrab
        ImageGrab.grab(bbox=tuple(source['rect']), include_layered_windows=True).save(path)
        result['capture'] = str(path)
    else:
        result['capture'] = 'NOT_RUN: owned source window is not visible and foreground'
print(json.dumps(result, ensure_ascii=False))
