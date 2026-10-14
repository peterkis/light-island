use serde_json::Value;
use std::{path::PathBuf, sync::Arc};
use tauri::Manager;
pub mod engine;
mod legacy;
mod service;
mod session_profile;
#[path = "../../../src-tauri/src/motion_preferences.rs"]
mod motion_preferences;
use motion_preferences::{get_motion_preference, set_motion_preference, MotionPreferenceState};
use service::Service;

#[tauri::command]
fn simulator_command(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Service>>,
    payload: Value,
) -> Result<(), String> {
    if window.label() != "workbench" {
        return Err("Workbench window required".into());
    }
    if serde_json::to_string(&payload)
        .map_err(|e| e.to_string())?
        .len()
        > 32768
    {
        return Err("Payload exceeds prototype limit".into());
    }
    state.simulator(payload, false)
}
#[tauri::command]
fn workbench_status(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Service>>,
) -> Result<Value, String> {
    if window.label() != "workbench" {
        return Err("Workbench window required".into());
    }
    Ok(state.status())
}
fn island_executable() -> Result<PathBuf, String> {
    let current = std::env::current_exe().map_err(|e| e.to_string())?;
    let folder = current.parent().ok_or("Executable directory unavailable")?;
    let sibling = folder.join("samewave-island.exe");
    if sibling.is_file() {
        return Ok(sibling);
    }
    let development = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../src-tauri/target/release/samewave-island.exe");
    if development.is_file() {
        return Ok(development);
    }
    Err("Island executable unavailable".into())
}
#[tauri::command]
fn launch_island(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Service>>,
) -> Result<(), String> {
    if window.label() != "workbench" {
        return Err("Explicit workbench action required".into());
    }
    let mut command = std::process::Command::new(island_executable()?);
    if state.legacy_mode {
        command.arg("--legacy");
    }
    command
        .env(
            "ISLAND_DEMO_URL",
            format!("ws://127.0.0.1:{}/events", state.port),
        )
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn legacy_command(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Service>>,
    payload: Value,
) -> Result<(), String> {
    if window.label() != "workbench" {
        return Err("Workbench window required".into());
    }
    state.inner().legacy_command(payload)
}
#[tauri::command]
fn launch_legacy_workbench(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "workbench" {
        return Err("Explicit workbench action required".into());
    }
    std::process::Command::new(std::env::current_exe().map_err(|e| e.to_string())?)
        .arg("--legacy")
        .env_remove("ISLAND_DEMO_PORT")
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn qa_exit(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Arc<Service>>,
    abrupt: Option<bool>,
) -> Result<(), String> {
    if window.label() != "workbench" || !std::env::args().any(|a| a == "--qa-cdp") {
        return Err("Owned QA launch required".into());
    }
    if abrupt.unwrap_or(false) {
        std::process::exit(97);
    }
    state.shutdown();
    app.exit(0);
    Ok(())
}
#[tauri::command]
fn workbench_platform_status(window: tauri::WebviewWindow) -> Result<Value, String> {
    if window.label() != "workbench" {
        return Err("Workbench window required".into());
    }
    let mut enabled = 1_i32;
    #[cfg(target_os = "windows")]
    unsafe {
        #[link(name = "user32")]
        extern "system" {
            fn SystemParametersInfoW(
                action: u32,
                param: u32,
                value: *mut std::ffi::c_void,
                flags: u32,
            ) -> i32;
        }
        let _ = SystemParametersInfoW(0x1042, 0, (&mut enabled as *mut i32).cast(), 0);
    }
    Ok(
        serde_json::json!({"notificationState":5,"animationsEnabled":enabled!=0,"outsideClickAvailable":false,"shortcutRegistered":false}),
    )
}
pub fn run() {
    let legacy = std::env::args().any(|a| a == "--legacy");
    let port = std::env::var("ISLAND_DEMO_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(if legacy { 17321 } else { 17322 });
    let state = match Service::new(port, std::env::args().any(|a| a == "--qa-control"), legacy) {
        Ok(state) => state,
        Err(error) => {
            eprintln!("{error}");
            return;
        }
    };
    let profile = match session_profile::create() {
        Ok(path) => path,
        Err(error) => {
            eprintln!("{error}");
            return;
        }
    };
    let mut context = tauri::generate_context!();
    if legacy {
        context.config_mut().identifier = "local.samewave.workbench.legacy.prototype".into();
    }
    for window in &mut context.config_mut().app.windows {
        window.data_directory = Some(profile.join("webview"));
        window.incognito = true;
        if legacy {
            window.url = tauri::WebviewUrl::App("index.html?app=workbench".into());
        }
        if std::env::args().any(|a| a == "--qa-cdp") {
            window.additional_browser_args =
                Some("--remote-debugging-port=9224 --remote-debugging-address=127.0.0.1".into());
        }
    }
    let service = state.clone();
    let exit = state.clone();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("workbench") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .manage(state)
        .manage(MotionPreferenceState::default())
        .invoke_handler(tauri::generate_handler![
            get_motion_preference,
            set_motion_preference,
            simulator_command,
            workbench_status,
            launch_island,
            legacy_command,
            launch_legacy_workbench,
            qa_exit,
            workbench_platform_status
        ])
        .setup(move |app| {
            service.attach(app.handle().clone());
            tauri::async_runtime::spawn(service.clone().serve());
            Ok(())
        })
        .on_window_event(move |window, event| {
            if window.label() == "workbench"
                && matches!(event, tauri::WindowEvent::CloseRequested { .. })
            {
                exit.shutdown();
                window.app_handle().exit(0);
            }
        })
        .run(context);
    if let Err(error) = result {
        eprintln!("Unable to start workbench: {error}");
    }
    session_profile::release();
    for _ in 0..20 {
        if session_profile::cleanup(&profile) {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}
