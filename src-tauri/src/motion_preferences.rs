//! Persist one display preference outside the ephemeral clinical WebView profile.
//! No source identifiers, patient content, OS accessibility writes or background work.
use serde::{Deserialize,Serialize};
use std::{fs,io::Write,sync::Mutex};
use tauri::{AppHandle,Emitter,Manager,WebviewWindow};
#[derive(Clone,Copy,Debug,Default,Deserialize,Serialize,PartialEq)]
#[serde(rename_all="lowercase")]
pub enum Preference { #[default] System, Full, Reduced }
#[derive(Default)]
pub struct MotionPreferenceState(Mutex<Option<Preference>>);
fn ensure(window:&WebviewWindow)->Result<(),String>{
 if !["island","studio"].contains(&window.label()) || !window.url().map_err(|e|e.to_string())?.path().ends_with("clinical.html") {
  return Err("Motion preference belongs to the clinical app/settings windows".into());
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
 let file=path(&app)?;let folder=file.parent().ok_or("No app configuration folder")?;
 fs::create_dir_all(folder).map_err(|e|e.to_string())?;
 let temporary=file.with_extension("tmp");
 let bytes=serde_json::to_vec(&preference).map_err(|e|e.to_string())?;
 let result=(||{let mut output=fs::File::create(&temporary)?;output.write_all(&bytes)?;output.sync_all()?;drop(output);fs::rename(&temporary,&file)})();
 if let Err(error)=result{let _=fs::remove_file(&temporary);return Err(format!("Unable to save display preference: {error}"));}
 *guard=Some(preference);drop(guard);
 app.emit("island://motion-preference",preference).map_err(|e|e.to_string())
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn unset_is_system_and_no_boolean_bypasses_accessibility(){assert_eq!(Preference::default(),Preference::System);assert!(serde_json::from_str::<Preference>("true").is_err());assert!(serde_json::from_str::<Preference>("\"unknown\"").is_err());}
 #[test]fn persisted_value_contains_only_display_choice(){for value in [Preference::System,Preference::Full,Preference::Reduced]{let bytes=serde_json::to_vec(&value).unwrap();assert!(bytes.len()<16);assert_eq!(serde_json::from_slice::<Preference>(&bytes).unwrap(),value);}}
}
