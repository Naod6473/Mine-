//! Traduit les choix de l'interface (type, format, qualité…) en arguments de yt-dlp.
//! Mêmes règles que le serveur (app/dl_formats.py), écrites pour la ligne de commande.

use serde::Deserialize;
use std::path::Path;

#[derive(Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct Request {
    pub url: String,
    pub download_type: String,
    pub codec: String,
    pub format: String,
    pub quality: String,
    pub playlist_item_limit: Option<u32>,
    pub subtitle_language: Option<String>,
    pub subtitle_mode: Option<String>,
    pub audio_tags: Option<String>,
    pub clip_start: Option<f64>,
    pub clip_end: Option<f64>,
    pub split_by_chapters: bool,
    pub sponsorblock: bool,
    pub custom_name_prefix: Option<String>,
}

const AUDIO_FORMATS: [&str; 6] = ["auto", "m4a", "mp3", "opus", "wav", "flac"];
const VIDEO_FORMATS: [&str; 3] = ["any", "mp4", "ios"];
const CAPTION_FORMATS: [&str; 6] = ["srt", "vtt", "ttml", "sbv", "scc", "dfxp"];
const AUTO_AUDIO_TAGGABLE: &str = "wav>flac/aiff>flac/wma>mp3/best";

fn norm(v: &str, default: &str) -> String {
    let v = v.trim().to_lowercase();
    if v.is_empty() { default.to_string() } else { v }
}

/// Le sélecteur de format (-f), comme get_format() côté serveur.
pub fn format_selector(r: &Request) -> Result<String, String> {
    let kind = norm(&r.download_type, "video");
    let quality = norm(&r.quality, "best");
    match kind.as_str() {
        "thumbnail" | "captions" => Ok("bestaudio/best".into()),
        "audio" => {
            let f = norm(&r.format, "auto");
            if !AUDIO_FORMATS.contains(&f.as_str()) { return Err(format!("Format audio inconnu : {f}")); }
            Ok(if f == "auto" { "bestaudio/best".into() } else { format!("bestaudio[ext={f}]/bestaudio/best") })
        }
        "video" => {
            let f = norm(&r.format, "any");
            if !VIDEO_FORMATS.contains(&f.as_str()) { return Err(format!("Format vidéo inconnu : {f}")); }
            let (vfmt, afmt) = if f == "mp4" || f == "ios" { ("[ext=mp4]", "[ext=m4a]") } else { ("", "") };
            let vres = if quality == "best" || quality == "worst" { String::new() } else {
                if !quality.chars().all(|c| c.is_ascii_digit()) { return Err(format!("Qualité inconnue : {quality}")); }
                format!("[height<={quality}]")
            };
            let vcombo = format!("{vres}{vfmt}");
            if f == "ios" {
                return Ok(format!("bestvideo[vcodec~='^((he|a)vc|h26[45])']{vres}+bestaudio[acodec=aac]/bestvideo[vcodec~='^((he|a)vc|h26[45])']{vres}+bestaudio{afmt}/bestvideo{vcombo}+bestaudio{afmt}/best{vcombo}"));
            }
            let codec = match norm(&r.codec, "auto").as_str() {
                "h264" => "[vcodec~='^(h264|avc)']",
                "h265" => "[vcodec~='^(h265|hevc)']",
                "av1" => "[vcodec~='^av0?1']",
                "vp9" => "[vcodec~='^vp0?9']",
                _ => "",
            };
            if !codec.is_empty() {
                return Ok(format!("bestvideo{codec}{vcombo}+bestaudio{afmt}/bestvideo{vcombo}+bestaudio{afmt}/best{vcombo}"));
            }
            Ok(format!("bestvideo{vcombo}+bestaudio{afmt}/best{vcombo}"))
        }
        _ => Err(format!("Type inconnu : {kind}")),
    }
}

fn clean_prefix(p: &str) -> String {
    p.chars().filter(|c| !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '%')).take(60).collect::<String>().trim().to_string()
}

