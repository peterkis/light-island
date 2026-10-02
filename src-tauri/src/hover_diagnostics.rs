//! Opt-in bounded, memory-only evidence. Never enabled on a normal launch.
use serde_json::{json, Value};
use std::{collections::VecDeque, sync::{Mutex, OnceLock}, time::{SystemTime, UNIX_EPOCH}};
use tauri::WebviewWindow;
static ENABLED: OnceLock<bool> = OnceLock::new();
static EVENTS: Mutex<VecDeque<Value>> = Mutex::new(VecDeque::new());
pub fn enabled() -> bool { *ENABLED.get_or_init(|| std::env::args().any(|a| a == "--hover-diagnostics")) }
#[cfg(target_os = "windows")]
#[repr(C)] #[derive(Default)] struct Rect { left:i32, top:i32, right:i32, bottom:i32 }
#[cfg(target_os = "windows")]
#[repr(C)] #[derive(Default)] struct Point { x:i32, y:i32 }
#[cfg(target_os = "windows")]
#[link(name="user32")]
extern "system" {
 fn GetWindowRect(h: *mut std::ffi::c_void, r: *mut Rect) -> i32;
 fn GetCursorPos(p: *mut Point) -> i32;
 fn GetDpiForWindow(h: *mut std::ffi::c_void) -> u32;
}
pub fn record(window: &WebviewWindow, kind: &str, detail: Value) {
 if !enabled() { return; }
 let mut row=json!({"at":SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs_f64()*1000.0,"kind":kind,"detail":detail});
 #[cfg(target_os = "windows")]
 if let Ok(h)=window.hwnd() { unsafe {
  let mut r=Rect::default(); let mut p=Point::default();
  if GetWindowRect(h.0 as _, &mut r)!=0 { row["rect"]=json!([r.left,r.top,r.right,r.bottom]); }
  if GetCursorPos(&mut p)!=0 { row["cursor"]=json!([p.x,p.y]); }
  row["dpi"]=json!(GetDpiForWindow(h.0 as _));
 }}
 if let Ok(mut events)=EVENTS.lock() {
  let seq=events.back().and_then(|r| r["seq"].as_u64()).unwrap_or(0)+1;
  row["seq"]=json!(seq);
  if events.len()>=8192 { events.pop_front(); }
  events.push_back(row);
 }
}
#[tauri::command]
pub fn hover_diagnostics(window: WebviewWindow, clear: bool) -> Result<Value,String> {
 if window.label()!="island" { return Err("Only the island can read its geometry diagnostics".into()); }
 if !enabled() { return Ok(json!({"enabled":false,"events":[]})); }
 record(&window,"snapshot",json!({}));
 let mut rows=EVENTS.lock().map_err(|_| "Diagnostics unavailable")?;
 let result=json!({"enabled":true,"events":*rows});
 if clear { rows.clear(); }
 Ok(result)
}
