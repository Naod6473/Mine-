//! Lance yt-dlp pour un lien, lit son avancement et le raconte à l'interface
//! avec les mêmes événements que le serveur (added, updated, completed, canceled).

use crate::args::{self, Request};
use crate::{Download, Shared};
use serde_json::Value;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::oneshot;

pub fn no_window(cmd: &mut tokio::process::Command) {
    #[cfg(windows)]
    {
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    #[cfg(not(windows))]
    let _ = cmd;
}

pub fn now_ns() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(0)
}

fn num(v: &Value, k: &str) -> Option<f64> { v.get(k).and_then(Value::as_f64) }
fn text(v: &Value, k: &str) -> Option<String> { v.get(k).and_then(Value::as_str).map(str::to_string).filter(|s| !s.is_empty() && s != "NA") }

/// Démarre un téléchargement. L'erreur ne concerne que les réglages : le reste arrive par événements.
pub fn start(app: &AppHandle, req: Request) -> Result<(), String> {
    let url = req.url.trim().to_string();
    if !(url.starts_with("http://") || url.starts_with("https://")) { return Err("Ce n'est pas un lien http(s).".into()); }
    let shared = app.state::<Shared>();
    let tools = shared.tools.lock().unwrap().clone().ok_or("La mouette prépare encore ses outils, réessaie dans un instant.")?;
    let out_dir = shared.settings.lock().unwrap().download_dir.clone();
    std::fs::create_dir_all(&out_dir).map_err(|e| format!("Dossier inaccessible : {e}"))?;

    let mut argv = args::build(&req, &out_dir)?;
    argv.extend([
        "--ignore-config", "--no-colors", "--newline", "--quiet", "--progress", "--no-simulate", "--ignore-errors",
        "--no-mtime", "--windows-filenames",
    ].map(String::from));
    argv.extend(["--ffmpeg-location".into(), tools.ffmpeg_dir.to_string_lossy().to_string()]);
    argv.extend(["--js-runtimes".into(), format!("deno:{}", tools.deno.to_string_lossy())]);
    argv.extend(["--print".into(), "before_dl:MINE:START %(.{webpage_url,original_url,title,thumbnail,playlist_index})j".into()]);
    argv.extend(["--print".into(), "after_move:MINE:DONE %(.{webpage_url,filepath,filesize,filesize_approx})j".into()]);
    argv.extend(["--progress-template".into(), "download:MINE:PROG %(progress.{status,downloaded_bytes,total_bytes,total_bytes_estimate,speed,eta})j".into()]);
    argv.extend(["--progress-template".into(), "postprocess:MINE:POST %(progress.{status,postprocessor})j".into()]);
    argv.extend(["--".into(), url.clone()]);

    let placeholder = Download::new(&url, &req);
    let job_id = shared.next_job();
    {
        let mut q = shared.queue.lock().unwrap();
        q.insert(url.clone(), placeholder.clone());
    }
    shared.requests.lock().unwrap().insert(url.clone(), req.clone());
    crate::send(app, "added", &placeholder);

    let app = app.clone();
    tauri::async_runtime::spawn(async move { run(app, job_id, url, req, tools.ytdlp, argv).await });
    Ok(())
}

struct Job { url: String, req: Request, current: Option<String>, keys: Vec<String>, last_emit: Instant }

impl Job {
    fn update<F: FnOnce(&mut Download)>(&mut self, app: &AppHandle, force: bool, f: F) {
        let Some(key) = self.current.clone() else { return };
        let shared = app.state::<Shared>();
        let d = {
            let mut q = shared.queue.lock().unwrap();
            let Some(d) = q.get_mut(&key) else { return };
            f(d);
            d.clone()
        };
        if force || self.last_emit.elapsed() > Duration::from_millis(250) {
            self.last_emit = Instant::now();
            crate::send(app, "updated", &d);
        }
    }

    /// Range un élément terminé (réussi ou non) de la file vers « done ».
    fn finish(&mut self, app: &AppHandle, key: &str, f: impl FnOnce(&mut Download)) {
        let shared = app.state::<Shared>();
        let Some(mut d) = shared.queue.lock().unwrap().remove(key) else { return };
        f(&mut d);
        shared.done.lock().unwrap().insert(key.to_string(), d.clone());
        crate::send(app, "completed", &d);
    }

    fn on_start(&mut self, app: &AppHandle, v: Value, last_error: &str) {
        let shared = app.state::<Shared>();
        // L'élément précédent n'a pas fini : yt-dlp a sauté une erreur pour passer au suivant.
        if let Some(prev) = self.current.clone() {
            if prev != self.url && shared.queue.lock().unwrap().contains_key(&prev) {
                let msg = last_error.to_string();
                self.finish(app, &prev, |d| { d.status = "error".into(); d.msg = Some(msg.clone()); d.error = Some(msg); });
            }
        }
        let in_playlist = v.get("playlist_index").map(|p| !p.is_null()).unwrap_or(false);
        let title = text(&v, "title");
        let thumb = text(&v, "thumbnail");
        let key = if !in_playlist {
            self.url.clone()
        } else {
            // Une playlist : chaque vidéo a sa propre ligne, la ligne d'attente disparaît.
            if shared.queue.lock().unwrap().remove(&self.url).is_some() {
                crate::send(app, "canceled", &self.url);
            }
            let mut key = text(&v, "webpage_url").or_else(|| text(&v, "original_url")).unwrap_or_else(|| format!("{}#{}", self.url, self.keys.len()));
            if shared.queue.lock().unwrap().contains_key(&key) || shared.done.lock().unwrap().contains_key(&key) {
                key = format!("{key}#{}", now_ns());
            }
            let mut d = Download::new(&key, &self.req);
            d.status = "preparing".into();
            shared.queue.lock().unwrap().insert(key.clone(), d.clone());
            shared.requests.lock().unwrap().insert(key.clone(), Request { url: key.split('#').next().unwrap_or(&key).to_string(), playlist_item_limit: None, ..self.req.clone() });
            crate::send(app, "added", &d);
            key
        };
        self.current = Some(key.clone());
        if !self.keys.contains(&key) { self.keys.push(key); }
        self.update(app, true, |d| {
            if let Some(t) = title { d.title = t; }
            if thumb.is_some() { d.thumbnail = thumb; }
            d.status = "preparing".into();
        });
    }

