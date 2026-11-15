//! Les outils de la mouette : yt-dlp, ffmpeg et deno, téléchargés au premier lancement
//! dans le dossier de données de l'app, puis yt-dlp se met à jour tout seul.

use futures_util::StreamExt;
use serde::Serialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Debug)]
pub struct Tools {
    pub ytdlp: PathBuf,
    pub ffmpeg_dir: PathBuf,
    pub deno: PathBuf,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Status {
    pub ready: bool,
    pub stage: String,
    pub percent: Option<f64>,
    pub error: Option<String>,
}

const EXE: &str = if cfg!(windows) { ".exe" } else { "" };

pub fn bin_dir(app: &AppHandle) -> PathBuf {
    app.path().app_local_data_dir().unwrap_or_else(|_| std::env::temp_dir().join("mine")).join("bin")
}

fn system_ffmpeg() -> Option<PathBuf> {
    if cfg!(windows) { return None; }
    ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"].iter().map(PathBuf::from)
        .find(|d| d.join("ffmpeg").is_file() && d.join("ffprobe").is_file())
}

/// Les outils déjà présents, sans rien télécharger.
pub fn installed(dir: &Path) -> Option<Tools> {
    let ytdlp = dir.join(format!("yt-dlp{EXE}"));
    let deno = dir.join(format!("deno{EXE}"));
    let ffmpeg_dir = if dir.join(format!("ffmpeg{EXE}")).is_file() && dir.join(format!("ffprobe{EXE}")).is_file() {
        dir.to_path_buf()
    } else {
        system_ffmpeg()?
    };
    (ytdlp.is_file() && deno.is_file()).then_some(Tools { ytdlp, ffmpeg_dir, deno })
}

fn ytdlp_url() -> String {
    let name = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "aarch64") => "yt-dlp_arm64.exe",
        ("windows", _) => "yt-dlp.exe",
        ("macos", _) => "yt-dlp_macos",
        ("linux", "aarch64") => "yt-dlp_linux_aarch64",
        _ => "yt-dlp_linux",
    };
    format!("https://github.com/yt-dlp/yt-dlp/releases/latest/download/{name}")
}

fn deno_url() -> String {
    let triple = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", _) => "x86_64-pc-windows-msvc",
        ("macos", "aarch64") => "aarch64-apple-darwin",
        ("macos", _) => "x86_64-apple-darwin",
        ("linux", "aarch64") => "aarch64-unknown-linux-gnu",
        _ => "x86_64-unknown-linux-gnu",
    };
    format!("https://github.com/denoland/deno/releases/latest/download/deno-{triple}.zip")
}

/// Une ou deux archives qui contiennent ffmpeg et ffprobe.
fn ffmpeg_urls() -> Vec<String> {
    let ff = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/";
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "aarch64") => vec![format!("{ff}ffmpeg-master-latest-winarm64-gpl.zip")],
        ("windows", _) => vec![format!("{ff}ffmpeg-master-latest-win64-gpl.zip")],
        ("linux", "aarch64") => vec![format!("{ff}ffmpeg-master-latest-linuxarm64-gpl.tar.xz")],
        ("linux", _) => vec![format!("{ff}ffmpeg-master-latest-linux64-gpl.tar.xz")],
        (_, arch) => {
            let a = if arch == "aarch64" { "arm64" } else { "amd64" };
            ["ffmpeg", "ffprobe"].iter()
                .map(|t| format!("https://ffmpeg.martin-riedl.de/redirect/latest/macos/{a}/release/{t}.zip")).collect()
        }
    }
}

fn emit(app: &AppHandle, s: &Status) {
    let _ = app.emit("mine", crate::Wire { event: "tools".into(), data: serde_json::to_string(s).unwrap_or_default() });
    *app.state::<crate::Shared>().tools_status.lock().unwrap() = s.clone();
}

async fn fetch(app: &AppHandle, url: &str, stage: &str, dest: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder().user_agent("Mine-desktop").build().map_err(|e| e.to_string())?;
    let resp = client.get(url).send().await.and_then(|r| r.error_for_status()).map_err(|e| format!("{stage} : {e}"))?;
    let total = resp.content_length();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut got: u64 = 0;
    let mut last = 0.0;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("{stage} : {e}"))?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        got += chunk.len() as u64;
        if let Some(t) = total {
            let p = (got as f64 / t as f64 * 100.0).floor();
            if p - last >= 2.0 { last = p; emit(app, &Status { ready: false, stage: stage.into(), percent: Some(p), error: None }); }
        }
    }
    file.flush().map_err(|e| e.to_string())
}

#[cfg(unix)]
fn make_executable(p: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(p, std::fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())
}
#[cfg(not(unix))]
fn make_executable(_: &Path) -> Result<(), String> { Ok(()) }

fn file_name_of(path: &str) -> &str { path.rsplit(['/', '\\']).next().unwrap_or(path) }

