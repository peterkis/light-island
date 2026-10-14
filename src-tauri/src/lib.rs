use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle,Emitter,Manager};
mod transport;
use transport::{Transport,connect_stream,send_wire};
#[cfg(target_os = "windows")]
mod win32 {
    #[link(name = "user32")]
    extern "system" { pub fn ShowWindow(hwnd: *mut std::ffi::c_void, cmd: i32) -> i32; }
}
mod notch_window;
mod clinical_window;
mod clinical_input;
mod motion_preferences;
use motion_preferences::{get_motion_preference,set_motion_preference,MotionPreferenceState};
mod clinical_shadow;
#[cfg(target_os = "windows")]
mod shadow_raster;
#[cfg(target_os = "windows")]
mod clinical_region;
#[cfg(all(test, target_os = "windows"))]
#[path = "../../scripts/rust-performance-reference.rs"]
mod performance_reference;
mod reader_native;
mod reader_profile;
use reader_native::{clinical_capture,clinical_reader_clock};
use clinical_shadow::clinical_background_luminance;
use clinical_input::clinical_platform_status;
use clinical_window::{clinical_layout, clinical_metrics, open_clinical_source, close_clinical_source};
mod notch_geometry;
mod hover_diagnostics;
use hover_diagnostics::hover_diagnostics;
use notch_window::{island_metrics, resize_island_window, commit_island_geometry, update_island_region, cancel_island_transition, island_pointer_inside};
#[tauri::command]
fn position_island(app: AppHandle, top: f64) -> Result<(), String> {
    let _ = top;
    let w=app.get_webview_window("island").ok_or("Island unavailable")?;
    if std::env::args().any(|a|a=="--legacy") { notch_window::redock(&w) } else { clinical_window::redock(&w) }
}

#[tauri::command]
fn launch_workbench()->Result<(),String>{
 let current=std::env::current_exe().map_err(|e|e.to_string())?;let folder=current.parent().ok_or("Executable directory unavailable")?;
 let sibling=folder.join("samewave-workbench.exe");
 let development=std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../workbench/src-tauri/target/release/samewave-workbench.exe");
 let executable=if sibling.is_file(){sibling}else if development.is_file(){development}else{return Err("Workbench executable unavailable".into());};
 let mut command=std::process::Command::new(executable);if std::env::args().any(|a|a=="--legacy"){command.arg("--legacy");}command.spawn().map_err(|e|e.to_string())?;Ok(())
}

#[tauri::command]
fn qa_exit(app:AppHandle,window:tauri::WebviewWindow,abrupt:Option<bool>)->Result<(),String>{
 if window.label()!="island"||!std::env::args().any(|a|a=="--qa-cdp"){return Err("Owned QA launch required".into());}
 if abrupt.unwrap_or(false){std::process::exit(97);}clinical_input::stop();clinical_shadow::close();app.exit(0);Ok(())
}
pub fn run() {
    let mut context = tauri::generate_context!();
    let profile=if !std::env::args().any(|a|a=="--legacy"){Some(reader_profile::create().expect("Unable to create owned session profile"))}else{None};
    if let Some(path)=&profile{for window in &mut context.config_mut().app.windows{window.data_directory=Some(path.join("webview"));window.incognito=true;}}
    if std::env::args().any(|a|a=="--legacy") {
        if let Some(w)=context.config_mut().app.windows.iter_mut().find(|w|w.label=="island") { w.url=tauri::WebviewUrl::App("index.html?view=island".into()); }
    }
    // Explicit local QA opt-in; normal launches expose no debugging endpoint.
    if std::env::args().any(|a| a == "--qa-cdp") {
        if let Some(window) = context.config_mut().app.windows.iter_mut().find(|w| w.label == "island") {
            window.additional_browser_args = Some("--remote-debugging-port=9223 --remote-debugging-address=127.0.0.1 --autoplay-policy=no-user-gesture-required".into());
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| { let _=app.emit_to("island","island://wire",json!({"type":"view","mode":"inbox"})); }))
        .manage(Arc::new(Transport::default()))
        .manage(MotionPreferenceState::default())
        .invoke_handler(tauri::generate_handler![get_motion_preference,set_motion_preference,clinical_capture,clinical_reader_clock,clinical_background_luminance, clinical_platform_status, clinical_layout, clinical_metrics, open_clinical_source, close_clinical_source, update_island_region, cancel_island_transition, island_pointer_inside, hover_diagnostics, connect_stream, send_wire, island_metrics, resize_island_window, commit_island_geometry, position_island, launch_workbench, qa_exit])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            let inbox = MenuItem::with_id(app, "inbox", "打开消息中心", true, None::<&str>)?;
            let collapse = MenuItem::with_id(app, "compact", "收起灵动岛", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出同频", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&inbox, &collapse, &quit])?;
            let mut tray = TrayIconBuilder::with_id("samewave").tooltip("同频 Island · 模拟原型").menu(&menu);
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.on_menu_event(|app, event| match event.id.as_ref() {
                "inbox" | "compact" => {
                    #[cfg(target_os = "windows")]
                    if let Some(w) = app.get_webview_window("island") { if let Ok(h) = w.hwnd() { unsafe { win32::ShowWindow(h.0 as _, 4); } } }
                    let _ = app.emit("island://wire", json!({"type":"view", "mode":event.id.as_ref()})); },
                "quit" => {clinical_input::stop();clinical_shadow::close();app.exit(0)}, _ => {}
            }).build(app)?;
            if !std::env::args().any(|a|a=="--legacy") {
                clinical_window::initialize(&app.get_webview_window("island").ok_or("Island unavailable")?)?;
            }
            let _ = position_island(app.handle().clone(), 0.0);
            if !std::env::args().any(|a|a=="--legacy"){clinical_input::start(app.handle().clone());}
            if std::env::args().any(|a| a == "--studio") { let _=launch_workbench(); }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "island" {
                if let tauri::WindowEvent::ScaleFactorChanged { .. } = event {
                    let _ = position_island(window.app_handle().clone(), 0.0);
                }
                if let tauri::WindowEvent::CloseRequested { api, .. } = event { api.prevent_close(); clinical_shadow::hide(); let _ = window.hide(); }
            }
        })
        .run(context)
        .expect("Unable to start Samewave Island");
    if let Some(path)=profile{reader_profile::release_lock();for _ in 0..20{if reader_profile::cleanup(&path){break;}std::thread::sleep(Duration::from_millis(100));}}
}
