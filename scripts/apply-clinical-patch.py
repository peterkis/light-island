from pathlib import Path
import json,subprocess
root=Path.cwd()
assert (root/'docs/prd/Clinical-Island-Scenarios.md').exists(), 'Run at the intended project root'
def replace(path,old,new):
 p=root/path;s=p.read_text(encoding='utf8');assert old in s, f'Expected baseline missing in {path}';p.write_text(s.replace(old,new),encoding='utf8')
replace('vite.config.ts',"build: { target:","build: { rollupOptions: { input: ['index.html', 'clinical.html'] }, target:")
p=root/'package.json';v=json.loads(p.read_text());v['scripts']['tokens:clinical']='node scripts/generate-clinical-tokens.mjs';v['scripts']['build']='npm run tokens:clinical && tsc -b && vite build';p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Keep index.html/--legacy for fault-chain regressions; production prototype starts the read-only clinical surface.
p=root/'src-tauri/tauri.conf.json';v=json.loads(p.read_text());v['app']['windows'][0]['url']='clinical.html?view=island';p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
p=root/'src-tauri/capabilities/default.json';v=json.loads(p.read_text());v['windows'].append('clinical-source');p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf8')
replace('server/demo-server.mjs',"import http from 'node:http';","import http from 'node:http';\nimport { createClinicalDemo } from './clinical-demo.mjs';")
replace('server/demo-server.mjs',"const wss = new WebSocketServer", "const clinical = createClinicalDemo(broadcast);\nconst wss = new WebSocketServer")
replace('server/demo-server.mjs',"  if (url.pathname === '/api/state')", "  if (url.pathname === '/api/clinical-state') return json(res, 200, clinical.snapshot());\n  if (url.pathname === '/api/state')")
replace('server/demo-server.mjs',"  if (!data || typeof data !== 'object') return;", "  if (!data || typeof data !== 'object') return;\n  if (clinical.handle(data, event => client?.send(JSON.stringify(event)))) return;")
replace('src-tauri/src/lib.rs','mod notch_window;', '''mod notch_window;
mod clinical_window;
use clinical_window::{clinical_layout, clinical_metrics, open_clinical_source, close_clinical_source};''')
replace('src-tauri/src/lib.rs',"fn send_wire(payload: Value, state:","fn send_wire(window: tauri::WebviewWindow, payload: Value, state:")
replace('src-tauri/src/lib.rs','    if !["ack", "demo", "configure", "reset", "view"].contains(&kind) { return Err("Unsupported event type".into()); }', '''    let clinical = window.url().map_err(|e|e.to_string())?.path().ends_with("clinical.html");
    if clinical {
        let readonly = ["clinical:sync", "clinical:refresh", "clinical:open", "clinical:source-read", "clinical:personal"];
        let simulator = ["clinical:scenario", "clinical:configure", "clinical:reset", "clinical:view"];
        if !readonly.contains(&kind) && !(window.label()=="studio" && simulator.contains(&kind)) { return Err("Clinical surface is read-only; simulator commands require the studio".into()); }
    } else if !["ack", "demo", "configure", "reset", "view"].contains(&kind) { return Err("Unsupported event type".into()); }''')
replace('src-tauri/src/lib.rs','    notch_window::redock(&app.get_webview_window("island").ok_or("Island unavailable")?)','''    let w=app.get_webview_window("island").ok_or("Island unavailable")?;
    if std::env::args().any(|a|a=="--legacy") { notch_window::redock(&w) } else { clinical_window::redock(&w) }''')
replace('src-tauri/src/lib.rs','fn open_studio(app: AppHandle)', 'async fn open_studio(app: AppHandle)')
replace('src-tauri/src/lib.rs','tauri::WebviewUrl::App("index.html".into())','tauri::WebviewUrl::App(if std::env::args().any(|a|a=="--legacy") { "index.html" } else { "clinical.html" }.into())')
replace('src-tauri/src/lib.rs','let mut context = tauri::generate_context!();','''let mut context = tauri::generate_context!();
    if std::env::args().any(|a|a=="--legacy") {
        if let Some(w)=context.config_mut().app.windows.iter_mut().find(|w|w.label=="island") { w.url=tauri::WebviewUrl::App("index.html?view=island".into()); }
    }''')
replace('src-tauri/src/lib.rs','tauri_plugin_single_instance::init(|app, _, _| { let _ = open_studio(app.clone()); })','tauri_plugin_single_instance::init(|app, _, _| { let app=app.clone(); tauri::async_runtime::spawn(async move { let _=open_studio(app).await; }); })')
replace('src-tauri/src/lib.rs','generate_handler![update_island_region,','generate_handler![clinical_layout, clinical_metrics, open_clinical_source, close_clinical_source, update_island_region,')
replace('src-tauri/src/lib.rs','"studio" => { let _ = open_studio(app.clone()); },','"studio" => { let app=app.clone(); tauri::async_runtime::spawn(async move { let _=open_studio(app).await; }); },')
replace('src-tauri/src/lib.rs','if std::env::args().any(|a| a == "--studio") { let _ = open_studio(app.handle().clone()); }','if std::env::args().any(|a| a == "--studio") { let app=app.handle().clone(); tauri::async_runtime::spawn(async move { let _=open_studio(app).await; }); }')
subprocess.run(['node','scripts/generate-clinical-tokens.mjs'],check=True)
print('Clinical modules integrated; legacy entrypoints and geometry code retained')
