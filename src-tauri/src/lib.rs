use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async_with_config, tungstenite::{Message, protocol::WebSocketConfig}};

#[derive(Default)]
struct Transport {
    running: AtomicBool,
    writer: Mutex<Option<mpsc::Sender<String>>>,
    online: AtomicBool,
}

#[tauri::command]
fn connect_stream(app: AppHandle, state: tauri::State<'_, Arc<Transport>>) -> Result<(), String> {
    if state.running.swap(true, Ordering::SeqCst) {
        let online = state.online.load(Ordering::SeqCst);
        let _ = app.emit("island://connection", if online { "online" } else { "connecting" });
        if let Ok(writer) = state.writer.lock() {
            if let Some(tx) = writer.as_ref() { let _ = tx.try_send("{\"type\":\"sync\"}".into()); }
        }
        return Ok(());
    }
    let transport = state.inner().clone();
    let url = std::env::var("ISLAND_DEMO_URL").unwrap_or_else(|_| "ws://127.0.0.1:17321/events".into());
    // Prototype transport is deliberately loopback-only. Production requires a different authenticated adapter.
    let safe_url = url::Url::parse(&url).is_ok_and(|u| u.scheme() == "ws" && matches!(u.host_str(), Some("127.0.0.1") | Some("localhost")) && u.username().is_empty() && u.password().is_none());
    if !safe_url {
        transport.running.store(false, Ordering::SeqCst);
        return Err("Only a loopback synthetic WebSocket is permitted in this prototype".into());
    }
    tauri::async_runtime::spawn(async move {
        let mut attempt = 0_u32;
        loop {
            let _ = app.emit("island://connection", "connecting");
            let config = WebSocketConfig::default().max_message_size(Some(262_144)).max_frame_size(Some(262_144)).read_buffer_size(16_384).write_buffer_size(16_384).max_write_buffer_size(524_288);
            if let Ok((socket, _)) = connect_async_with_config(&url, Some(config), true).await {
                attempt = 0;
                let (mut sink, mut stream) = socket.split();
                let (tx, mut rx) = mpsc::channel::<String>(64);
                if let Ok(mut writer) = transport.writer.lock() { *writer = Some(tx); }
                transport.online.store(true, Ordering::SeqCst);
                let _ = app.emit("island://connection", "online");
                let mut heartbeat = tokio::time::interval(Duration::from_secs(20));
                let mut last_seen = tokio::time::Instant::now();
                loop {
                    tokio::select! {
                        frame = stream.next() => {
                            match frame {
                                Some(Ok(Message::Text(text))) => {
                                    last_seen = tokio::time::Instant::now();
                                    if text.len() > 262_144 { break; }
                                    if let Ok(value) = serde_json::from_str::<Value>(&text) {
                                        let _ = app.emit("island://wire", value);
                                    }
                                },
                                Some(Ok(Message::Pong(_))) => last_seen = tokio::time::Instant::now(),
                                Some(Ok(Message::Ping(data))) => { if sink.send(Message::Pong(data)).await.is_err() { break; } },
                                Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break,
                                _ => {}
                            }
                        },
                        outgoing = rx.recv() => {
                            match outgoing {
                                Some(text) => if sink.send(Message::Text(text.into())).await.is_err() { break; },
                                None => break
                            }
                        },
                        _ = heartbeat.tick() => {
                            if last_seen.elapsed() > Duration::from_secs(65) { break; }
                            if sink.send(Message::Ping(Vec::new().into())).await.is_err() { break; }
                        }
                    }
                }
            }
            transport.online.store(false, Ordering::SeqCst);
            if let Ok(mut writer) = transport.writer.lock() { *writer = None; }
            let _ = app.emit("island://connection", "offline");
            let jitter = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().subsec_millis() as u64 % 251;
            tokio::time::sleep(Duration::from_millis((500_u64 * 2_u64.pow(attempt.min(5))).min(15_000) + jitter)).await;
            attempt = attempt.saturating_add(1);
        }
    });
    Ok(())
}

