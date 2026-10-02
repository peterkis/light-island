use crate::{hover_diagnostics::record, notch_geometry::{plan, local_x, PixelRect, EpochGuard}};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{ffi::c_void, sync::Mutex};
use tauri::WebviewWindow;
#[cfg(not(target_os = "windows"))]
use tauri::{PhysicalPosition, PhysicalSize};

// These commands intentionally remain synchronous: Tauri executes them on the UI thread.
// The guard rejects late IPC deliveries; no new worker or scheduling framework is involved.
static GUARD: Mutex<EpochGuard> = Mutex::new(EpochGuard { epoch: 0, sequence: 0, closed: false });
#[derive(Serialize)]
pub struct Metrics { available: f64, scale: f64, width: f64, height: f64 }
#[derive(Deserialize)]
pub struct Outline { width: f64, height: f64, points: Vec<[f64; 2]> }

#[cfg(target_os = "windows")]
mod ffi {
    use super::c_void;
    #[repr(C)] #[derive(Default)] pub struct Point { pub x: i32, pub y: i32 }
    #[repr(C)] #[derive(Default)] pub struct Rect { pub left:i32, pub top:i32, pub right:i32, pub bottom:i32 }
    #[link(name = "user32")]
    extern "system" {
        pub fn SetWindowPos(hwnd: *mut c_void, after: *mut c_void, x: i32, y: i32, w: i32, h: i32, flags: u32) -> i32;
        pub fn SetWindowRgn(hwnd: *mut c_void, region: *mut c_void, redraw: i32) -> i32;
        pub fn GetWindowRgn(hwnd: *mut c_void, region: *mut c_void) -> i32;
        pub fn GetWindowRect(hwnd: *mut c_void, rect: *mut Rect) -> i32;
        pub fn GetClientRect(hwnd: *mut c_void, rect: *mut Rect) -> i32;
        pub fn GetCursorPos(point: *mut Point) -> i32;
        pub fn GetDpiForWindow(hwnd: *mut c_void) -> u32;
        pub fn WindowFromPoint(point: Point) -> *mut c_void;
        pub fn GetAncestor(hwnd: *mut c_void, flags: u32) -> *mut c_void;
        pub fn ShowWindow(hwnd: *mut c_void, cmd: i32) -> i32;
        pub fn IsWindowVisible(hwnd: *mut c_void) -> i32;
    }
    #[link(name = "gdi32")]
    extern "system" {
        pub fn CreateRectRgn(x: i32, y: i32, right: i32, bottom: i32) -> *mut c_void;
        pub fn CreatePolygonRgn(points: *const Point, count: i32, mode: i32) -> *mut c_void;
        pub fn CombineRgn(destination: *mut c_void, a: *mut c_void, b: *mut c_void, mode: i32) -> i32;
        pub fn EqualRgn(a: *mut c_void, b: *mut c_void) -> i32;
        pub fn PtInRegion(region: *mut c_void, x:i32, y:i32) -> i32;
        pub fn DeleteObject(object: *mut c_void) -> i32;
    }
}
fn ensure_island(window: &WebviewWindow) -> Result<(), String> {
    if window.label() != "island" { return Err("Only the island may change its native geometry".into()); } Ok(())
}
fn validate_canvas(width:f64, height:f64) -> Result<(),String> {
    if !width.is_finite() || !height.is_finite() || !(1.0..=1120.0).contains(&width) || !(1.0..=100.0).contains(&height) {
        return Err("Envelope outside the bounded notification strip".into());
    } Ok(())
}
fn validate_outline(o:&Outline) -> Result<(),String> {
    if !o.width.is_finite() || !o.height.is_finite() || !(1.0..=1080.0).contains(&o.width) || !(1.0..=64.0).contains(&o.height)
        || !(4..=128).contains(&o.points.len()) || o.points.iter().any(|p| !p[0].is_finite() || !p[1].is_finite() || p[0] < 0.0 || p[0] > o.width + 0.01 || p[1] < 0.0 || p[1] > o.height + 0.01) {
        return Err("Invalid notch silhouette".into());
    } Ok(())
}
#[tauri::command]
pub fn island_metrics(window: WebviewWindow) -> Result<Metrics, String> {
    ensure_island(&window)?;
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?.ok_or("Primary monitor unavailable")?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = monitor.scale_factor();
    Ok(Metrics { available: monitor.size().width as f64 / scale, scale, width: size.width as f64 / scale, height: size.height as f64 / scale })
}
fn envelope(window: &WebviewWindow, width: f64, height: f64) -> Result<(f64, PixelRect), String> {
    validate_canvas(width,height)?;
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?.ok_or("Primary monitor unavailable")?;
    let s = monitor.scale_factor(); let p = monitor.position();
    let desired=plan(width,height,s,p.x,p.y,monitor.size().width);
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let mut old=ffi::Rect::default();
        if ffi::GetWindowRect(hwnd.0 as _,&mut old)==0 { return Err("GetWindowRect failed".into()); }
        let actual=PixelRect{x:old.left,y:old.top,width:(old.right-old.left) as u32,height:(old.bottom-old.top) as u32};
        if actual!=desired {
            record(window,"set-window-pos-before",json!({"desired":[desired.x,desired.y,desired.width,desired.height]}));
            if ffi::SetWindowPos(hwnd.0 as _, -1isize as _, desired.x, desired.y, desired.width as i32, desired.height as i32, 0x0010 | 0x0200)==0 {
                return Err(format!("SetWindowPos: {}",std::io::Error::last_os_error()));
            }
            record(window,"set-window-pos-after",json!({}));
        } else { record(window,"set-window-pos-skipped",json!({})); }
    }
    #[cfg(not(target_os = "windows"))]
    { window.set_size(PhysicalSize::new(desired.width,desired.height)).map_err(|e|e.to_string())?; window.set_position(PhysicalPosition::new(desired.x,desired.y)).map_err(|e|e.to_string())?; }
    Ok((s,desired))
}
#[cfg(target_os = "windows")]
unsafe fn install_region(window:&WebviewWindow, region:*mut c_void) -> Result<(),String> {
    if region.is_null() { return Err("Cannot create native region".into()); }
    let hwnd=match window.hwnd() { Ok(h)=>h, Err(e)=>{ffi::DeleteObject(region);return Err(e.to_string());} };
    let old=ffi::CreateRectRgn(0,0,0,0);
    let equal=!old.is_null() && ffi::GetWindowRgn(hwnd.0 as _,old)>0 && ffi::EqualRgn(old,region)!=0;
    if !old.is_null() { ffi::DeleteObject(old); }
    if equal { ffi::DeleteObject(region); }
    else if ffi::SetWindowRgn(hwnd.0 as _,region,1)==0 { ffi::DeleteObject(region);return Err("SetWindowRgn failed".into()); }
    // On success the OS, not this process, owns region. Equal/failed temporaries are ours to free.
    Ok(())
}
fn apply_outline(window:&WebviewWindow, o:&Outline, previous:Option<&Outline>) -> Result<(),String> {
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd=window.hwnd().map_err(|e|e.to_string())?;
        let mut client=ffi::Rect::default();
        if ffi::GetClientRect(hwnd.0 as _,&mut client)==0 { return Err("Client geometry unavailable".into()); }
        let scale=ffi::GetDpiForWindow(hwnd.0 as _) as f64/96.0;
        if scale<=0.0 { return Err("Window DPI unavailable".into()); }
        // Offset in the ACTUAL retained canvas, not target.width+8 or a cached CSS viewport.
        // Current and next painted silhouettes overlap only during a finite frame handoff.
        let region=ffi::CreateRectRgn(0,0,0,0);
        if region.is_null() { return Err("Cannot create silhouette region".into()); }
        for outline in std::iter::once(o).chain(previous) {
        let x=local_x((client.right-client.left) as u32,outline.width,scale);
        for dy in -2..=2 { for dx in -2..=2 {
            let points:Vec<ffi::Point>=outline.points.iter().map(|p|ffi::Point{x:(x+p[0]*scale).round() as i32+dx,y:(p[1]*scale).round() as i32+dy}).collect();
            let part=ffi::CreatePolygonRgn(points.as_ptr(),points.len() as i32,2);
            if part.is_null() { ffi::DeleteObject(region);return Err("Cannot create AA fringe".into()); }
            let ok=ffi::CombineRgn(region,region,part,2);ffi::DeleteObject(part);
            if ok==0 { ffi::DeleteObject(region);return Err("Cannot combine silhouette".into()); }
        }}}
        install_region(window,region)?;
    }
    Ok(())
}
#[tauri::command]
pub fn resize_island_window(window:WebviewWindow,epoch:u64,width:f64,height:f64,outline:Option<Outline>) -> Result<(),String> {
    ensure_island(&window)?;validate_canvas(width,height)?;
    if let Some(o)=&outline {validate_outline(o)?;if o.width>width || o.height>height {return Err("Silhouette exceeds canvas".into());}}
    record(&window,"begin-received",json!({"epoch":epoch,"width":width,"height":height,"silhouette":outline.is_some()}));
    if !GUARD.lock().map_err(|_| "Epoch unavailable")?.begin(epoch) {record(&window,"begin-stale",json!({"epoch":epoch}));return Ok(());}
    let (_,canvas)=envelope(&window,width,height)?;
    if let Some(o)=outline { apply_outline(&window,&o,None)?; }
    else {
        // Message transitions retain the pre-existing narrow envelope policy. Compact never uses it.
        #[cfg(target_os = "windows")]
        unsafe { install_region(&window,ffi::CreateRectRgn(0,0,canvas.width as i32,canvas.height as i32))?; }
    }
    record(&window,"begin-applied",json!({"epoch":epoch}));Ok(())
}
#[tauri::command]
pub fn update_island_region(window:WebviewWindow,epoch:u64,sequence:u64,width:f64,height:f64,points:Vec<[f64;2]>,previous:Option<Outline>) -> Result<(),String> {
    ensure_island(&window)?;let o=Outline{width,height,points};validate_outline(&o)?;
    if let Some(old)=&previous { validate_outline(old)?; }
    if !GUARD.lock().map_err(|_| "Epoch unavailable")?.frame(epoch,sequence) {record(&window,"region-stale",json!({"epoch":epoch,"sequence":sequence}));return Ok(());}
    apply_outline(&window,&o,previous.as_ref())?;
    record(&window,"region-applied",json!({"epoch":epoch,"sequence":sequence,"width":width,"height":height}));Ok(())
}
#[tauri::command]
pub fn commit_island_geometry(window:WebviewWindow,epoch:u64,width:f64,height:f64,points:Vec<[f64;2]>,canvas_width:f64,canvas_height:f64) -> Result<(),String> {
    ensure_island(&window)?;validate_canvas(canvas_width,canvas_height)?;
    let o=Outline{width,height,points};validate_outline(&o)?;
    if width>canvas_width || height>canvas_height {return Err("Silhouette exceeds canvas".into());}
    record(&window,"commit-received",json!({"epoch":epoch,"width":width,"height":height,"canvas":[canvas_width,canvas_height]}));
    if !GUARD.lock().map_err(|_| "Epoch unavailable")?.commit(epoch) {record(&window,"commit-stale",json!({"epoch":epoch}));return Ok(());}
    envelope(&window,canvas_width,canvas_height)?;apply_outline(&window,&o,None)?;
    #[cfg(target_os = "windows")]
    unsafe { let h=window.hwnd().map_err(|e|e.to_string())?; if ffi::IsWindowVisible(h.0 as _)==0 { ffi::ShowWindow(h.0 as _,4); } }
    record(&window,"commit-applied",json!({"epoch":epoch}));Ok(())
}
#[tauri::command]
pub fn cancel_island_transition(window:WebviewWindow,epoch:u64) -> Result<(),String> {
    ensure_island(&window)?;GUARD.lock().map_err(|_| "Epoch unavailable")?.cancel(epoch);
    record(&window,"cancel",json!({"epoch":epoch}));Ok(())
}
#[derive(Serialize)]
pub struct PointerStatus { inside: bool, x: f64, y: f64 }
#[tauri::command]
pub fn island_pointer_inside(window:WebviewWindow) -> Result<PointerStatus,String> {
    ensure_island(&window)?;
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd=window.hwnd().map_err(|e|e.to_string())?;let mut p=ffi::Point::default();let mut r=ffi::Rect::default();
        if ffi::GetCursorPos(&mut p)==0 || ffi::GetWindowRect(hwnd.0 as _,&mut r)==0 {return Err("Pointer position unavailable".into());}
        let x=p.x-r.left;let y=p.y-r.top;
        let scale=ffi::GetDpiForWindow(hwnd.0 as _) as f64/96.0;
        if scale<=0.0 { return Err("Window DPI unavailable".into()); }
        let mut result=PointerStatus { inside:false, x:x as f64/scale, y:y as f64/scale };
        if ffi::GetAncestor(ffi::WindowFromPoint(p),2)!=hwnd.0 as _ {return Ok(result);}
        let region=ffi::CreateRectRgn(0,0,0,0);if region.is_null(){return Err("Cannot inspect hit region".into());}
        let inside=ffi::GetWindowRgn(hwnd.0 as _,region)>0&&ffi::PtInRegion(region,x,y)!=0;ffi::DeleteObject(region);
        result.inside=inside;record(&window,"pointer-check",json!({"inside":inside}));return Ok(result);
    }
    #[cfg(not(target_os = "windows"))] Ok(PointerStatus { inside:false,x:0.0,y:0.0 })
}
pub fn redock(window:&WebviewWindow) -> Result<(),String> {
    let m=island_metrics(window.clone())?;envelope(window,m.width.clamp(1.0,1120.0),m.height.clamp(1.0,100.0))?;Ok(())
}
