from pathlib import Path
root=Path(__file__).resolve().parent.parent
def edit(name,old,new):
 p=root/name;s=p.read_text(encoding='utf8');assert old in s,(name,old[:90]);p.write_text(s.replace(old,new),encoding='utf8')
# Wire native platform state into the actual island, without mutating authorized source settings.
edit('src/clinical/ClinicalIsland.tsx',"import {useSurfaceInput} from './useSurfaceInput';","import {useSurfaceInput} from './useSurfaceInput';\nimport {usePlatform} from './usePlatform';")
edit('src/clinical/ClinicalIsland.tsx'," const blocked=c.settings.privacy||c.settings.role==='none',visible=canView(primary,c.settings);\n const hidden=c.settings.locked||c.settings.fullscreen||(c.settings.hideIdle&&c.view==='idle');\n const reduced=c.settings.reduced||systemReduced,unavailable=blocked||(!timerSelected&&!visible);", " const platform=usePlatform(mainRef,primary?versionKey(primary):'idle',c.settings.locked||c.settings.fullscreen);\n const platformPrivate=platform.status.notificationState===1||platform.status.notificationState===4;\n const blocked=c.settings.privacy||c.settings.role==='none'||platformPrivate,visible=canView(primary,c.settings);\n const hidden=c.settings.locked||c.settings.fullscreen||platformPrivate||(platform.suspended&&primary?.priority!=='important')||(c.settings.hideIdle&&c.view==='idle');\n const reduced=c.settings.reduced||systemReduced||!platform.status.animationsEnabled,unavailable=blocked||(!timerSelected&&!visible);")
edit('src/clinical/ClinicalIsland.tsx',"data-rim={String(c.settings.backgroundDark)}","data-rim={String(c.settings.backgroundDark||platform.dark)}")
edit('src/clinical/ClinicalIsland.tsx',"aria-live=\"polite\">{hidden?", "aria-live={primary?.priority==='important'?'assertive':'polite'}>{hidden?")
edit('src/clinical/usePlatform.ts',"[1,2,3,4].includes(status.notificationState)","[1,2,3,4,6].includes(status.notificationState)")
# Native shadows remain fully noninteractive; shape/position are driven only by finite transitions.
edit('src-tauri/src/clinical_window.rs',"#[serde(default)]polygons:Option<Vec<Vec<[f64;2]>>>}","#[serde(default)]polygons:Option<Vec<Vec<[f64;2]>>>,#[serde(default)]top:f64}")
edit('src-tauri/src/clinical_window.rs',"polygons:Option<Vec<Vec<[f64;2]>>>,expanded:Option<bool>)", "polygons:Option<Vec<Vec<[f64;2]>>>,expanded:Option<bool>,shadow_alpha:Option<f64>,top:Option<f64>)")
edit('src-tauri/src/clinical_window.rs',"Shape{width:body_width,height,radius,ear,polygons};validate", "Shape{width:body_width,height,radius,ear,polygons,top:top.unwrap_or(0.0)};validate")
edit('src-tauri/src/clinical_window.rs'," let stage=phase.as_deref()", " if !target.top.is_finite()||!(0.0..=12.0).contains(&target.top)||shadow_alpha.is_some_and(|a|!a.is_finite()||!(0.0..=1.0).contains(&a)){return Err(\"Invalid shadow geometry\".into());}\n let stage=phase.as_deref()")
edit('src-tauri/src/clinical_window.rs',"if !visible{ffi::ShowWindow(hwnd.0 as _,0);", "if !visible{crate::clinical_shadow::hide();ffi::ShowWindow(hwnd.0 as _,0);")
edit('src-tauri/src/clinical_window.rs',"  record(&window,\"clinical-layout\",", "  if let Err(error)=crate::clinical_shadow::draw(&window,body_width,height,radius,target.top,shadow_alpha.unwrap_or(0.0)){record(&window,\"clinical-shadow-error\",json!({\"reason\":error}));}\n  record(&window,\"clinical-layout\",")
edit('src/clinical/useClinicalLayout.ts',"epoch,sequence:++order,phase,expanded:requestedView==='expanded',bodyWidth:g.width", "epoch,sequence:++order,phase,expanded:requestedView==='expanded',top:g.top??0,shadowAlpha:reduced?0:Math.max(0,Math.min(1,(g.height-36)/52)),bodyWidth:g.width")
# A system foreground event is not evidence that focus-assist or screen sharing can be fully detected.
edit('src-tauri/src/lib.rs',"api.prevent_close(); let _ = window.hide();", "api.prevent_close(); clinical_shadow::hide(); let _ = window.hide();")
# Avoid old black text focus ring/information hierarchy rules leaking into the new presentation.
edit('src/clinical/geometry.ts'," return roundGrid(Math.min(Math.max(base,accessible,natural),Math.max(base,cap)));", " return Math.max(32,Math.floor(Math.min(Math.max(base,accessible,natural),cap)/4)*4);")
# Single visual owner and immediate authorization removal remain unchanged. Remove per-render debug churn.
edit('src/clinical/useClinicalLayout.ts',"width:mainWidth*factor,height:mainHeight*factor", "width:mainWidth*factor,height:mainHeight*factor")
print('Native shadow, system state and geometric cap integrated')