#[tauri::command]
fn send_wire(payload: Value, state: tauri::State<'_, Arc<Transport>>) -> Result<(), String> {
    let kind = payload.get("type").and_then(Value::as_str).ok_or("Missing event type")?;
    if !["ack", "demo", "configure", "reset", "view"].contains(&kind) { return Err("Unsupported event type".into()); }
    if !state.online.load(Ordering::SeqCst) { return Err("Message channel is offline".into()); }
    let encoded = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    if encoded.len() > 32768 { return Err("Payload exceeds prototype limit".into()); }
    let tx = state.writer.lock().map_err(|_| "Writer state unavailable")?.clone().ok_or("No connected writer")?;
    tx.try_send(encoded).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
mod win32 {
    #[link(name = "user32")]
    extern "system" { pub fn ShowWindow(hwnd: *mut std::ffi::c_void, cmd: i32) -> i32; }
}
mod notch_window;
mod notch_geometry;
mod hover_diagnostics;
use hover_diagnostics::hover_diagnostics;
use notch_window::{island_metrics, resize_island_window, commit_island_geometry, update_island_region, cancel_island_transition, island_pointer_inside};
#[tauri::command]
fn position_island(app: AppHandle, top: f64) -> Result<(), String> {
    let _ = top;
    notch_window::redock(&app.get_webview_window("island").ok_or("Island unavailable")?)
}

#[tauri::command]
fn open_studio(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("studio") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    tauri::WebviewWindowBuilder::new(&app, "studio", tauri::WebviewUrl::App("index.html".into()))
        .title("同频 Island · 原型试验台 · 仅模拟数据").inner_size(1380.0, 980.0)
        .min_inner_size(900.0, 700.0).center().build().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    let mut context = tauri::generate_context!();
    // Explicit local QA opt-in; normal launches expose no debugging endpoint.
    if std::env::args().any(|a| a == "--qa-cdp") {
        if let Some(window) = context.config_mut().app.windows.iter_mut().find(|w| w.label == "island") {
            window.additional_browser_args = Some("--remote-debugging-port=9223 --remote-debugging-address=127.0.0.1 --autoplay-policy=no-user-gesture-required".into());
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| { let _ = open_studio(app.clone()); }))
        .manage(Arc::new(Transport::default()))
        .invoke_handler(tauri::generate_handler![update_island_region, cancel_island_transition, island_pointer_inside, hover_diagnostics, connect_stream, send_wire, island_metrics, resize_island_window, commit_island_geometry, position_island, open_studio])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            let studio = MenuItem::with_id(app, "studio", "打开原型试验台", true, None::<&str>)?;
            let inbox = MenuItem::with_id(app, "inbox", "打开消息中心", true, None::<&str>)?;
            let collapse = MenuItem::with_id(app, "compact", "收起灵动岛", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出同频", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&studio, &inbox, &collapse, &quit])?;
            let mut tray = TrayIconBuilder::with_id("samewave").tooltip("同频 Island · 模拟原型").menu(&menu);
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.on_menu_event(|app, event| match event.id.as_ref() {
                "studio" => { let _ = open_studio(app.clone()); },
                "inbox" | "compact" => {
                    #[cfg(target_os = "windows")]
                    if let Some(w) = app.get_webview_window("island") { if let Ok(h) = w.hwnd() { unsafe { win32::ShowWindow(h.0 as _, 4); } } }
                    let _ = app.emit("island://wire", json!({"type":"view", "mode":event.id.as_ref()})); },
                "quit" => app.exit(0), _ => {}
            }).build(app)?;
            let _ = position_island(app.handle().clone(), 0.0);
            if std::env::args().any(|a| a == "--studio") { let _ = open_studio(app.handle().clone()); }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "island" {
                if let tauri::WindowEvent::ScaleFactorChanged { .. } = event {
                    let _ = position_island(window.app_handle().clone(), 0.0);
                }
                if let tauri::WindowEvent::CloseRequested { api, .. } = event { api.prevent_close(); let _ = window.hide(); }
            }
        })
        .run(context)
        .expect("Unable to start Samewave Island");
}
