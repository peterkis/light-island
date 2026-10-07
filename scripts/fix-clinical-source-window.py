from pathlib import Path
root = Path(__file__).resolve().parent.parent
p = root / 'src-tauri/src/lib.rs'
s = p.read_text(encoding='utf8')
s = s.replace('    tauri::WebviewWindowBuilder::new(&app, "studio",', '    let mut builder = tauri::WebviewWindowBuilder::new(&app, "studio",')
s = s.replace('        .min_inner_size(900.0, 700.0).center().build().map_err(|e| e.to_string())?;', '''        .min_inner_size(900.0, 700.0).center();
    // A shared WebView2 data directory requires identical browser arguments in every window.
    // Read the existing config: normal launches have no debugging arguments.
    if let Some(args) = app.config().app.windows.iter().find(|w|w.label=="island").and_then(|w|w.additional_browser_args.as_ref()) {
        builder = builder.additional_browser_args(args);
    }
    builder.build().map_err(|e|e.to_string())?;''')
p.write_text(s, encoding='utf8')
p = root / 'src-tauri/src/clinical_window.rs'
s = p.read_text(encoding='utf8')
s = s.replace('  tauri::WebviewWindowBuilder::new(&app,"clinical-source",', '  let mut builder=tauri::WebviewWindowBuilder::new(&app,"clinical-source",')
s = s.replace('.min_inner_size(500.0,400.0).center().build().map_err(|e|e.to_string())?;', '''.min_inner_size(500.0,400.0).center();
  if let Some(args)=app.config().app.windows.iter().find(|w|w.label=="island").and_then(|w|w.additional_browser_args.as_ref()) {
   builder=builder.additional_browser_args(args);
  }
  builder.build().map_err(|e|e.to_string())?;''')
p.write_text(s, encoding='utf8')
p = root / 'playwright.config.ts'
s = p.read_text(encoding='utf8').replace('  webServer: [', '''  webServer: [
    { command: 'npm run clinical:server', url: 'http://127.0.0.1:17322/api/clinical-state', reuseExistingServer: true, timeout: 60000 },''')
p.write_text(s, encoding='utf8')
print('Consistent WebView2 arguments for the existing shared profile; QA remains explicit-only.')
