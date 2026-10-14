//! Persist one display preference outside the ephemeral clinical WebView profile.
//! No source identifiers, patient content, OS accessibility writes or background work.
use serde::{Deserialize,Serialize};
use std::{fs,io::Write,path::Path,sync::Mutex};
use tauri::{AppHandle,Emitter,Manager,WebviewWindow};
#[derive(Clone,Copy,Debug,Default,Deserialize,Serialize,PartialEq)]
#[serde(rename_all="lowercase")]
pub enum Preference { #[default] System, Full, Reduced }
#[derive(Default)]
pub struct MotionPreferenceState(Mutex<Option<Preference>>);
fn window_allowed(label:&str,url_path:&str)->bool{
 (label=="island"&&url_path.ends_with("clinical.html"))||(label=="workbench"&&url_path.ends_with("workbench.html"))
}
fn ensure(window:&WebviewWindow)->Result<(),String>{
 if !window_allowed(window.label(),window.url().map_err(|e|e.to_string())?.path()) {
  return Err("Motion preference belongs to this application's settings window".into());
 } Ok(())
}
fn path(app:&AppHandle)->Result<std::path::PathBuf,String>{
 Ok(app.path().app_config_dir().map_err(|e|e.to_string())?.join("motion-preference.json"))
}
#[tauri::command]
pub fn get_motion_preference(app:AppHandle,window:WebviewWindow,state:tauri::State<'_,MotionPreferenceState>)->Result<Preference,String>{
 ensure(&window)?;let mut guard=state.0.lock().map_err(|_|"Motion preference unavailable")?;
 if let Some(value)=*guard{return Ok(value);}
 let file=path(&app)?;
 let value=if fs::metadata(&file).is_ok_and(|m|m.len()<=64){fs::read(file).ok().and_then(|b|serde_json::from_slice::<Preference>(&b).ok()).unwrap_or_default()}else{Preference::default()};
 *guard=Some(value);Ok(value)
}
#[tauri::command]
pub fn set_motion_preference(app:AppHandle,window:WebviewWindow,state:tauri::State<'_,MotionPreferenceState>,preference:Preference)->Result<(),String>{
 ensure(&window)?;let mut guard=state.0.lock().map_err(|_|"Motion preference unavailable")?;
 write_preference(&path(&app)?,preference)?;
 *guard=Some(preference);drop(guard);
 app.emit("island://motion-preference",preference).map_err(|e|e.to_string())
}
fn write_preference(file:&Path,preference:Preference)->Result<(),String>{
 let folder=file.parent().ok_or("No app configuration folder")?;
 fs::create_dir_all(folder).map_err(|e|e.to_string())?;
 let temporary=file.with_extension("tmp");
 let bytes=serde_json::to_vec(&preference).map_err(|e|e.to_string())?;
 // Rust's Windows rename uses MOVEFILE_REPLACE_EXISTING, including subsequent saves.
 let result=(||{let mut output=fs::File::create(&temporary)?;output.write_all(&bytes)?;output.sync_all()?;drop(output);fs::rename(&temporary,file)})();
 if let Err(error)=result{let _=fs::remove_file(&temporary);return Err(format!("Unable to save display preference: {error}"));}
 Ok(())
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn unset_is_system_and_no_boolean_bypasses_accessibility(){assert_eq!(Preference::default(),Preference::System);assert!(serde_json::from_str::<Preference>("true").is_err());assert!(serde_json::from_str::<Preference>("\"unknown\"").is_err());}
 #[test]fn persisted_value_contains_only_display_choice(){for value in [Preference::System,Preference::Full,Preference::Reduced]{let bytes=serde_json::to_vec(&value).unwrap();assert!(bytes.len()<16);assert_eq!(serde_json::from_slice::<Preference>(&bytes).unwrap(),value);}}
 #[test]fn settings_window_is_scoped_to_its_application_entry(){
  assert!(window_allowed("island","/clinical.html"));assert!(window_allowed("workbench","/workbench.html"));
  for (label,path) in [("workbench","/clinical.html"),("island","/workbench.html"),("studio","/clinical.html"),("clinical-source","/clinical.html")]{assert!(!window_allowed(label,path));}
 }
 #[test]fn repeated_atomic_saves_replace_the_existing_display_enum(){
  use std::time::{SystemTime,UNIX_EPOCH};
  let folder=std::env::temp_dir().join(format!("samewave-motion-test-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
  fs::create_dir(&folder).unwrap();let file=folder.join("motion-preference.json");
  let expected=[Preference::System,Preference::Full,Preference::Reduced,Preference::Full,Preference::System];
  let actual=expected.map(|value|{write_preference(&file,value).unwrap();serde_json::from_slice::<Preference>(&fs::read(&file).unwrap()).unwrap()});
  assert_eq!(actual,expected);assert!(!file.with_extension("tmp").exists());fs::remove_file(file).unwrap();fs::remove_dir(folder).unwrap();
 }
}