/// Copie hors de l'archive les fichiers dont le nom est demandé, à plat dans `dir`.
fn extract(archive: &Path, wanted: &[String], dir: &Path) -> Result<(), String> {
    let mut found = 0;
    let name = archive.to_string_lossy().to_string();
    if name.ends_with(".zip") {
        let f = std::fs::File::open(archive).map_err(|e| e.to_string())?;
        let mut z = zip::ZipArchive::new(f).map_err(|e| e.to_string())?;
        for i in 0..z.len() {
            let mut e = z.by_index(i).map_err(|e| e.to_string())?;
            let n = file_name_of(e.name()).to_string();
            if e.is_file() && wanted.contains(&n) {
                let out = dir.join(&n);
                let mut buf = Vec::new();
                e.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                std::fs::write(&out, buf).map_err(|e| e.to_string())?;
                make_executable(&out)?;
                found += 1;
            }
        }
    } else {
        let f = std::fs::File::open(archive).map_err(|e| e.to_string())?;
        let mut t = tar::Archive::new(xz2::read::XzDecoder::new(f));
        for e in t.entries().map_err(|e| e.to_string())? {
            let mut e = e.map_err(|e| e.to_string())?;
            let path = e.path().map_err(|e| e.to_string())?.to_string_lossy().to_string();
            let n = file_name_of(&path).to_string();
            if e.header().entry_type().is_file() && wanted.contains(&n) {
                let out = dir.join(&n);
                let mut buf = Vec::new();
                e.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                std::fs::write(&out, buf).map_err(|e| e.to_string())?;
                make_executable(&out)?;
                found += 1;
            }
        }
    }
    if found == 0 { return Err(format!("{} : fichiers introuvables dans l'archive", wanted.join(", "))); }
    Ok(())
}

async fn install_archive(app: &AppHandle, url: &str, stage: &str, wanted: Vec<String>, dir: &Path) -> Result<(), String> {
    let ext = if url.ends_with(".tar.xz") { "tar.xz" } else { "zip" };
    let tmp = dir.join(format!("{stage}.download.{ext}"));
    fetch(app, url, stage, &tmp).await?;
    let (t2, d2) = (tmp.clone(), dir.to_path_buf());
    let r = tokio::task::spawn_blocking(move || extract(&t2, &wanted, &d2)).await.map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&tmp);
    r
}

/// Télécharge ce qui manque. Renvoie les outils prêts à servir.
pub async fn ensure(app: &AppHandle) -> Result<Tools, String> {
    let dir = bin_dir(app);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let ytdlp = dir.join(format!("yt-dlp{EXE}"));
    if !ytdlp.is_file() {
        let tmp = dir.join("yt-dlp.download");
        fetch(app, &ytdlp_url(), "yt-dlp", &tmp).await?;
        make_executable(&tmp)?;
        std::fs::rename(&tmp, &ytdlp).map_err(|e| e.to_string())?;
    } else {
        update_ytdlp(&ytdlp);
    }

    let has_ffmpeg = dir.join(format!("ffmpeg{EXE}")).is_file() && dir.join(format!("ffprobe{EXE}")).is_file();
    if !has_ffmpeg {
        let mut result = Ok(());
        for url in ffmpeg_urls() {
            let wanted = if url.contains("martin-riedl") {
                vec![if url.ends_with("ffprobe.zip") { "ffprobe".to_string() } else { "ffmpeg".to_string() }]
            } else {
                vec![format!("ffmpeg{EXE}"), format!("ffprobe{EXE}")]
            };
            result = install_archive(app, &url, "ffmpeg", wanted, &dir).await;
            if result.is_err() { break; }
        }
        // Sous macOS et Linux, un ffmpeg déjà installé (Homebrew, paquets) fait l'affaire.
        if result.is_err() && system_ffmpeg().is_none() { result?; }
    }

    if !dir.join(format!("deno{EXE}")).is_file() {
        install_archive(app, &deno_url(), "deno", vec![format!("deno{EXE}")], &dir).await?;
    }

    installed(&dir).ok_or_else(|| "Outils incomplets après l'installation".to_string())
}

/// Les sites changent souvent : yt-dlp se met à jour à chaque lancement, en arrière-plan.
pub fn update_ytdlp(ytdlp: &Path) {
    let mut cmd = tokio::process::Command::new(ytdlp);
    cmd.arg("-U").stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null());
    crate::jobs::no_window(&mut cmd);
    if let Ok(mut child) = cmd.spawn() {
        tauri::async_runtime::spawn(async move { let _ = child.wait().await; });
    }
}

pub async fn setup(app: AppHandle) {
    emit(&app, &Status { ready: false, stage: "start".into(), percent: None, error: None });
    match ensure(&app).await {
        Ok(t) => {
            *app.state::<crate::Shared>().tools.lock().unwrap() = Some(t);
            emit(&app, &Status { ready: true, stage: "ready".into(), percent: Some(100.0), error: None });
        }
        Err(e) => emit(&app, &Status { ready: false, stage: "error".into(), percent: None, error: Some(e) }),
    }
}