/// Tous les arguments, sauf l'adresse et les lignes de suivi ajoutées par jobs.rs.
pub fn build(r: &Request, out_dir: &Path) -> Result<Vec<String>, String> {
    let mut a: Vec<String> = vec!["-f".into(), format_selector(r)?];
    let kind = norm(&r.download_type, "video");
    let format = norm(&r.format, if kind == "audio" { "auto" } else { "any" });
    let quality = norm(&r.quality, "best");

    let prefix = r.custom_name_prefix.as_deref().map(clean_prefix).unwrap_or_default();
    let dir = out_dir.to_string_lossy().to_string();
    let sep = std::path::MAIN_SEPARATOR;
    a.push("-o".into());
    a.push(format!("{dir}{sep}{prefix}%(title)s.%(ext)s"));

    match kind.as_str() {
        "video" => {
            if format == "mp4" || format == "ios" { a.extend(["--merge-output-format".into(), "mp4".into()]); }
        }
        "audio" => {
            let tags = r.audio_tags.as_deref().unwrap_or("with_cover");
            let codec = if format == "auto" {
                if tags == "none" { "best".to_string() } else { AUTO_AUDIO_TAGGABLE.to_string() }
            } else { format.clone() };
            a.extend(["-x".into(), "--audio-format".into(), codec]);
            let q = if quality == "best" || !quality.chars().all(|c| c.is_ascii_digit()) { "0".to_string() } else { format!("{quality}K") };
            a.extend(["--audio-quality".into(), q]);
            if format != "wav" && tags != "none" {
                a.push("--embed-metadata".into());
                if tags == "with_cover" {
                    a.extend(["--embed-thumbnail".into(), "--convert-thumbnails".into(), "jpg".into()]);
                }
            }
        }
        "thumbnail" => {
            a.extend(["--skip-download".into(), "--write-thumbnail".into(), "--convert-thumbnails".into(), "jpg".into()]);
            a.extend(["-o".into(), format!("thumbnail:{dir}{sep}{prefix}%(title)s.%(ext)s")]);
        }
        "captions" => {
            let f = if CAPTION_FORMATS.contains(&format.as_str()) { format.clone() } else { "srt".to_string() };
            let lang = r.subtitle_language.as_deref().map(str::trim).filter(|s| !s.is_empty()).unwrap_or("en").to_string();
            if !lang.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') { return Err("Langue de sous-titres invalide".into()); }
            a.extend(["--skip-download".into(), "--sub-format".into(), format!("{f}/best")]);
            if f == "srt" || f == "vtt" { a.extend(["--convert-subs".into(), f.clone()]); }
            let orig = format!("{lang}-orig");
            match r.subtitle_mode.as_deref().unwrap_or("prefer_manual") {
                "manual_only" => a.extend(["--write-subs".into(), "--no-write-auto-subs".into(), "--sub-langs".into(), lang]),
                "auto_only" => a.extend(["--no-write-subs".into(), "--write-auto-subs".into(), "--sub-langs".into(), format!("{orig},{lang}")]),
                "prefer_auto" => a.extend(["--write-subs".into(), "--write-auto-subs".into(), "--sub-langs".into(), format!("{orig},{lang}")]),
                _ => a.extend(["--write-subs".into(), "--write-auto-subs".into(), "--sub-langs".into(), format!("{lang},{orig}")]),
            }
            a.extend(["-o".into(), format!("subtitle:{dir}{sep}{prefix}%(title)s.%(ext)s")]);
        }
        _ => {}
    }

    if kind == "video" || kind == "audio" {
        if r.clip_start.is_some() || r.clip_end.is_some() {
            let s = r.clip_start.unwrap_or(0.0);
            let e = r.clip_end.map(|e| e.to_string()).unwrap_or_else(|| "inf".into());
            a.extend(["--download-sections".into(), format!("*{s}-{e}")]);
        }
        if r.split_by_chapters {
            a.push("--split-chapters".into());
            a.extend(["-o".into(), format!("chapter:{dir}{sep}{prefix}%(title)s - %(section_number)02d %(section_title)s.%(ext)s")]);
        }
        if r.sponsorblock { a.extend(["--sponsorblock-remove".into(), "sponsor".into()]); }
    }
    match r.playlist_item_limit {
        Some(n) if n > 0 => a.extend(["--yes-playlist".into(), "-I".into(), format!(":{n}")]),
        _ => a.push("--yes-playlist".into()),
    }
    Ok(a)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn req(t: &str, f: &str, q: &str) -> Request { Request { url: "u".into(), download_type: t.into(), format: f.into(), quality: q.into(), codec: "auto".into(), ..Default::default() } }

    #[test]
    fn video_selectors_match_the_server() {
        assert_eq!(format_selector(&req("video", "any", "best")).unwrap(), "bestvideo+bestaudio/best");
        assert_eq!(format_selector(&req("video", "mp4", "720")).unwrap(), "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]");
        assert!(format_selector(&req("video", "mkv", "best")).is_err());
        assert!(format_selector(&req("video", "any", "72;0")).is_err());
    }

    #[test]
    fn audio_mp3_converts_and_tags() {
        let a = build(&req("audio", "mp3", "320"), Path::new("/tmp")).unwrap();
        let s = a.join(" ");
        assert!(s.contains("-x --audio-format mp3 --audio-quality 320K"));
        assert!(s.contains("--embed-thumbnail"));
    }

    #[test]
    fn captions_use_language_and_mode() {
        let mut r = req("captions", "srt", "best");
        r.subtitle_language = Some("fr".into());
        let s = build(&r, Path::new("/tmp")).unwrap().join(" ");
        assert!(s.contains("--sub-langs fr,fr-orig"));
        assert!(s.contains("--convert-subs srt"));
        r.subtitle_language = Some("fr;rm".into());
        assert!(build(&r, Path::new("/tmp")).is_err());
    }
}
