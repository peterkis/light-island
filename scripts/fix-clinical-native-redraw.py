from pathlib import Path
p=Path(__file__).resolve().parent.parent/'src-tauri/src/clinical_window.rs'
s=p.read_text(encoding='utf8')
old='ffi::SetWindowRgn(hwnd.0 as _,region,1)'
assert s.count(old)==1
s=s.replace(old,'ffi::SetWindowRgn(hwnd.0 as _,region,0)')
s=s.replace('  if equal{ffi::DeleteObject(region);}', '  // The stable WebView repaints its SVG/content after this command. Avoid a second\n  // immediate whole-window redraw while DWM and WebView are handing off the surface.\n  if equal{ffi::DeleteObject(region);}')
p.write_text(s,encoding='utf8')
print('Native region updates no longer request an extra immediate whole-window repaint.')
