//! One read-only source connection owned by the island process and its source readers.
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio_tungstenite::{
    connect_async_with_config,
    tungstenite::{protocol::WebSocketConfig, Message},
};
struct Route {
    label: String,
    at: Instant,
    session: String,
}
#[derive(Default)]
pub struct Transport {
    running: AtomicBool,
    writer: Mutex<Option<mpsc::Sender<String>>>,
    online: AtomicBool,
    routes: Mutex<HashMap<String, Route>>,
    session: Mutex<Option<String>>,
}
fn millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}
pub fn wire_allowed(clinical: bool, label: &str, kind: &str) -> bool {
    if !["island", "clinical-source"].contains(&label) {
        return false;
    }
    if clinical {
        [
            "clinical:sync",
            "clinical:refresh",
            "clinical:open",
            "clinical:source-read",
            "clinical:lab-read",
        ]
        .contains(&kind)
            || (label == "island" && kind == "experiment:result")
    } else {
        ["sync", "ack"].contains(&kind)
    }
}
#[tauri::command]
pub fn connect_stream(
    app: AppHandle,
    state: tauri::State<'_, Arc<Transport>>,
) -> Result<(), String> {
    if state.running.swap(true, Ordering::SeqCst) {
        if let Some(session) = state
            .session
            .lock()
            .map_err(|_| "Session unavailable")?
            .as_ref()
        {
            let _ = app.emit(
                "island://wire",
                json!({"type":"transport:session","sourceSessionId":session}),
            );
        }
        let _ = app.emit(
            "island://connection",
            if state.online.load(Ordering::SeqCst) {
                "online"
            } else {
                "connecting"
            },
        );
        return Ok(());
    }
    let transport = state.inner().clone();
    let clinical = !std::env::args().any(|a| a == "--legacy");
    let endpoint = std::env::var("ISLAND_DEMO_URL").unwrap_or_else(|_| {
        if clinical {
            "ws://127.0.0.1:17322/events"
        } else {
            "ws://127.0.0.1:17321/events"
        }
        .into()
    });
    if !url::Url::parse(&endpoint).is_ok_and(|u| {
        u.scheme() == "ws"
            && matches!(u.host_str(), Some("127.0.0.1") | Some("localhost"))
            && u.username().is_empty()
            && u.password().is_none()
    }) {
        transport.running.store(false, Ordering::SeqCst);
        return Err("Only a loopback synthetic WebSocket is permitted".into());
    }
    let client_id = format!("island-{}-{}", std::process::id(), millis());
    tauri::async_runtime::spawn(async move {
        let mut attempt = 0_u32;
        loop {
            let _ = app.emit("island://connection", "connecting");
            let mut incompatible = false;
            let config = WebSocketConfig::default()
                .max_message_size(Some(262144))
                .max_frame_size(Some(262144))
                .read_buffer_size(16384)
                .write_buffer_size(16384)
                .max_write_buffer_size(524288);
            if let Ok((socket, _)) = connect_async_with_config(&endpoint, Some(config), true).await
            {
                let (mut sink, mut stream) = socket.split();
                let (tx, mut rx) = mpsc::channel::<String>(64);
                let mut session: Option<String> = None;
                let mut ready = !clinical;
                if !clinical {
                    if let Ok(mut writer) = transport.writer.lock() {
                        *writer = Some(tx.clone());
                    }
                    transport.online.store(true, Ordering::SeqCst);
                    let _ = app.emit("island://connection", "online");
                    attempt = 0;
                }
                let mut heartbeat = tokio::time::interval(Duration::from_secs(20));
                let mut last_seen = tokio::time::Instant::now();
                let handshake = tokio::time::sleep(Duration::from_secs(5));
                tokio::pin!(handshake);
                loop {
                    tokio::select! {
                        _=&mut handshake,if clinical&&!ready=>{incompatible=true;break;},
                        frame=stream.next()=>match frame{
                            Some(Ok(Message::Text(text)))=>{
                                last_seen=tokio::time::Instant::now();let Ok(value)=serde_json::from_str::<Value>(&text)else{continue;};let kind=value["type"].as_str().unwrap_or("");
                                if clinical&&kind=="transport:hello"{
                                    let id=value["sourceSessionId"].as_str().filter(|s|!s.is_empty()&&s.len()<=80);
                                    if value["protocolVersion"]!=2||id.is_none(){incompatible=true;break;}
                                    session=id.map(str::to_owned);
                                    if sink.send(Message::Text(json!({"type":"transport:subscribe","protocolVersion":2,"role":"island","clientId":client_id}).to_string().into())).await.is_err(){break;}continue;
                                }
                                if clinical{
                                    if session.is_none(){incompatible=true;break;}
                                    if value["sourceSessionId"].as_str()!=session.as_deref(){continue;}
                                    if kind=="transport:ready"{
                                        if ready{continue;}ready=true;attempt=0;if let Ok(mut saved)=transport.session.lock(){*saved=session.clone();}
                                    if let Ok(mut writer)=transport.writer.lock(){*writer=Some(tx.clone());}transport.online.store(true,Ordering::SeqCst);
                                        let _=app.emit("island://wire",json!({"type":"transport:session","sourceSessionId":session}));let _=app.emit("island://connection","online");continue;
                                    }
                                    if !ready{continue;}
                                }
                                if kind=="experiment:action"{
                                    if value["targetClientId"].as_str()==Some(&client_id){let _=app.emit_to("island","island://wire",value);}continue;
                                }
                                if ["clinical:lab-report","clinical:source","clinical:route"].contains(&kind){
                                    let field=if kind=="clinical:source"{"ticket"}else{"requestId"};let key=value[field].as_str().unwrap_or("");
                                    let route=transport.routes.lock().ok().and_then(|mut routes|routes.remove(key));
                                    if let Some(route)=route{if route.at.elapsed()<Duration::from_secs(10)&&session.as_deref()==Some(&route.session){
                                        let mut private=value;
                                        if private.get("labReport").is_some(){if let Some(window)=app.get_webview_window(&route.label){if crate::reader_native::clinical_capture(window,true,millis()).is_err(){private=json!({"type":"clinical:source","ticket":private.get("ticket"),"error":"窗口捕获保护不可用"});}}else{continue;}}
                                        let _=app.emit_to(route.label,"island://wire",private);
                                    }}
                                }else{let _=app.emit("island://wire",value);}
                            },
                            Some(Ok(Message::Pong(_)))=>last_seen=tokio::time::Instant::now(),
                            Some(Ok(Message::Ping(bytes)))=>{if sink.send(Message::Pong(bytes)).await.is_err(){break;}},
                            Some(Ok(Message::Close(_)))|Some(Err(_))|None=>break,_=>{},
                        },
                        outgoing=rx.recv()=>match outgoing{Some(text)=>{if sink.send(Message::Text(text.into())).await.is_err(){break;}},None=>break},
                        _=heartbeat.tick()=>{if last_seen.elapsed()>Duration::from_secs(65){break;}
                                    if sink.send(Message::Ping(Vec::new().into())).await.is_err(){break;}},
                    }
                }
            }
            transport.online.store(false, Ordering::SeqCst);
            if let Ok(mut writer) = transport.writer.lock() {
                *writer = None;
            }
            if let Ok(mut routes) = transport.routes.lock() {
                routes.clear();
            }
            let _ = app.emit(
                "island://connection",
                if incompatible {
                    "incompatible"
                } else {
                    "offline"
                },
            );
            let jitter = millis() % 251;
            tokio::time::sleep(Duration::from_millis(
                (500 * 2_u64.pow(attempt.min(5))).min(15000) + jitter,
            ))
            .await;
            attempt = attempt.saturating_add(1);
        }
    });
    Ok(())
}
#[tauri::command]
pub fn send_wire(
    window: tauri::WebviewWindow,
    mut payload: Value,
    state: tauri::State<'_, Arc<Transport>>,
) -> Result<(), String> {
    let kind = payload["type"]
        .as_str()
        .ok_or("Missing event type")?
        .to_owned();
    let clinical = window
        .url()
        .map_err(|e| e.to_string())?
        .path()
        .ends_with("clinical.html");
    if !wire_allowed(clinical, window.label(), &kind) {
        return Err(
            "Island source connection is read-only; simulation belongs to the workbench".into(),
        );
    }
    if !state.online.load(Ordering::SeqCst) {
        return Err("Message channel is offline".into());
    }
    let session = state
        .session
        .lock()
        .map_err(|_| "Session unavailable")?
        .clone();
    if clinical {
        payload["sourceSessionId"] =
            json!(session.as_deref().ok_or("Source session unavailable")?);
    }
    let encoded = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    if encoded.len() > 32768 {
        return Err("Payload exceeds prototype limit".into());
    }
    let mut private_key = None;
    if ["clinical:lab-read", "clinical:source-read", "clinical:open"].contains(&kind.as_str()) {
        let field = if kind == "clinical:source-read" {
            "ticket"
        } else {
            "requestId"
        };
        let key = payload[field]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 80)
            .ok_or("Invalid private read correlation")?;
        let mut routes = state
            .routes
            .lock()
            .map_err(|_| "Private routing unavailable")?;
        routes.retain(|_, route| route.at.elapsed() < Duration::from_secs(10));
        if routes.len() >= 64 || routes.contains_key(key) {
            return Err("Private routing capacity or correlation conflict".into());
        }
        routes.insert(
            key.into(),
            Route {
                label: window.label().into(),
                at: Instant::now(),
                session: session.ok_or("Source session unavailable")?,
            },
        );
        private_key = Some(key.to_owned());
    }
    let result = state
        .writer
        .lock()
        .map_err(|_| "Writer unavailable")?
        .clone()
        .ok_or("No connected writer")?
        .try_send(encoded)
        .map_err(|e| e.to_string());
    if result.is_err() {
        if let Some(key) = private_key {
            if let Ok(mut routes) = state.routes.lock() {
                routes.remove(&key);
            }
        }
    }
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn viewer_cannot_simulate_or_control_personal_state_through_the_source() {
        for kind in [
            "clinical:configure",
            "clinical:reset",
            "clinical:personal",
            "clinical:preferences",
            "clinical:ack",
            "clinical:complete",
        ] {
            assert!(!wire_allowed(true, "island", kind));
        }
        assert!(wire_allowed(true, "island", "clinical:sync"));
        assert!(wire_allowed(
            true,
            "clinical-source",
            "clinical:source-read"
        ));
        assert!(!wire_allowed(true, "studio", "clinical:sync"));
    }
}
