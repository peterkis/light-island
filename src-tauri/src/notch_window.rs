use serde::Serialize;
use std::{ffi::c_void, sync::atomic::{AtomicU64, Ordering}};
use tauri::WebviewWindow;
#[cfg(not(target_os = "windows"))]
use tauri::{PhysicalPosition, PhysicalSize};

static EPOCH: AtomicU64 = AtomicU64::new(0);
#[derive(Serialize)]
pub struct Metrics { available: f64, scale: f64, width: f64, height: f64 }

#[cfg(target_os = "windows")]
mod ffi {
    use super::c_void;
    #[repr(C)] pub struct Point { pub x: i32, pub y: i32 }
    #[link(name = "user32")]
    extern "system" {
        pub fn SetWindowPos(hwnd: *mut c_void, after: *mut c_void, x: i32, y: i32, w: i32, h: i32, flags: u32) -> i32;
        pub fn SetWindowRgn(hwnd: *mut c_void, region: *mut c_void, redraw: i32) -> i32;
        pub fn ShowWindow(hwnd: *mut c_void, cmd: i32) -> i32;
        pub fn IsWindowVisible(hwnd: *mut c_void) -> i32;
    }
    #[link(name = "gdi32")]
    extern "system" {
        pub fn CreateRectRgn(x: i32, y: i32, right: i32, bottom: i32) -> *mut c_void;
        pub fn CreatePolygonRgn(points: *const Point, count: i32, mode: i32) -> *mut c_void;
        pub fn CombineRgn(destination: *mut c_void, a: *mut c_void, b: *mut c_void, mode: i32) -> i32;
        pub fn DeleteObject(object: *mut c_void) -> i32;
    }
}
fn ensure_island(window: &WebviewWindow) -> Result<(), String> {
    if window.label() != "island" { return Err("Only the island may change its native geometry".into()); } Ok(())
}
#[tauri::command]
pub fn island_metrics(window: WebviewWindow) -> Result<Metrics, String> {
    ensure_island(&window)?;
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?.ok_or("Primary monitor unavailable")?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = monitor.scale_factor();
    Ok(Metrics { available: monitor.size().width as f64 / scale, scale, width: size.width as f64 / scale, height: size.height as f64 / scale })
}
/** Primary monitor policy is authoritative; callers cannot relocate the overlay arbitrarily. */
fn envelope(window: &WebviewWindow, width: f64, height: f64) -> Result<(f64, u32), String> {
    if !width.is_finite() || !height.is_finite() || !(1.0..=1120.0).contains(&width) || !(1.0..=100.0).contains(&height) {
        return Err("Envelope outside the bounded notification strip".into());
    }
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?.ok_or("Primary monitor unavailable")?;
    let s = monitor.scale_factor(); let p = monitor.position(); let size = monitor.size();
    let w = ((width * s).ceil() as u32).min(size.width).max(1);
    let h = ((height * s).ceil() as u32).max(1);
    let x = p.x + ((size.width - w) / 2) as i32;
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        // One atomic geometry call, SWP_NOACTIVATE. No set_focus, and no per-frame HWND resize.
        if ffi::SetWindowPos(hwnd.0 as _, -1isize as _, x, p.y, w as i32, h as i32, 0x0010 | 0x0200) == 0 {
            return Err(format!("SetWindowPos: {}", std::io::Error::last_os_error()));
        }
    }
    #[cfg(not(target_os = "windows"))]
    { window.set_size(PhysicalSize::new(w, h)).map_err(|e| e.to_string())?; window.set_position(PhysicalPosition::new(x, p.y)).map_err(|e| e.to_string())?; }
    Ok((s, w))
}
#[tauri::command]
pub fn resize_island_window(window: WebviewWindow, epoch: u64, width: f64, height: f64) -> Result<(), String> {
    ensure_island(&window)?;
    if epoch < EPOCH.load(Ordering::SeqCst) { return Ok(()); }
    // Validate before advancing the epoch, so malformed calls cannot cancel a valid transition.
    if !width.is_finite() || !height.is_finite() || !(1.0..=1120.0).contains(&width) || !(1.0..=100.0).contains(&height) { return Err("Invalid envelope".into()); }
    EPOCH.store(epoch, Ordering::SeqCst);
    let (scale, w) = envelope(&window, width, height)?;
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        // A conservative thin envelope during morphing prevents alpha clipping and IPC-frame races.
        // At rest commit_island_geometry reduces both HWND size and its hit region to the silhouette.
        let region = ffi::CreateRectRgn(0, 0, w as i32, (height * scale).ceil() as i32);
        if region.is_null() { return Err("CreateRectRgn failed".into()); }
        if ffi::SetWindowRgn(hwnd.0 as _, region, 1) == 0 { ffi::DeleteObject(region); return Err("SetWindowRgn failed".into()); }
    }
    Ok(())
}
#[tauri::command]
pub fn commit_island_geometry(window: WebviewWindow, epoch: u64, width: f64, height: f64, points: Vec<[f64; 2]>) -> Result<(), String> {
    ensure_island(&window)?;
    if epoch != EPOCH.load(Ordering::SeqCst) { return Ok(()); }
    if !width.is_finite() || !height.is_finite() || !(1.0..=1080.0).contains(&width) || !(1.0..=64.0).contains(&height)
        || !(4..=128).contains(&points.len()) || points.iter().any(|p| !p[0].is_finite() || !p[1].is_finite() || p[0] < 0.0 || p[0] > width + 0.01 || p[1] < 0.0 || p[1] > height + 0.01) {
        return Err("Invalid notch silhouette".into());
    }
    let (scale, canvas_width) = envelope(&window, width + 8.0, height + 4.0)?;
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let x = (canvas_width as f64 - width * scale) / 2.0;
        let region = ffi::CreateRectRgn(0, 0, 0, 0);
        if region.is_null() { return Err("Cannot create silhouette region".into()); }
        // Dilation by two PHYSICAL pixels preserves SVG AA at 100/125/150/200% alike.
        // Successful SetWindowRgn owns its HRGN; every temporary and every failed HRGN is released.
        for dy in -2..=2 { for dx in -2..=2 {
            let native: Vec<ffi::Point> = points.iter().map(|p| ffi::Point { x: (x + p[0] * scale).round() as i32 + dx, y: (p[1] * scale).round() as i32 + dy }).collect();
            let part = ffi::CreatePolygonRgn(native.as_ptr(), native.len() as i32, 2);
            if part.is_null() { ffi::DeleteObject(region); return Err("Cannot create AA fringe".into()); }
            let ok = ffi::CombineRgn(region, region, part, 2); ffi::DeleteObject(part);
            if ok == 0 { ffi::DeleteObject(region); return Err("Cannot combine silhouette".into()); }
        }}
        if ffi::SetWindowRgn(hwnd.0 as _, region, 1) == 0 { ffi::DeleteObject(region); return Err("Cannot commit silhouette".into()); }
        if ffi::IsWindowVisible(hwnd.0 as _) == 0 { ffi::ShowWindow(hwnd.0 as _, 4); }
    }
    Ok(())
}
pub fn redock(window: &WebviewWindow) -> Result<(), String> {
    let m = island_metrics(window.clone())?;
    envelope(window, m.width.clamp(1.0,1120.0), m.height.clamp(1.0,100.0))?;
    Ok(())
}