    fn on_progress(&mut self, app: &AppHandle, v: Value) {
        if v.get("status").and_then(Value::as_str) != Some("downloading") { return; }
        let got = num(&v, "downloaded_bytes");
        let total = num(&v, "total_bytes").or_else(|| num(&v, "total_bytes_estimate"));
        self.update(app, false, |d| {
            d.status = "downloading".into();
            d.percent = match (got, total) { (Some(g), Some(t)) if t > 0.0 => Some((g / t * 100.0).min(100.0)), _ => None };
            d.speed = num(&v, "speed");
            d.eta = num(&v, "eta");
            if total.is_some() { d.size = total; }
        });
    }

    fn on_done(&mut self, app: &AppHandle, v: Value) {
        let Some(key) = self.current.clone() else { return };
        let path = text(&v, "filepath");
        let size = num(&v, "filesize").or_else(|| num(&v, "filesize_approx"))
            .or_else(|| path.as_ref().and_then(|p| std::fs::metadata(p).ok()).map(|m| m.len() as f64));
        self.finish(app, &key, |d| {
            d.status = "finished".into();
            d.percent = Some(100.0);
            d.filename = path.as_ref().map(|p| PathBuf::from(p).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default());
            d.filepath = path;
            if size.is_some() { d.size = size; }
        });
    }
}

async fn run(app: AppHandle, job_id: u64, url: String, req: Request, ytdlp: PathBuf, argv: Vec<String>) {
    let shared = app.state::<Shared>();
    let mut job = Job { url: url.clone(), req, current: Some(url.clone()), keys: vec![url.clone()], last_emit: Instant::now() };

    let mut cmd = tokio::process::Command::new(&ytdlp);
    cmd.args(&argv).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).kill_on_drop(true);
    no_window(&mut cmd);
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("yt-dlp n'a pas pu démarrer : {e}");
            job.finish(&app, &url, |d| { d.status = "error".into(); d.msg = Some(msg.clone()); d.error = Some(msg); });
            return;
        }
    };
    let (kill_tx, mut kill_rx) = oneshot::channel::<()>();
    shared.jobs.lock().unwrap().insert(job_id, crate::JobHandle { keys: vec![url.clone()], kill: Some(kill_tx) });

    let errors = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
    if let Some(stderr) = child.stderr.take() {
        let errors = errors.clone();
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(l)) = lines.next_line().await {
                if let Some(e) = l.strip_prefix("ERROR: ") { *errors.lock().unwrap() = e.to_string(); }
            }
        });
    }

    let mut canceled = false;
    if let Some(stdout) = child.stdout.take() {
        let mut lines = BufReader::new(stdout).lines();
        loop {
            tokio::select! {
                line = lines.next_line() => {
                    let Ok(Some(line)) = line else { break };
                    let parse = |s: &str| serde_json::from_str::<Value>(s.trim()).unwrap_or(Value::Null);
                    if let Some(j) = line.strip_prefix("MINE:START ") {
                        let err = errors.lock().unwrap().clone();
                        job.on_start(&app, parse(j), &err);
                        if let Some(h) = shared.jobs.lock().unwrap().get_mut(&job_id) { h.keys = job.keys.clone(); }
                    } else if let Some(j) = line.strip_prefix("MINE:PROG ") {
                        job.on_progress(&app, parse(j));
                    } else if line.starts_with("MINE:POST ") {
                        job.update(&app, true, |d| { d.status = "postprocessing".into(); d.percent = Some(100.0); });
                    } else if let Some(j) = line.strip_prefix("MINE:DONE ") {
                        job.on_done(&app, parse(j));
                    }
                }
                _ = &mut kill_rx => { canceled = true; let _ = child.kill().await; break; }
            }
        }
    }
    let ok = child.wait().await.map(|s| s.success()).unwrap_or(false);
    shared.jobs.lock().unwrap().remove(&job_id);

    let leftovers: Vec<String> = job.keys.iter().filter(|k| shared.queue.lock().unwrap().contains_key(*k)).cloned().collect();
    for key in leftovers {
        if canceled {
            shared.queue.lock().unwrap().remove(&key);
            crate::send(&app, "canceled", &key);
        } else if ok || (Some(&key) != job.current.as_ref()) {
            // Fini sans chemin annoncé (miniature, sous-titres) : le fichier est dans le dossier.
            job.finish(&app, &key, |d| { d.status = "finished".into(); d.percent = Some(100.0); });
        } else {
            let mut msg = errors.lock().unwrap().clone();
            if msg.is_empty() { msg = "yt-dlp s'est arrêté sans dire pourquoi.".into(); }
            job.finish(&app, &key, |d| { d.status = "error".into(); d.msg = Some(msg.clone()); d.error = Some(msg); });
        }
    }
}
