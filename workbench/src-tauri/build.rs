fn main() {
    // One linker manifest serves the application and library test executables.
    // Embedding it through both resource.lib and /MANIFEST causes duplicate ID 1.
    let attributes=tauri_build::Attributes::new().windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest());
    if let Err(error)=tauri_build::try_build(attributes){eprintln!("{error}");std::process::exit(1);}
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref()==Ok("windows") {
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
    }
}
