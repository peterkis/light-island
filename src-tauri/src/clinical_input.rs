//! Desktop outside-click and registered-shortcut handling. No keyboard capture or input suppression.
use std::sync::{OnceLock,atomic::{AtomicBool,AtomicIsize,AtomicU32,Ordering}};
use tauri::{AppHandle,Emitter,Manager};
use serde_json::{json,Value};
static APP:OnceLock<AppHandle>=OnceLock::new();
static HWND:AtomicIsize=AtomicIsize::new(0);
static EXPANDED:AtomicBool=AtomicBool::new(false);
static THREAD:AtomicU32=AtomicU32::new(0);
static HOTKEY:AtomicBool=AtomicBool::new(false);
static POINTER_HOOK:AtomicBool=AtomicBool::new(false);
pub fn set_surface(hwnd:isize,expanded:bool){HWND.store(hwnd,Ordering::Relaxed);EXPANDED.store(expanded,Ordering::Relaxed);}
#[cfg(target_os="windows")]
mod ffi{
 use std::ffi::c_void;
 #[repr(C)]#[derive(Clone,Copy,Default)]pub struct Point{pub x:i32,pub y:i32}
 #[repr(C)]#[derive(Default)]pub struct Msg{pub hwnd:*mut c_void,pub message:u32,pub w:usize,pub l:isize,pub time:u32,pub point:Point,pub private:u32}
 #[repr(C)]pub struct Mouse{pub point:Point,pub data:u32,pub flags:u32,pub time:u32,pub extra:usize}
 #[link(name="user32")]extern "system"{
  pub fn SetWindowsHookExW(kind:i32,callback:Option<unsafe extern "system" fn(i32,usize,isize)->isize>,module:*mut c_void,thread:u32)->*mut c_void;
  pub fn UnhookWindowsHookEx(h:*mut c_void)->i32;
  pub fn CallNextHookEx(h:*mut c_void,code:i32,w:usize,l:isize)->isize;
  pub fn WindowFromPoint(p:Point)->*mut c_void;
  pub fn GetForegroundWindow()->*mut c_void;
  pub fn GetAncestor(h:*mut c_void,flag:u32)->*mut c_void;
  pub fn PostThreadMessageW(thread:u32,message:u32,w:usize,l:isize)->i32;
  pub fn GetMessageW(m:*mut Msg,h:*mut c_void,min:u32,max:u32)->i32;
  pub fn TranslateMessage(m:*const Msg)->i32;
  pub fn DispatchMessageW(m:*const Msg)->isize;
  pub fn RegisterHotKey(h:*mut c_void,id:i32,modifiers:u32,key:u32)->i32;
  pub fn UnregisterHotKey(h:*mut c_void,id:i32)->i32;
  pub fn SetWinEventHook(min:u32,max:u32,module:*mut c_void,callback:Option<unsafe extern "system" fn(*mut c_void,u32,*mut c_void,i32,i32,u32,u32)>,process:u32,thread:u32,flags:u32)->*mut c_void;
  pub fn UnhookWinEvent(h:*mut c_void)->i32;
  pub fn SystemParametersInfoW(action:u32,param:u32,data:*mut c_void,flags:u32)->i32;
 }
 #[link(name="kernel32")]extern "system"{pub fn GetCurrentThreadId()->u32;pub fn GetModuleHandleW(name:*const u16)->*mut c_void;}
 #[link(name="shell32")]extern "system"{pub fn SHQueryUserNotificationState(state:*mut i32)->i32;}
}
#[cfg(target_os="windows")]
unsafe extern "system" fn mouse(code:i32,w:usize,l:isize)->isize{
 if code>=0&&w==0x0202&&EXPANDED.load(Ordering::Relaxed){
  let event=&*(l as *const ffi::Mouse);
  let top=ffi::GetAncestor(ffi::WindowFromPoint(event.point),2) as isize;
  if top!=HWND.load(Ordering::Relaxed){ffi::PostThreadMessageW(THREAD.load(Ordering::Relaxed),0x8001,0,0);}
 }
 // Always forward. No coordinates are retained and no background click is swallowed.
 ffi::CallNextHookEx(std::ptr::null_mut(),code,w,l)
}
#[cfg(target_os="windows")]
unsafe extern "system" fn foreground(_: *mut std::ffi::c_void,_:u32,_:*mut std::ffi::c_void,_:i32,_:i32,_:u32,_:u32){
 ffi::PostThreadMessageW(THREAD.load(Ordering::Relaxed),0x8002,0,0);
}
pub fn status()->Value{
 let mut state=0_i32;let mut animated=1_i32;
 #[cfg(target_os="windows")]unsafe{ffi::SHQueryUserNotificationState(&mut state);ffi::SystemParametersInfoW(0x1042,0,&mut animated as *mut i32 as _,0);}
 json!({"notificationState":state,"animationsEnabled":animated!=0,"outsideClickAvailable":POINTER_HOOK.load(Ordering::Relaxed),"shortcutRegistered":HOTKEY.load(Ordering::Relaxed)})
}
#[tauri::command]
pub fn clinical_platform_status(window:tauri::WebviewWindow)->Result<Value,String>{if !["island","studio"].contains(&window.label()){return Err("Prototype window required".into());}Ok(status())}
pub fn start(app:AppHandle){
 if APP.set(app).is_err(){return;}
 #[cfg(target_os="windows")]
 std::thread::spawn(||unsafe{
  THREAD.store(ffi::GetCurrentThreadId(),Ordering::Relaxed);
  let null=std::ptr::null_mut();
  let hook=ffi::SetWindowsHookExW(14,Some(mouse),ffi::GetModuleHandleW(std::ptr::null()),0);
  POINTER_HOOK.store(!hook.is_null(),Ordering::Relaxed);
  HOTKEY.store(ffi::RegisterHotKey(null,0x531,0x0001|0x0002|0x4000,0x20)!=0,Ordering::Relaxed);
  let event=ffi::SetWinEventHook(3,3,null,Some(foreground),0,0,2);
  let mut message=ffi::Msg::default();
  while ffi::GetMessageW(&mut message,null,0,0)>0{
   if let Some(app)=APP.get(){match message.message{
    0x8001=>{if EXPANDED.load(Ordering::Relaxed){let _=app.emit_to("island","island://outside",());}},
    0x8002=>{let _=app.emit_to("island","island://platform",status());if crate::reader_native::reading()&&ffi::GetForegroundWindow() as isize!=HWND.load(Ordering::Relaxed){let _=app.emit_to("island","island://lab-blur",());}},
    0x0312=>{if let Some(w)=app.get_webview_window("island"){let _=w.show();let _=w.set_focus();let _=w.emit("island://shortcut",());}},
    _=>{}
   }}
   ffi::TranslateMessage(&message);ffi::DispatchMessageW(&message);
  }
  if !hook.is_null(){ffi::UnhookWindowsHookEx(hook);}
  if !event.is_null(){ffi::UnhookWinEvent(event);}
  ffi::UnregisterHotKey(null,0x531);
  HOTKEY.store(false,Ordering::Relaxed);POINTER_HOOK.store(false,Ordering::Relaxed);
 });
}
pub fn stop(){
 #[cfg(target_os="windows")]unsafe{
  let thread=THREAD.load(Ordering::Relaxed);
  if thread!=0{ffi::PostThreadMessageW(thread,0x0012,0,0);}
 }
}
