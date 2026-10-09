//! Bounded reader protection. No mouse/keyboard polling and no clinical writes.
use std::{collections::HashMap,sync::{Mutex,OnceLock},time::Duration};
use futures_util::future::{AbortHandle,Abortable};
use tauri::{Emitter,WebviewWindow};
use serde_json::{json,Value};
#[derive(Default)]struct Lease{epoch:u64,clock:Option<AbortHandle>,session:u64,reading:bool}
static LEASES:OnceLock<Mutex<HashMap<String,Lease>>>=OnceLock::new();
fn leases()->&'static Mutex<HashMap<String,Lease>>{LEASES.get_or_init(||Mutex::new(HashMap::new()))}
fn ensure(w:&WebviewWindow)->Result<(),String>{if !["island","clinical-source"].contains(&w.label()){return Err("Reader window required".into());}Ok(())}
#[cfg(target_os="windows")]
#[link(name="user32")]extern "system"{fn SetWindowDisplayAffinity(hwnd:*mut std::ffi::c_void,value:u32)->i32;fn GetWindowDisplayAffinity(hwnd:*mut std::ffi::c_void,value:*mut u32)->i32;}
#[tauri::command]
pub fn clinical_capture(window:WebviewWindow,active:bool,epoch:u64)->Result<Value,String>{
 ensure(&window)?;
 let mut state=leases().lock().map_err(|_|"Reader lease unavailable")?;let lease=state.entry(window.label().into()).or_default();
 if epoch<lease.epoch{return Err("Superseded capture lease".into());}lease.epoch=epoch;
 #[cfg(target_os="windows")]unsafe{
  let hwnd=window.hwnd().map_err(|e|e.to_string())?;let mode=if active{0x11}else{0};
  if SetWindowDisplayAffinity(hwnd.0 as _,mode)==0&&(!active||SetWindowDisplayAffinity(hwnd.0 as _,1)==0){return Err("Window capture protection unavailable".into());}
  let mut actual=0;if GetWindowDisplayAffinity(hwnd.0 as _,&mut actual)==0||active&&actual==0{return Err("Capture protection was not applied".into());}
  // This command is reached only through explicit reader/source activation.
  if active{let _=window.set_focus();}
  return Ok(json!({"mode":if actual==0x11{"exclude"}else if actual==1{"monitor"}else{"none"},"epoch":epoch}));
 }
 #[cfg(not(target_os="windows"))]Err("Windows capture protection required".into())
}
#[tauri::command]
pub fn clinical_reader_clock(window:WebviewWindow,session:u64,remaining_ms:f64,paused:bool)->Result<(),String>{
 if window.label()!="island"||!remaining_ms.is_finite()||!(0.0..=60000.0).contains(&remaining_ms){return Err("Invalid bounded reader clock".into());}
 let mut state=leases().lock().map_err(|_|"Reader lease unavailable")?;let lease=state.entry(window.label().into()).or_default();
 if session<lease.session{return Err("Superseded reader clock".into());}
 if let Some(old)=lease.clock.take(){old.abort();}lease.session=session;lease.reading=remaining_ms>0.0;
 if paused||remaining_ms<=0.0{return Ok(());}
 let (abort,registration)=AbortHandle::new_pair();lease.clock=Some(abort);
 tauri::async_runtime::spawn(async move{let _=Abortable::new(async move{
  // Allow the ordinary 100ms UI tick to start the authored burn. A stalled renderer is hidden within 200ms.
  tokio::time::sleep(Duration::from_secs_f64(remaining_ms/1000.0)+Duration::from_millis(150)).await;
  let current=leases().lock().ok().and_then(|s|s.get("island").map(|l|l.session==session&&l.reading)).unwrap_or(false);
  if current{let _=window.hide();crate::clinical_shadow::hide();let _=window.emit("island://lab-expired",json!({"session":session}));}
 },registration).await;});Ok(())
}
pub fn reading()->bool{leases().lock().ok().and_then(|s|s.get("island").map(|l|l.reading)).unwrap_or(false)}
