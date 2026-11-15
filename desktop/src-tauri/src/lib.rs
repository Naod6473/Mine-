//! Mine!? pour Windows, macOS et Linux : l'interface du serveur, branchée sur yt-dlp en local.
//! Les fichiers arrivent directement dans le dossier Téléchargements de l'ordinateur.

mod args;
mod jobs;
mod tools;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

/// Un téléchargement, au même format que celui du serveur (ui/src/lib/types.ts).
#[derive(Serialize, Clone, Debug)]
pub struct Download {
    pub id: String,
    pub title: String,
    pub url: String,
    pub quality: String,
    pub download_type: String,
    pub codec: String,
    pub format: String,
    pub folder: String,
    pub status: String,
    pub msg: Option<String>,
    pub error: Option<String>,
    pub percent: Option<f64>,
    pub speed: Option<f64>,
    pub eta: Option<f64>,
    pub size: Option<f64>,
    pub filename: Option<String>,
    pub filepath: Option<String>,
    pub thumbnail: Option<String>,
    pub timestamp: u64,
}

impl Download {
    pub fn new(key: &str, r: &args::Request) -> Self {
        Download {
            id: key.to_string(), title: key.to_string(), url: key.to_string(),
            quality: r.quality.clone(), download_type: r.download_type.clone(), codec: r.codec.clone(),
            format: r.format.clone(), folder: String::new(), status: "preparing".into(),
            msg: None, error: None, percent: None, speed: None, eta: None, size: None,
            filename: None, filepath: None, thumbnail: None, timestamp: jobs::now_ns(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Settings { pub download_dir: PathBuf }

pub struct JobHandle { pub keys: Vec<String>, pub kill: Option<tokio::sync::oneshot::Sender<()>> }

#[derive(Default)]
pub struct Shared {
    pub queue: Mutex<BTreeMap<String, Download>>,
    pub done: Mutex<BTreeMap<String, Download>>,
    pub requests: Mutex<HashMap<String, args::Request>>,
    pub jobs: Mutex<HashMap<u64, JobHandle>>,
    pub tools: Mutex<Option<tools::Tools>>,
    pub tools_status: Mutex<tools::Status>,
    pub settings: Mutex<Settings>,
    counter: AtomicU64,
}

impl Default for Settings {
    fn default() -> Self { Settings { download_dir: std::env::temp_dir() } }
}

impl Shared {
    pub fn next_job(&self) -> u64 { self.counter.fetch_add(1, Ordering::Relaxed) }
}

/// Ce qui passe vers l'interface : le nom de l'événement et sa donnée en JSON, comme avec Socket.IO.
#[derive(Serialize, Clone)]
pub struct Wire { pub event: String, pub data: String }

pub fn send<T: Serialize>(app: &AppHandle, event: &str, data: &T) {
    let _ = app.emit("mine", Wire { event: event.into(), data: serde_json::to_string(data).unwrap_or_default() });
}

fn settings_file(app: &AppHandle) -> Option<PathBuf> { app.path().app_config_dir().ok().map(|d| d.join("settings.json")) }

fn save_settings(app: &AppHandle, s: &Settings) {
    if let Some(f) = settings_file(app) {
        if let Some(d) = f.parent() { let _ = std::fs::create_dir_all(d); }
        let _ = std::fs::write(f, serde_json::to_vec_pretty(s).unwrap_or_default());
    }
}

fn config_json(s: &Settings) -> String {
    json!({
        "DESKTOP": true, "SEND_TO_BROWSER": false, "CUSTOM_DIRS": false, "CREATE_CUSTOM_DIRS": false,
        "DEFAULT_FOLDER": "", "PUBLIC_HOST_URL": "", "PUBLIC_HOST_AUDIO_URL": "",
        "DOWNLOAD_DIR": s.download_dir.to_string_lossy(),
        "VERSION": env!("CARGO_PKG_VERSION"),
    }).to_string()
}

#[tauri::command]
fn hello(state: State<Shared>) -> Value {
    let q: Vec<(String, Download)> = state.queue.lock().unwrap().iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    let d: Vec<(String, Download)> = state.done.lock().unwrap().iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    json!({
        "config": config_json(&state.settings.lock().unwrap()),
        "all": serde_json::to_string(&(q, d)).unwrap_or_default(),
        "tools": serde_json::to_string(&*state.tools_status.lock().unwrap()).unwrap_or_default(),
    })
}

#[tauri::command]
fn add(app: AppHandle, body: args::Request) -> Value {
    match jobs::start(&app, body) {
        Ok(()) => json!({ "status": "ok" }),
        Err(msg) => json!({ "status": "error", "msg": msg }),
    }
}

#[derive(Deserialize)]
struct RemoveBody { ids: Vec<String>, #[serde(rename = "where")] place: String }

#[tauri::command]
fn remove(app: AppHandle, state: State<Shared>, body: RemoveBody) -> Value {
    if body.place == "queue" {
        for id in &body.ids {
            let mut jobs = state.jobs.lock().unwrap();
            if let Some(h) = jobs.values_mut().find(|h| h.keys.contains(id)) {
                if let Some(k) = h.kill.take() { let _ = k.send(()); }
            }
        }
    } else {
        for id in &body.ids {
            if state.done.lock().unwrap().remove(id).is_some() { send(&app, "cleared", id); }
        }
    }
    json!({ "status": "ok" })
}

#[derive(Deserialize)]
struct RetryBody { id: String }

#[tauri::command]
fn retry(app: AppHandle, state: State<Shared>, body: RetryBody) -> Value {
    let req = state.requests.lock().unwrap().get(&body.id).cloned();
    let Some(req) = req else { return json!({ "status": "error", "msg": "Lien introuvable" }) };
    if state.done.lock().unwrap().remove(&body.id).is_some() { send(&app, "cleared", &body.id); }
    match jobs::start(&app, req) {
        Ok(()) => json!({ "status": "ok" }),
        Err(msg) => json!({ "status": "error", "msg": msg }),
    }
}

#[tauri::command]
fn start() -> Value { json!({ "status": "ok" }) }

#[tauri::command]
fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal(app: AppHandle, state: State<Shared>, path: Option<String>) -> Result<(), String> {
    match path.filter(|p| std::path::Path::new(p).exists()) {
        Some(p) => app.opener().reveal_item_in_dir(p).map_err(|e| e.to_string()),
        None => {
            let dir = state.settings.lock().unwrap().download_dir.clone();
            app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) { return Err("Lien refusé".into()); }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn choose_folder(app: AppHandle) -> Result<String, String> {
    let current = app.state::<Shared>().settings.lock().unwrap().download_dir.clone();
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().set_directory(&current).pick_folder(move |p| { let _ = tx.send(p); });
    let picked = rx.await.map_err(|e| e.to_string())?;
    if let Some(p) = picked.and_then(|p| p.into_path().ok()) {
        let s = Settings { download_dir: p };
        save_settings(&app, &s);
        *app.state::<Shared>().settings.lock().unwrap() = s.clone();
        let _ = app.emit("mine", Wire { event: "configuration".into(), data: config_json(&s) });
    }
    Ok(app.state::<Shared>().settings.lock().unwrap().download_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn setup_tools(app: AppHandle) {
    tauri::async_runtime::spawn(tools::setup(app));
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Shared::default())
        .setup(|app| {
            let handle = app.handle().clone();
            let saved = settings_file(&handle)
                .and_then(|f| std::fs::read(f).ok())
                .and_then(|b| serde_json::from_slice::<Settings>(&b).ok());
            let settings = saved.unwrap_or_else(|| Settings {
                download_dir: handle.path().download_dir().or_else(|_| handle.path().home_dir()).unwrap_or_else(|_| std::env::temp_dir()),
            });
            *handle.state::<Shared>().settings.lock().unwrap() = settings;
            tauri::async_runtime::spawn(tools::setup(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hello, add, remove, retry, start, open_file, reveal, open_url, choose_folder, setup_tools])
        .run(tauri::generate_context!())
        .expect("Mine!? n'a pas pu démarrer");
}
