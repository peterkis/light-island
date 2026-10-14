//! A bounded loopback message source owned by the workbench process.
use crate::engine::{Engine, Output, SourceCommand};
use crate::legacy::Legacy;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        DefaultBodyLimit, State,
    },
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, VecDeque},
    sync::{
        atomic::{AtomicU64, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, watch};
use uuid::Uuid;

const MAX_FRAME: usize = 32768;
#[derive(Clone)]
struct Peer {
    id: String,
    role: String,
    tx: mpsc::Sender<Value>,
    cancel: watch::Sender<bool>,
}
pub struct Service {
    pub port: u16,
    pub qa_control: bool,
    pub session: String,
    pub legacy_mode: bool,
    legacy: Mutex<Legacy>,
    legacy_epoch: AtomicU64,
    legacy_jobs: AtomicUsize,
    preview: Mutex<Engine>,
    desktop: Mutex<Engine>,
    peers: Mutex<HashMap<String, Peer>>,
    experiments: Mutex<HashMap<String, (String, Instant)>>,
    logs: Mutex<VecDeque<Value>>,
    status: Mutex<(bool, String)>,
    app: Mutex<Option<AppHandle>>,
    stop: watch::Sender<bool>,
}
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}
impl Service {
    pub fn new(port: u16, qa_control: bool, legacy_mode: bool) -> Result<Arc<Self>, String> {
        let (stop, _) = watch::channel(false);
        Ok(Arc::new(Self {
            port,
            qa_control,
            legacy_mode,
            legacy: Mutex::new(Legacy::default()),
            legacy_epoch: AtomicU64::new(0),
            legacy_jobs: AtomicUsize::new(0),
            session: Uuid::new_v4().to_string(),
            preview: Mutex::new(Engine::new()?),
            desktop: Mutex::new(Engine::new()?),
            peers: Mutex::new(HashMap::new()),
            experiments: Mutex::new(HashMap::new()),
            logs: Mutex::new(VecDeque::new()),
            status: Mutex::new((false, String::new())),
            app: Mutex::new(None),
            stop,
        }))
    }
    pub fn attach(&self, app: AppHandle) {
        if let Ok(mut guard) = self.app.lock() {
            *guard = Some(app);
        }
    }
    fn emit(&self, name: &str, value: Value) {
        if let Ok(app) = self.app.lock() {
            if let Some(app) = app.as_ref() {
                let _ = app.emit(name, value);
            }
        }
    }
    pub fn status(&self) -> Value {
        let (listening, error) = self
            .status
            .lock()
            .map(|g| g.clone())
            .unwrap_or((false, "服务状态不可用".into()));
        json!({"listening":listening,"error":error,"port":self.port,"sourceSessionId":self.session,"clients":self.clients(),"sourceSettings":self.controls(),"messages":self.logs.lock().map(|g|g.iter().cloned().collect::<Vec<_>>()).unwrap_or_default()})
    }
    pub fn require_listener(&self) -> Result<(), String> {
        let listening = self.status.lock().map(|status| status.0).unwrap_or(false);
        if listening && !*self.stop.borrow() {
            Ok(())
        } else {
            Err(format!("模拟消息源未监听（端口 {}），无法启动灵动岛。", self.port))
        }
    }
    fn controls(&self) -> Value {
        json!({"preview":self.preview.lock().ok().map(|e|e.settings.clone()),"desktop":self.desktop.lock().ok().map(|e|e.settings.clone())})
    }
    fn publish_controls(&self) {
        let value = json!({"type":"transport:controls","settings":self.controls()});
        for peer in self.peers_for("preview") {
            self.send(&peer, value.clone());
        }
    }
    fn clients(&self) -> Vec<Value> {
        self.peers
            .lock()
            .map(|peers| {
                peers
                    .values()
                    .map(|p| json!({"clientId":p.id,"role":p.role}))
                    .collect()
            })
            .unwrap_or_default()
    }
    fn log(
        &self,
        direction: &str,
        client: &str,
        kind: &str,
        request: Option<&str>,
        status: Option<&str>,
    ) {
        let record = json!({"direction":direction,"clientId":client,"type":kind,"requestId":request,"status":status,"at":now()});
        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 30 {
                logs.pop_front();
            }
            logs.push_back(record.clone());
        }
        self.emit("workbench://message", record);
    }
    fn stamp(&self, mut value: Value) -> Value {
        value["sourceSessionId"] = json!(self.session);
        value
    }
    fn send(&self, peer: &Peer, value: Value) {
        if serde_json::to_string(&value).is_ok_and(|v| v.len() <= 262144) {
            if peer.tx.try_send(self.stamp(value)).is_err() {
                peer.cancel.send_replace(true);
            }
        } else {
            peer.cancel.send_replace(true);
        }
    }
    fn peers_for(&self, audience: &str) -> Vec<Peer> {
        self.peers
            .lock()
            .map(|peers| {
                peers
                    .values()
                    .filter(|p| {
                        if audience == "desktop" {
                            p.role == "island"
                        } else {
                            p.role != "island"
                        }
                    })
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }
    fn publish_clients(&self) {
        let value = json!({"type":"transport:clients","clients":self.clients()});
        let peers = self
            .peers
            .lock()
            .map(|g| g.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        for peer in peers {
            self.send(&peer, value.clone());
        }
        self.emit("workbench://status", self.status());
        self.publish_controls();
    }
    fn engine(&self, audience: &str) -> &Mutex<Engine> {
        if audience == "desktop" {
            &self.desktop
        } else {
            &self.preview
        }
    }
    fn apply_output(&self, out: Output, audience: &str, reply_to: Option<&Peer>) {
        let changed = !out.events.is_empty();
        let peers = self.peers_for(audience);
        for event in out.events {
            for peer in &peers {
                self.send(peer, event.clone());
            }
        }
        if let (Some(reply), Some(peer)) = (out.reply, reply_to) {
            self.send(peer, reply);
        }
        if changed {
            self.publish_controls();
        }
    }
    pub fn snapshot(&self, audience: &str) -> Result<Value, String> {
        self.engine(audience)
            .lock()
            .map(|e| e.snapshot())
            .map_err(|_| "Source state unavailable".into())
    }
    pub fn simulator(&self, payload: Value, qa: bool) -> Result<(), String> {
        let target_owned = payload
            .get("targetClientId")
            .and_then(Value::as_str)
            .unwrap_or(if qa { "desktop" } else { "preview" })
            .to_owned();
        let target = target_owned.as_str();
        let audience = if target == "preview" {
            "preview"
        } else if qa && target == "desktop" {
            "desktop"
        } else {
            let peers = self.peers.lock().map_err(|_| "Peer state unavailable")?;
            if !peers.values().any(|p| p.id == target && p.role == "island") {
                return Err("Desktop target is offline".into());
            }
            "desktop"
        };
        if payload["type"] == "experiment:dispatch" {
            let id = payload
                .get("requestId")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty() && s.len() <= 80)
                .ok_or("Invalid experiment correlation")?;
            let action = payload
                .get("action")
                .cloned()
                .ok_or("Missing experiment action")?;
            validate_action(&action)?;
            let peers = self
                .peers_for(audience)
                .into_iter()
                .filter(|p| target == "preview" || (qa && target == "desktop") || p.id == target)
                .collect::<Vec<_>>();
            if peers.is_empty() {
                return Err("Experiment target is offline".into());
            }
            let mut pending = self
                .experiments
                .lock()
                .map_err(|_| "Experiment routing unavailable")?;
            pending.retain(|_, (_, at)| at.elapsed() < Duration::from_secs(10));
            if pending.contains_key(id) || pending.len() >= 64 {
                return Err("Experiment routing capacity reached".into());
            }
            // Native desktop is a single-instance application; previews execute locally.
            if peers.len() != 1 {
                return Err("Select one experiment target".into());
            }
            let peer = &peers[0];
            pending.insert(id.into(), (peer.id.clone(), Instant::now()));
            drop(pending);
            self.send(peer,json!({"type":"experiment:action","requestId":id,"targetClientId":peer.id,"action":action}));
            self.log("out", &peer.id, "experiment:action", Some(id), None);
            return Ok(());
        }
        let command: SourceCommand = serde_json::from_value(payload).map_err(|e| e.to_string())?;
        if command.is_read() && !matches!(command, SourceCommand::Refresh) {
            return Err("Read commands require their requesting connection".into());
        }
        let out = self
            .engine(audience)
            .lock()
            .map_err(|_| "Source state unavailable")?
            .handle(command, now())?;
        self.apply_output(out, audience, None);
        self.log("out", target, "simulator", None, None);
        Ok(())
    }
    fn receive(&self, peer: &Peer, payload: Value) -> Result<(), String> {
        if payload["sourceSessionId"].as_str() != Some(&self.session) {
            return Err("Source session changed".into());
        }
        let kind = payload["type"].as_str().ok_or("Missing message type")?;
        if kind == "experiment:result" {
            let request = payload["requestId"]
                .as_str()
                .ok_or("Missing experiment correlation")?;
            let status = payload["status"]
                .as_str()
                .filter(|s| ["applied", "rejected"].contains(s))
                .ok_or("Invalid experiment result")?;
            let mut pending = self
                .experiments
                .lock()
                .map_err(|_| "Experiment state unavailable")?;
            if !pending
                .get(request)
                .is_some_and(|(id, at)| id == &peer.id && at.elapsed() < Duration::from_secs(10))
            {
                return Err("Stale experiment result".into());
            }
            pending.remove(request);
            drop(pending);
            self.log("in", &peer.id, kind, Some(request), Some(status));
            return Ok(());
        }
        let command: SourceCommand =
            serde_json::from_value(payload.clone()).map_err(|e| e.to_string())?;
        if !command.is_read() {
            return Err("Viewer is read-only; simulation belongs to the workbench".into());
        }
        let audience = if peer.role == "island" {
            "desktop"
        } else {
            "preview"
        };
        let out = self
            .engine(audience)
            .lock()
            .map_err(|_| "Source state unavailable")?
            .handle(command, now())?;
        self.apply_output(out, audience, Some(peer));
        self.log("in", &peer.id, kind, payload["requestId"].as_str(), None);
        Ok(())
    }
    fn legacy_publish(&self, value: Value) {
        let peers = self
            .peers
            .lock()
            .map(|g| g.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        for peer in peers {
            self.send(&peer, value.clone());
        }
    }
    pub fn legacy_command(self: &Arc<Self>, payload: Value) -> Result<(), String> {
        if !self.legacy_mode {
            return Err("Start workbench --legacy for historical experiments".into());
        }
        if payload["type"] == "demo" {
            let name = payload["scenario"]
                .as_str()
                .ok_or("Missing legacy scenario")?;
            let jobs: Vec<(u64, String, usize)> = match name {
                "burst" => (0..12)
                    .map(|i| (i as u64 * 160, "burst".into(), i))
                    .collect(),
                "journey" => vec![
                    (0, "report".into(), 0),
                    (2300, "critical".into(), 0),
                    (5200, "journey-his".into(), 0),
                    (8800, "journey-nursing".into(), 0),
                    (11000, "service".into(), 0),
                ],
                "report" | "critical" | "unstable" | "service" | "consult" => {
                    vec![(0, name.into(), 0)]
                }
                _ => return Err("Unknown legacy scenario".into()),
            };
            for (delay, name, index) in jobs {
                self.schedule(delay, move |state| {
                    if let Ok(mut legacy) = state.legacy.lock() {
                        if let Ok(event) = legacy.notice(&name, now(), index) {
                            state.legacy_publish(event);
                        }
                    }
                })?;
            }
            return Ok(());
        }
        if payload["type"] == "reset" {
            self.legacy_epoch.fetch_add(1, Ordering::SeqCst);
        }
        let out = self
            .legacy
            .lock()
            .map_err(|_| "Legacy state unavailable")?
            .control(&payload)?;
        for event in out.events {
            self.legacy_publish(event);
        }
        Ok(())
    }
    fn schedule<F>(self: &Arc<Self>, delay: u64, action: F) -> Result<(), String>
    where
        F: FnOnce(&Service) + Send + 'static,
    {
        if self.legacy_jobs.fetch_add(1, Ordering::SeqCst) >= 64 {
            self.legacy_jobs.fetch_sub(1, Ordering::SeqCst);
            return Err("Finite legacy schedule capacity reached".into());
        }
        let state = self.clone();
        let epoch = self.legacy_epoch.load(Ordering::SeqCst);
        let mut stop = self.stop.subscribe();
        tauri::async_runtime::spawn(async move {
            tokio::select! {_=tokio::time::sleep(Duration::from_millis(delay))=>{if state.legacy_epoch.load(Ordering::SeqCst)==epoch{action(&state);}},_=stop.changed()=>{}}
            state.legacy_jobs.fetch_sub(1, Ordering::SeqCst);
        });
        Ok(())
    }
    pub fn shutdown(&self) {
        if let Ok(mut status) = self.status.lock() {
            *status = (false, String::new());
        }
        self.stop.send_replace(true);
        let peers = self
            .peers
            .lock()
            .map(|p| p.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        for peer in peers {
            peer.cancel.send_replace(true);
        }
    }
    pub async fn serve(self: Arc<Self>) {
        let listener =
            match tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, self.port)).await {
                Ok(listener) => listener,
                Err(error) => {
                    if let Ok(mut status) = self.status.lock() {
                        *status = (
                            false,
                            format!(
                                "模拟端口 {} 无法启动：{}。未停止其他进程。",
                                self.port, error
                            ),
                        );
                    }
                    self.emit("workbench://status", self.status());
                    return;
                }
            };
        if let Ok(mut status) = self.status.lock() {
            *status = (true, String::new());
        }
        self.emit("workbench://status", self.status());
        let router = Router::new()
            .route("/events", get(upgrade))
            .route("/api/health", get(health))
            .route("/api/clinical-state", get(snapshot))
            .route("/api/push", post(qa_push))
            .layer(DefaultBodyLimit::max(MAX_FRAME))
            .with_state(self.clone());
        let mut stop = self.stop.subscribe();
        let stopped = async move {
            if !*stop.borrow() {
                let _ = stop.changed().await;
            }
        };
        let outcome = axum::serve(listener, router)
            .with_graceful_shutdown(stopped)
            .await;
        if let Ok(mut status) = self.status.lock() {
            *status = (false, outcome.err().map(|error| error.to_string()).unwrap_or_default());
        }
        self.emit("workbench://status", self.status());
    }
}
fn allowed_origin(headers: &HeaderMap) -> bool {
    headers.get("origin").is_none_or(|value| {
        value.to_str().is_ok_and(|origin| {
            [
                "http://tauri.localhost",
                "https://tauri.localhost",
                "tauri://localhost",
                "http://127.0.0.1:1420",
                "http://localhost:1420",
            ]
            .contains(&origin)
        })
    })
}
async fn upgrade(
    State(state): State<Arc<Service>>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Response {
    if !allowed_origin(&headers) {
        return StatusCode::FORBIDDEN.into_response();
    }
    ws.max_frame_size(MAX_FRAME)
        .max_message_size(MAX_FRAME)
        .read_buffer_size(16384)
        .write_buffer_size(16384)
        .max_write_buffer_size(524288)
        .on_upgrade(move |socket| session(state, socket))
}
async fn health(State(state): State<Arc<Service>>) -> Json<Value> {
    Json(
        json!({"name":"samewave-workbench","protocolVersion":2,"sourceSessionId":state.session,"clients":state.clients()}),
    )
}
async fn snapshot(State(state): State<Arc<Service>>) -> Result<Json<Value>, StatusCode> {
    state
        .snapshot("desktop")
        .map(Json)
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)
}
async fn qa_push(State(state): State<Arc<Service>>, Json(mut payload): Json<Value>) -> Response {
    if !state.qa_control {
        return StatusCode::NOT_FOUND.into_response();
    }
    // Only this explicit QA endpoint adapts historical test commands to local actions.
    let kind = payload["type"].as_str().unwrap_or("").to_owned();
    if ["clinical:view", "clinical:personal", "clinical:preferences"].contains(&kind.as_str()) {
        let mut action = payload.clone();
        action["kind"] = json!(match kind.as_str() {
            "clinical:view" => "view",
            "clinical:personal" => "personal",
            _ => "preferences",
        });
        if let Some(map) = action.as_object_mut() {
            map.remove("type");
            map.remove("targetClientId");
        }
        payload = json!({"type":"experiment:dispatch","requestId":Uuid::new_v4().to_string(),"targetClientId":payload.get("targetClientId").cloned().unwrap_or(json!("desktop")),"action":action});
    }
    if kind == "clinical:configure" {
        let settings = payload["settings"].as_object().cloned().unwrap_or_default();
        let mut source = serde_json::Map::new();
        let mut preferences = serde_json::Map::new();
        for (key, value) in settings {
            if [
                "privacy",
                "role",
                "locked",
                "fullscreen",
                "connectivity",
                "routeFault",
            ]
            .contains(&key.as_str())
            {
                source.insert(key, value);
            } else {
                preferences.insert(key, value);
            }
        }
        if !preferences.is_empty() {
            let action = json!({"type":"experiment:dispatch","requestId":Uuid::new_v4().to_string(),"targetClientId":payload.get("targetClientId").cloned().unwrap_or(json!("desktop")),"action":{"kind":"preferences","settings":preferences}});
            if let Err(error) = state.simulator(action, true) {
                return (StatusCode::BAD_REQUEST, Json(json!({"error":error}))).into_response();
            }
        }
        if source.is_empty() {
            return (
                StatusCode::ACCEPTED,
                Json(json!({"accepted":true,"prototypeOnly":true})),
            )
                .into_response();
        }
        payload["settings"] = json!(source);
    }
    match state.simulator(payload, true) {
        Ok(()) => (
            StatusCode::ACCEPTED,
            Json(json!({"accepted":true,"prototypeOnly":true})),
        )
            .into_response(),
        Err(error) => (StatusCode::BAD_REQUEST, Json(json!({"error":error}))).into_response(),
    }
}
async fn session(state: Arc<Service>, mut socket: WebSocket) {
    if state.legacy_mode {
        legacy_session(state, socket).await;
        return;
    }
    let hello =
        json!({"type":"transport:hello","protocolVersion":2,"sourceSessionId":state.session})
            .to_string();
    if socket.send(Message::Text(hello.into())).await.is_err() {
        return;
    }
    let subscribe = match tokio::time::timeout(Duration::from_secs(5), socket.recv()).await {
        Ok(Some(Ok(Message::Text(text)))) => serde_json::from_str::<Value>(&text).ok(),
        _ => None,
    };
    let Some(subscribe) = subscribe else {
        return;
    };
    let (Some(id), Some(role)) = (subscribe["clientId"].as_str(), subscribe["role"].as_str())
    else {
        return;
    };
    if subscribe["type"] != "transport:subscribe"
        || subscribe["protocolVersion"] != 2
        || id.is_empty()
        || id.len() > 80
        || !["island", "preview", "source"].contains(&role)
    {
        return;
    }
    let (tx, mut rx) = mpsc::channel(64);
    let (cancel, mut cancelled) = watch::channel(false);
    let peer = Peer {
        id: id.into(),
        role: role.into(),
        tx,
        cancel,
    };
    {
        let Ok(mut peers) = state.peers.lock() else {
            return;
        };
        if peers.len() >= 8 || peers.contains_key(id) {
            return;
        }
        peers.insert(id.into(), peer.clone());
    }
    state.send(&peer, json!({"type":"transport:ready"}));
    state.publish_clients();
    let (mut sink, mut stream) = socket.split();
    loop {
        tokio::select! {
            _=cancelled.changed()=>{let _=sink.send(Message::Close(None)).await;break;},
            event=rx.recv()=>{let Some(event)=event else{break;};if sink.send(Message::Text(event.to_string().into())).await.is_err(){break;}},
            frame=stream.next()=>{
                match frame{
                    Some(Ok(Message::Text(text)))=>{match serde_json::from_str::<Value>(&text).map_err(|e|e.to_string()).and_then(|value|state.receive(&peer,value)){Ok(())=>{},Err(error)=>state.send(&peer,json!({"type":"transport:error","reason":error}))}},
                    Some(Ok(Message::Ping(bytes)))=>{if sink.send(Message::Pong(bytes)).await.is_err(){break;}},
                    Some(Ok(Message::Pong(_)))=>{},_=>break,
                }
            }
        }
    }
    if let Ok(mut peers) = state.peers.lock() {
        peers.remove(&peer.id);
    }
    if let Ok(mut pending) = state.experiments.lock() {
        pending.retain(|_, (id, _)| id != &peer.id);
    }
    state.publish_clients();
}
pub fn validate_action(action: &Value) -> Result<(), String> {
    let kind = action["kind"].as_str().ok_or("Missing experiment kind")?;
    match kind {
        "view" => {
            if !action["mode"]
                .as_str()
                .is_some_and(|s| ["open", "compact", "timer"].contains(&s))
            {
                return Err("Invalid view experiment".into());
            }
            if let Some(id) = action.get("scenario") {
                if !id
                    .as_str()
                    .is_some_and(|s| s == "S01" || (2..=15).any(|i| s == format!("S{i:02}")))
                {
                    return Err("Invalid scenario".into());
                }
            }
        }
        "personal" => {
            if !action["command"]
                .as_str()
                .is_some_and(|s| ["start", "pause", "resume", "end"].contains(&s))
            {
                return Err("Invalid personal experiment".into());
            }
            if let Some(duration) = action.get("duration") {
                if !duration
                    .as_u64()
                    .is_some_and(|d| (1000..=3600000).contains(&d))
                {
                    return Err("Invalid timer duration".into());
                }
            }
        }
        "preferences" => {
            let settings = action["settings"]
                .as_object()
                .ok_or("Invalid presentation settings")?;
            for (key, value) in settings {
                match key.as_str() {
                    "reduced" | "quiet" | "compactText" | "backgroundDark" | "hideIdle"
                    | "autoPreview"
                        if value.is_boolean() => {}
                    "dock"
                        if value
                            .as_str()
                            .is_some_and(|s| ["notch", "floating"].contains(&s)) => {}
                    "textScale" if value.as_f64().is_some_and(|v| (1.0..=2.25).contains(&v)) => {}
                    _ => {
                        return Err("Presentation settings cannot grant source authorization".into())
                    }
                }
            }
        }
        _ => return Err("Unsupported experiment action".into()),
    }
    Ok(())
}
async fn legacy_session(state: Arc<Service>, mut socket: WebSocket) {
    let initial = state
        .legacy
        .lock()
        .map(|l| l.snapshot())
        .unwrap_or(Value::Null);
    if socket
        .send(Message::Text(initial.to_string().into()))
        .await
        .is_err()
    {
        return;
    }
    let (tx, mut rx) = mpsc::channel(64);
    let (cancel, mut stopped) = watch::channel(false);
    let peer = Peer {
        id: Uuid::new_v4().to_string(),
        role: "legacy".into(),
        tx,
        cancel,
    };
    {
        let Ok(mut peers) = state.peers.lock() else {
            return;
        };
        if peers.len() >= 8 {
            return;
        }
        peers.insert(peer.id.clone(), peer.clone());
    }
    let (mut sink, mut stream) = socket.split();
    loop {
        tokio::select! {_=stopped.changed()=>break,event=rx.recv()=>{let Some(event)=event else{break;};if sink.send(Message::Text(event.to_string().into())).await.is_err(){break;}},frame=stream.next()=>match frame{
            Some(Ok(Message::Text(text)))=>{let Ok(payload)=serde_json::from_str::<Value>(&text)else{continue;};match payload["type"].as_str(){
                Some("sync")=>{if let Ok(legacy)=state.legacy.lock(){state.send(&peer,legacy.snapshot());}},
                Some("ack")=>{let payload=payload.clone();let _=state.schedule(700,move|state|{if let Ok(mut legacy)=state.legacy.lock(){if let Some(receipt)=legacy.receipt(&payload,now()){state.legacy_publish(receipt);}}});},
                _=>state.send(&peer,json!({"type":"server-error","reason":"Legacy viewer is read-only apart from received-not-treated receipts"})),
            }},Some(Ok(Message::Ping(bytes)))=>{if sink.send(Message::Pong(bytes)).await.is_err(){break;}},Some(Ok(Message::Pong(_)))=>{},_=>break,
        }}
    }
    if let Ok(mut peers) = state.peers.lock() {
        peers.remove(&peer.id);
    }
    state.publish_clients();
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn island_launch_requires_a_live_owned_listener() {
        let state = Service::new(17323, false, false).unwrap();
        assert!(state.require_listener().is_err());
        *state.status.lock().unwrap() = (true, String::new());
        assert!(state.require_listener().is_ok());
        state.shutdown();
        assert!(state.require_listener().is_err());
        assert_eq!(state.status()["listening"], false);
    }
    #[test]
    fn experiments_cannot_write_source_authorization() {
        assert!(
            validate_action(&json!({"kind":"preferences","settings":{"role":"clinician"}}))
                .is_err()
        );
    }
    #[test]
    fn preview_and_desktop_have_separate_sources() {
        let s = Service::new(17323, false, false).unwrap();
        s.simulator(
            json!({"type":"clinical:scenario","scenario":"S03","targetClientId":"preview"}),
            false,
        )
        .unwrap();
        assert_eq!(
            s.snapshot("preview").unwrap()["activities"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            s.snapshot("desktop").unwrap()["activities"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
    }
}
