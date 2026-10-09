//! Stable canvas; finite, ordered silhouette handoff for the restored U-notch motion.
//! No per-frame HWND resizing, idle polling, arbitrary external URLs or clinical writes.
use serde_json::{json, Value};
use serde::Deserialize;
use crate::notch_geometry::EpochGuard;
use std::sync::{Mutex,OnceLock};
use tauri::{AppHandle,Manager,WebviewWindow};
use crate::hover_diagnostics::record;
static TOKENS:OnceLock<Value>=OnceLock::new();
static EPOCH:Mutex<EpochGuard>=Mutex::new(EpochGuard{epoch:0,sequence:0,closed:false});
#[derive(Clone,Deserialize)]
pub struct Shape{width:f64,height:f64,radius:f64,ear:f64,#[serde(default)]polygons:Option<Vec<Vec<[f64;2]>>>,#[serde(default)]top:f64,#[serde(default)]shift:f64}
fn number(path:&str)->f64{TOKENS.get_or_init(||serde_json::from_str(include_str!("../../src/clinical/tokens.json")).expect("generated UI tokens")).pointer(path).and_then(Value::as_f64).expect("numeric UI token")}
fn ensure(window:&WebviewWindow)->Result<(),String>{
 if window.label()!="island"||!window.url().map_err(|e|e.to_string())?.path().ends_with("clinical.html"){return Err("Clinical island window required".into());}Ok(())
}
#[cfg(target_os="windows")]
mod ffi{
 use std::ffi::c_void;
 #[repr(C)]#[derive(Default)]pub struct Rect{pub left:i32,pub top:i32,pub right:i32,pub bottom:i32}
 #[repr(C)]#[derive(Clone,Copy)]pub struct Point{pub x:i32,pub y:i32}
 #[repr(C)]pub struct MonitorInfo{pub size:u32,pub monitor:Rect,pub work:Rect,pub flags:u32}
 #[link(name="user32")]extern "system"{
  pub fn GetWindowRect(h:*mut c_void,r:*mut Rect)->i32;
  pub fn GetClientRect(h:*mut c_void,r:*mut Rect)->i32;
  pub fn GetDpiForWindow(h:*mut c_void)->u32;
  pub fn GetWindowRgn(h:*mut c_void,r:*mut c_void)->i32;
  pub fn SetWindowRgn(h:*mut c_void,r:*mut c_void,redraw:i32)->i32;
  pub fn SetWindowPos(h:*mut c_void,after:*mut c_void,x:i32,y:i32,w:i32,height:i32,flags:u32)->i32;
  pub fn ShowWindow(h:*mut c_void,mode:i32)->i32;
  pub fn IsWindowVisible(h:*mut c_void)->i32;
  pub fn MonitorFromPoint(p:Point,flags:u32)->*mut c_void;
  pub fn GetMonitorInfoW(h:*mut c_void,info:*mut MonitorInfo)->i32;
 }
 #[link(name="gdi32")]extern "system"{
  pub fn CreatePolygonRgn(points:*const Point,n:i32,mode:i32)->*mut c_void;
  pub fn CreateRectRgn(x:i32,y:i32,r:i32,b:i32)->*mut c_void;
  pub fn CombineRgn(dest:*mut c_void,a:*mut c_void,b:*mut c_void,mode:i32)->i32;
  pub fn EqualRgn(a:*mut c_void,b:*mut c_void)->i32;
  pub fn DeleteObject(h:*mut c_void)->i32;
 }
}
struct Plan{scale:f64,x:i32,y:i32,w:u32,h:u32,available:f64,available_height:f64}
fn plan(window:&WebviewWindow)->Result<Plan,String>{
 let m=window.primary_monitor().map_err(|e|e.to_string())?.ok_or("Primary display unavailable")?;
 let scale=m.scale_factor();let p=m.position();let size=m.size();let mut top=p.y;let mut available_height=size.height as f64/scale;
 #[cfg(target_os="windows")]unsafe{
  let monitor=ffi::MonitorFromPoint(ffi::Point{x:p.x,y:p.y},1);
  let mut info=ffi::MonitorInfo{size:std::mem::size_of::<ffi::MonitorInfo>() as u32,monitor:ffi::Rect::default(),work:ffi::Rect::default(),flags:0};
  if ffi::GetMonitorInfoW(monitor,&mut info)!=0{top=info.work.top.max(p.y);available_height=(info.work.bottom-top).max(1) as f64/scale;}
 }
 let pad=(number("/geometry/pixelBoundaryTolerance")+number("/material/rimWidth")*scale/2.0+1.0).ceil();
 let max_w=2.0*(number("/geometry/earRadius")+44.0)+number("/geometry/expanded/preferredMaxWidth")+(number("/geometry/expanded/preferredMaxWidth")-96.0)*number("/motion/budgets/expand");
 let max_h=480.0_f64.min(available_height*0.6).max(580.0_f64.min((available_height-16.0).max(120.0)))+38.0;
 let w=((max_w*scale+2.0*pad).ceil() as u32).min(size.width);
 let h=(max_h*scale+pad).ceil() as u32;
 Ok(Plan{scale,x:p.x+((size.width-w)/2) as i32,y:top,w,h,available:size.width as f64/scale,available_height})
}
fn canvas(window:&WebviewWindow,p:&Plan)->Result<(),String>{
 #[cfg(target_os="windows")]unsafe{
  let h=window.hwnd().map_err(|e|e.to_string())?;let mut old=ffi::Rect::default();
  if ffi::GetWindowRect(h.0 as _,&mut old)==0{return Err("Native window rectangle unavailable".into());}
  if old.left!=p.x||old.top!=p.y||old.right-old.left!=p.w as i32||old.bottom-old.top!=p.h as i32{
   record(window,"clinical-window-change",json!({"x":p.x,"y":p.y,"width":p.w,"height":p.h}));
   if ffi::SetWindowPos(h.0 as _,-1isize as _,p.x,p.y,p.w as i32,p.h as i32,0x0010|0x0200)==0{return Err("Native canvas resize failed".into());}
  }
 }
 Ok(())
}
#[tauri::command]
pub fn clinical_metrics(window:WebviewWindow)->Result<Value,String>{ensure(&window)?;let p=plan(&window)?;Ok(json!({"available":p.available,"height":p.available_height,"scale":p.scale,"canvasWidth":p.w,"canvasHeight":p.h,"y":p.y,"topReserved":p.y>window.primary_monitor().ok().flatten().map(|m|m.position().y).unwrap_or(0)}))}
pub fn redock(window:&WebviewWindow)->Result<(),String>{let p=plan(window)?;canvas(window,&p)}

