const INSTAGRAM_HELPERS: &str = include_str!("injection.js");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_page_load(|webview, _payload| {
            if let Err(error) = webview.eval(INSTAGRAM_HELPERS) {
                eprintln!("failed to install Instagram helpers: {error}");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running IG Publisher");
}
