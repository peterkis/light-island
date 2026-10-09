//! Only application-owned temporary profiles are eligible for cleanup.
use std::{path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH},fs,sync::Mutex};
const MARKER:&str="samewave-prototype-owned-session-v1";
static SESSION_LOCK:Mutex<Option<fs::File>>=Mutex::new(None);
fn exclusive(path:&Path)->std::io::Result<fs::File>{
 let mut options=fs::OpenOptions::new();options.read(true).write(true).create(true);
 #[cfg(target_os="windows")]{use std::os::windows::fs::OpenOptionsExt;options.share_mode(0);}
 options.open(path.join(".samewave-session.lock"))
}
pub fn create()->Result<PathBuf,String>{
 let root=std::env::temp_dir().join("samewave-island-prototype");fs::create_dir_all(&root).map_err(|e|e.to_string())?;
 for entry in fs::read_dir(&root).map_err(|e|e.to_string())?.flatten(){cleanup(&entry.path());}
 let stamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
 let path=root.join(format!("session-{}-{stamp}",std::process::id()));fs::create_dir(&path).map_err(|e|e.to_string())?;fs::write(path.join(".samewave-owner"),MARKER).map_err(|e|e.to_string())?;
 *SESSION_LOCK.lock().map_err(|_|"Session lock unavailable")?=Some(exclusive(&path).map_err(|e|e.to_string())?);Ok(path)
}
pub fn release_lock(){if let Ok(mut lock)=SESSION_LOCK.lock(){lock.take();}}
pub fn cleanup(path:&Path)->bool{
 let root=std::env::temp_dir().join("samewave-island-prototype");
 let (Ok(root),Ok(target))=(root.canonicalize(),path.canonicalize())else{return false;};
 if target.parent()!=Some(root.as_path())||!target.file_name().is_some_and(|s|s.to_string_lossy().starts_with("session-"))||fs::read_to_string(target.join(".samewave-owner")).ok().as_deref()!=Some(MARKER){return false;}
 if exclusive(&target).is_err(){return false;}
 let webview=target.join("webview");
 if webview.exists(){let Ok(resolved)=webview.canonicalize()else{return false;};if resolved.parent()!=Some(target.as_path())||fs::remove_dir_all(resolved).is_err(){return false;}}
 // WebView2 may still hold files. Retain on failure; the next launch retries the same owned path.
 fs::remove_dir_all(target).is_ok()
}