fn contour(w:f64,h:f64,radius:f64,ear:f64)->Vec<[f64;2]>{
 let e=ear.min(w/8.0).min(h/4.0);let r=radius.min((w-2.0*e)/2.0).min(h-e);
 let mut p=vec![[0.0,0.0],[w,0.0]];
 fn curve(p:&mut Vec<[f64;2]>,a:[f64;2],b:[f64;2],end:[f64;2]){
  let start=*p.last().unwrap();for i in 1..=12{let t=i as f64/12.0;let s=1.0-t;
   p.push([s.powi(3)*start[0]+3.0*s*s*t*a[0]+3.0*s*t*t*b[0]+t.powi(3)*end[0],s.powi(3)*start[1]+3.0*s*s*t*a[1]+3.0*s*t*t*b[1]+t.powi(3)*end[1]]);}
 }
 curve(&mut p,[w-0.55*e,0.0],[w-e,0.45*e],[w-e,e]);p.push([w-e,h-r]);
 curve(&mut p,[w-e,h-0.55*r],[w-e,h-0.35*r],[w-e-0.175*r,h-0.175*r]);
 curve(&mut p,[w-e-0.35*r,h],[w-e-0.55*r,h],[w-e-r,h]);p.push([e+r,h]);
 curve(&mut p,[e+0.55*r,h],[e+0.35*r,h],[e+0.175*r,h-0.175*r]);
 curve(&mut p,[e,h-0.35*r],[e,h-0.55*r],[e,h-r]);p.push([e,e]);
 curve(&mut p,[e,0.45*e],[0.55*e,0.0],[0.0,0.0]);p
}
fn validate(g:&Shape)->Result<(),String>{
 if !g.shift.is_finite()||g.shift.abs()>128.0{return Err("Invalid bounded gesture offset".into());}
 let max=number("/geometry/expanded/preferredMaxWidth");let extra=(max-96.0)*number("/motion/budgets/expand");
 if [g.width,g.height,g.radius,g.ear].iter().any(|v|!v.is_finite())||!(96.0..=max+extra).contains(&g.width)||!(24.0..=610.0).contains(&g.height)||!(0.0..=64.0).contains(&g.radius)||!(0.0..=12.0).contains(&g.ear){return Err("Clinical geometry exceeds UI limits".into());}
 if let Some(polys)=&g.polygons{if polys.is_empty()||polys.len()>3||polys.iter().any(|p|p.len()<4||p.len()>512||p.iter().any(|v|!v[0].is_finite()||!v[1].is_finite()||v[0]< -12.01||v[0]>g.width+72.0||v[1]< -0.01||v[1]>g.height+12.0)){return Err("Invalid bounded UI silhouette".into());}}Ok(())
}
#[cfg(target_os="windows")]
unsafe fn add_outline(region:*mut std::ffi::c_void,g:&Shape,canvas:u32,scale:f64)->Result<(),String>{
 let offset=(canvas as f64-g.width*scale)/2.0+g.shift*scale;let outlines=g.polygons.clone().unwrap_or_else(||vec![contour(g.width,g.height,g.radius,g.ear)]);
 if outlines.iter().flatten().any(|pt|offset+pt[0]*scale<2.0||offset+pt[0]*scale>canvas as f64-2.0){return Err("Gesture silhouette exceeds retained canvas".into());}
 let fringe=number("/geometry/pixelBoundaryTolerance") as i32;
 for points in &outlines{for dy in -fringe..=fringe{for dx in -fringe..=fringe{
  let native:Vec<ffi::Point>=points.iter().map(|pt|ffi::Point{x:(offset+pt[0]*scale).round() as i32+dx,y:(pt[1]*scale).round() as i32+dy}).collect();
  let part=ffi::CreatePolygonRgn(native.as_ptr(),native.len() as i32,2);
  if part.is_null(){return Err("Cannot allocate outline".into());}
  let ok=ffi::CombineRgn(region,region,part,2);ffi::DeleteObject(part);if ok==0{return Err("Cannot combine outline".into());}
 }}}
 Ok(())
}
#[tauri::command]
pub fn clinical_layout(window:WebviewWindow,epoch:u64,body_width:f64,height:f64,radius:f64,ear:f64,visible:bool,sequence:Option<u64>,phase:Option<String>,previous:Option<Shape>,polygons:Option<Vec<Vec<[f64;2]>>>,expanded:Option<bool>,shadow_alpha:Option<f64>,top:Option<f64>,shift:Option<f64>)->Result<bool,String>{
 ensure(&window)?;
 let target=Shape{width:body_width,height,radius,ear,polygons,top:top.unwrap_or(0.0),shift:shift.unwrap_or(0.0)};validate(&target)?;
 if let Some(g)=&previous{validate(g)?;}
 if !target.top.is_finite()||!(0.0..=12.0).contains(&target.top)||shadow_alpha.is_some_and(|a|!a.is_finite()||!(0.0..=1.0).contains(&a)){return Err("Invalid shadow geometry".into());}
 let stage=phase.as_deref().unwrap_or("commit");
 if !["frame","commit","cancel"].contains(&stage){return Err("Invalid motion phase".into());}
 let mut guard=EPOCH.lock().map_err(|_|"Layout epoch unavailable")?;
 if stage=="cancel"{guard.cancel(epoch);record(&window,"clinical-cancel",json!({"epoch":epoch}));return Ok(true);}
 if epoch<guard.epoch||(epoch==guard.epoch&&guard.closed){record(&window,"clinical-stale",json!({"epoch":epoch}));return Ok(false);}
 if epoch>guard.epoch{guard.begin(epoch);}
 if !guard.frame(epoch,sequence.unwrap_or(1)){return Ok(false);}
 if stage=="commit"{guard.commit(epoch);}
 let p=plan(&window)?;canvas(&window,&p)?;
 #[cfg(target_os="windows")]unsafe{
  let hwnd=window.hwnd().map_err(|e|e.to_string())?;
  crate::clinical_input::set_surface(hwnd.0 as isize,visible&&expanded.unwrap_or(false));
  if !visible{crate::clinical_shadow::hide();ffi::ShowWindow(hwnd.0 as _,0);record(&window,"clinical-hidden",json!({"epoch":epoch}));return Ok(true);}
  let mut client=ffi::Rect::default();if ffi::GetClientRect(hwnd.0 as _,&mut client)==0{return Err("Clinical client rectangle unavailable".into());}
  let scale=ffi::GetDpiForWindow(hwnd.0 as _) as f64/96.0;if scale<=0.0{return Err("Clinical DPI unavailable".into());}
  let region=ffi::CreateRectRgn(0,0,0,0);if region.is_null(){return Err("Cannot allocate clinical region".into());}
  let combined=(||{
   add_outline(region,&target,(client.right-client.left) as u32,scale)?;
   // Only the previously painted and next frame: never use the whole canvas as a hit region.
   if stage=="frame"{if let Some(old)=&previous{add_outline(region,old,(client.right-client.left) as u32,scale)?;}}
   Ok::<(),String>(())
  })();
  if let Err(e)=combined{ffi::DeleteObject(region);return Err(e);}
  let old=ffi::CreateRectRgn(0,0,0,0);let equal=!old.is_null()&&ffi::GetWindowRgn(hwnd.0 as _,old)>0&&ffi::EqualRgn(old,region)!=0;
  if !old.is_null(){ffi::DeleteObject(old);}
  if equal{ffi::DeleteObject(region);}else if ffi::SetWindowRgn(hwnd.0 as _,region,0)==0{ffi::DeleteObject(region);return Err("Cannot install clinical outline".into());}
  if ffi::IsWindowVisible(hwnd.0 as _)==0{ffi::ShowWindow(hwnd.0 as _,4);}
  if let Err(error)=crate::clinical_shadow::draw(&window,body_width,height,radius,target.top,shadow_alpha.unwrap_or(0.0)){record(&window,"clinical-shadow-error",json!({"reason":error}));}
  record(&window,"clinical-layout",json!({"epoch":epoch,"sequence":sequence,"phase":stage,"bodyWidth":body_width,"height":height,"equalRegion":equal}));
 }
 Ok(true)
}

