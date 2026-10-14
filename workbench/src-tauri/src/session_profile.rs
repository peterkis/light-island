//! Cleanup is restricted to marked, exclusively owned workbench sessions.
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
static LOCK: Mutex<Option<fs::File>> = Mutex::new(None);
const MARKER: &str = "samewave-workbench-owned-session-v1";
fn root() -> PathBuf {
    std::env::temp_dir().join("samewave-workbench-prototype")
}
fn lock(path: &Path) -> std::io::Result<fs::File> {
    let mut options = fs::OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    options.open(path.join(".samewave-session.lock"))
}
pub fn create() -> Result<PathBuf, String> {
    let root = root();
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())?.flatten() {
        cleanup(&entry.path());
    }
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let path = root.join(format!("session-{}-{stamp}", std::process::id()));
    fs::create_dir(&path).map_err(|e| e.to_string())?;
    fs::write(path.join(".samewave-owner"), MARKER).map_err(|e| e.to_string())?;
    *LOCK.lock().map_err(|_| "Session lock unavailable")? =
        Some(lock(&path).map_err(|e| e.to_string())?);
    Ok(path)
}
pub fn release() {
    if let Ok(mut guard) = LOCK.lock() {
        guard.take();
    }
}
pub fn cleanup(path: &Path) -> bool {
    let (Ok(root), Ok(path)) = (root().canonicalize(), path.canonicalize()) else {
        return false;
    };
    if path.parent() != Some(root.as_path())
        || !path
            .file_name()
            .is_some_and(|s| s.to_string_lossy().starts_with("session-"))
        || fs::read_to_string(path.join(".samewave-owner"))
            .ok()
            .as_deref()
            != Some(MARKER)
        || lock(&path).is_err()
    {
        return false;
    }
    fs::remove_dir_all(path).is_ok()
}