#[tauri::command]
pub async fn open_clinical_source(app:AppHandle,window:WebviewWindow,ticket:String)->Result<(),String>{
 if !["island","studio"].contains(&window.label())||ticket.len()!=36||!ticket.chars().all(|c|c.is_ascii_hexdigit()||c=='-'){return Err("Invalid local source ticket".into());}
 if let Some(w)=app.get_webview_window("clinical-source"){
  let mut url=w.url().map_err(|e|e.to_string())?;url.set_query(Some(&format!("source={ticket}")));w.navigate(url).map_err(|e|e.to_string())?;w.show().map_err(|e|e.to_string())?;w.set_focus().map_err(|e|e.to_string())?;
 }else{
  let mut builder=tauri::WebviewWindowBuilder::new(&app,"clinical-source",tauri::WebviewUrl::App(format!("clinical.html?source={ticket}").into())).title("模拟来源边界 · 不连接真实临床系统").inner_size(760.0,700.0).min_inner_size(500.0,400.0).center();
  if let Some(args)=app.config().app.windows.iter().find(|w|w.label=="island").and_then(|w|w.additional_browser_args.as_ref()) {
   builder=builder.additional_browser_args(args);
  }
  if let Some(config)=app.config().app.windows.iter().find(|w|w.label=="island") {if let Some(path)=&config.data_directory{builder=builder.data_directory(path.clone());}builder=builder.incognito(config.incognito);}
  builder.build().map_err(|e|e.to_string())?;
 }Ok(())
}
#[tauri::command]
pub fn close_clinical_source(window:WebviewWindow)->Result<(),String>{if window.label()!="clinical-source"{return Err("Source window required".into());}window.close().map_err(|e|e.to_string())}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn accepted_u_contour_stays_inside_total_width(){for scale in [1.0,1.25,1.5,1.75,2.0]{for (w,h,r) in [(180.0,34.0,18.0),(280.0,40.0,20.0),(400.0,320.0,32.0),(560.0,480.0,32.0)]{let pts=contour(w,h,r,7.0);assert!(pts.iter().all(|p|p[0]>=-0.001&&p[0]<=w+0.001&&p[1]>=-0.001&&p[1]<=h+0.001));assert!((pts[0][0]*scale).abs()<0.001);}}}
 #[test]fn token_source_has_native_safety_contract(){assert_eq!(number("/validation/nativeGeometryMutationsPerNormalTransitionMax"),0.0);assert_eq!(number("/geometry/earRadius"),10.0);}
 #[test]fn reader_overshoot_is_bounded_and_invalid_geometry_is_rejected(){
  let shape=Shape{width:400.0,height:590.0,radius:44.0,ear:10.0,top:0.0,shift:0.0,polygons:None};
  assert!(validate(&shape).is_ok());assert!(validate(&Shape{height:611.0,..shape.clone()}).is_err());assert!(validate(&Shape{height:f64::NAN,..shape}).is_err());
 }
}
