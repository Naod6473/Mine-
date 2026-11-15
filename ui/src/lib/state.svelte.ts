import { io, type Socket } from 'socket.io-client';
import type { Catalog, Download, HistoryEntry, Options, Preset, ServerConfig } from './types';
import { load, save } from './storage';
import { siteOf } from './labels';

const K = { history: 'mine.history.v1', options: 'mine.options.v1', mode: 'mine.mode.v1', presets: 'mine.presets.v1', hidden: 'mine.hidden.v1' };
const HISTORY_MAX = 500;

export const DEFAULT_OPTIONS: Options = {
  download_type: 'video', codec: 'auto', format: 'any', quality: 'best', folder: '',
  playlist: 'all', playlist_item_limit: 10, subtitle_language: 'fr', subtitle_mode: 'prefer_manual',
  audio_tags: 'with_cover', clip_start: '', clip_end: '', custom_name_prefix: '',
  split_by_chapters: false, sponsorblock: false,
};

class AppState {
  connected = $state(false);
  everConnected = $state(false);
  catalog = $state<Catalog | null>(null);
  config = $state<ServerConfig | null>(null);
  dirs = $state<string[]>([]);
  audioDirs = $state<string[]>([]);
  queue = $state<Record<string, Download>>({});
  done = $state<Record<string, Download>>({});
  hidden = $state<string[]>(load(K.hidden, []));
  history = $state<HistoryEntry[]>(load(K.history, []));
  mode = $state<'simple' | 'advanced'>(load(K.mode, 'simple'));
  options = $state<Options>({ ...DEFAULT_OPTIONS, ...load<Partial<Options>>(K.options, {}) });
  presets = $state<Preset[]>(load(K.presets, []));
  tab = $state<'mine' | 'history'>('mine');
  submitting = $state(false);
  /** Vrai pendant ~2 s après un téléchargement réussi : la mouette crie « Mine ! ». */
  celebrate = $state(false);
  private celebrateTimer: ReturnType<typeof setTimeout> | undefined;
  toast = $state<{ text: string; kind: 'info' | 'error' } | null>(null);
  private socket: Socket | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  /** Cartes visibles sur l'écran Mine : en cours + terminées non rangées, les plus récentes d'abord. */
  cards = $derived.by(() => {
    const active = Object.entries(this.queue);
    const finished = Object.entries(this.done).filter(([k, d]) => !this.hidden.includes(hiddenKey(k, d)));
    return [...active, ...finished].sort((a, b) => b[1].timestamp - a[1].timestamp);
  });

  activeCount = $derived(Object.values(this.queue).filter((d) => d.status !== 'pending').length);

  /** Le téléchargement mis en avant sous la mouette : celui qui avance, sinon le plus récent. */
  lead = $derived.by(() => {
    const active = Object.values(this.queue).filter((d) => d.status !== 'pending').sort((a, b) => b.timestamp - a.timestamp);
    return active.find((d) => d.status === 'downloading' && d.percent != null) ?? active[0] ?? null;
  });

  connect() {
    const path = new URL('socket.io', document.baseURI).pathname;
    const s = io({ path, transports: ['websocket', 'polling'] });
    this.socket = s;
    s.on('connect', () => { this.connected = true; this.everConnected = true; });
    s.on('disconnect', () => { this.connected = false; });
    const parse = <T>(raw: string): T => JSON.parse(raw) as T;
    s.on('all', (raw: string) => {
      const [queue, done] = parse<[[string, Download][], [string, Download][]]>(raw);
      this.queue = Object.fromEntries(queue);
      this.done = Object.fromEntries(done);
      for (const [, d] of done) this.record(d);
      // Les clés masquées qui n'existent plus côté serveur sont oubliées.
      const live = new Set(done.map(([k, d]) => hiddenKey(k, d)));
      this.hidden = this.hidden.filter((h) => live.has(h));
      save(K.hidden, this.hidden);
    });
    s.on('added', (raw: string) => { const d = parse<Download>(raw); this.queue[d.url] = d; });
    s.on('updated', (raw: string) => {
      const d = parse<Download>(raw);
      if (this.queue[d.url]) this.queue[d.url] = d;
      else if (this.done[d.url]) this.done[d.url] = d;
      else this.queue[d.url] = d;
    });
    s.on('completed', (raw: string) => {
      const d = parse<Download>(raw);
      delete this.queue[d.url];
      this.done[d.url] = d;
      this.record(d);
      if (d.status === 'finished') {
        this.celebrate = true;
        clearTimeout(this.celebrateTimer);
        this.celebrateTimer = setTimeout(() => (this.celebrate = false), 2200);
      }
    });
    s.on('canceled', (raw: string) => { delete this.queue[parse<string>(raw)]; });
    s.on('cleared', (raw: string) => { delete this.done[parse<string>(raw)]; });
    s.on('formats', (raw: string) => { this.catalog = parse<Catalog>(raw); });
    s.on('configuration', (raw: string) => {
      const c = parse<ServerConfig>(raw);
      this.config = c;
      if (!this.options.folder && c.DEFAULT_FOLDER) this.options.folder = c.DEFAULT_FOLDER;
    });
    s.on('custom_dirs', (raw: string) => {
      const d = parse<{ download_dir: string[]; audio_download_dir: string[] }>(raw);
      this.dirs = d.download_dir; this.audioDirs = d.audio_download_dir;
    });
  }

  /** Ajoute ou met à jour un téléchargement terminé (réussi ou non) dans l'historique local. */
  record(d: Download) {
    if (d.status !== 'finished' && d.status !== 'error') return;
    const key = `${d.url}#${d.timestamp}`;
    const entry: HistoryEntry = {
      key, url: d.url, title: d.title || d.url, site: siteOf(d.url), thumbnail: d.thumbnail ?? null,
      status: d.status === 'finished' ? 'ok' : 'error', error: d.status === 'error' ? (d.msg || d.error || null) : null,
      download_type: d.download_type, format: d.format, quality: d.quality, folder: d.folder || '',
      filename: d.filename ?? null, size: d.size ?? null, date: Math.round(d.timestamp / 1e6),
    };
    const i = this.history.findIndex((h) => h.key === key);
    if (i >= 0) this.history[i] = entry;
    else this.history = [entry, ...this.history].sort((a, b) => b.date - a.date).slice(0, HISTORY_MAX);
    save(K.history, this.history);
  }

  removeHistory(key: string) { this.history = this.history.filter((h) => h.key !== key); save(K.history, this.history); }
  clearHistory() { this.history = []; save(K.history, this.history); }
  importHistory(entries: HistoryEntry[]) {
    const map = new Map(this.history.map((h) => [h.key, h]));
    for (const e of entries) if (e && typeof e.key === 'string' && typeof e.url === 'string') map.set(e.key, e);
    this.history = [...map.values()].sort((a, b) => b.date - a.date).slice(0, HISTORY_MAX);
    save(K.history, this.history);
  }

  setMode(m: 'simple' | 'advanced') { this.mode = m; save(K.mode, m); }
  saveOptions() { save(K.options, $state.snapshot(this.options)); }
  resetOptions() { this.options = { ...DEFAULT_OPTIONS, folder: this.config?.DEFAULT_FOLDER ?? '' }; this.saveOptions(); }
  addPreset(name: string) {
    const p = { name, options: $state.snapshot(this.options) };
    this.presets = [...this.presets.filter((x) => x.name !== name), p];
    save(K.presets, this.presets);
  }
  removePreset(name: string) { this.presets = this.presets.filter((p) => p.name !== name); save(K.presets, this.presets); }
  applyPreset(p: Preset) { this.options = { ...DEFAULT_OPTIONS, ...p.options }; this.saveOptions(); }

  notify(text: string, kind: 'info' | 'error' = 'info') {
    this.toast = { text, kind };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), kind === 'error' ? 7000 : 3500);
  }

  /** Le corps envoyé à /add : en mode Simple, les réglages par défaut ; en Avancé, ceux du panneau. */
  payload(url: string, useOptions: boolean): Record<string, unknown> {
    const o = useOptions ? this.options : { ...DEFAULT_OPTIONS, folder: this.config?.DEFAULT_FOLDER ?? '' };
    const body: Record<string, unknown> = {
      url, download_type: o.download_type, codec: o.codec, format: o.format, quality: o.quality,
      auto_start: true,
    };
    if (this.config?.CUSTOM_DIRS && o.folder) body.folder = o.folder;
    if (!useOptions) return body;
    if (o.playlist === 'single') body.url = singleVideoUrl(url);
    if (o.playlist === 'limit') body.playlist_item_limit = Math.max(1, Number(o.playlist_item_limit) || 1);
    if (o.download_type === 'captions') { body.subtitle_language = o.subtitle_language; body.subtitle_mode = o.subtitle_mode; }
    if (o.download_type === 'audio') body.audio_tags = o.audio_tags;
    if (o.download_type === 'video' || o.download_type === 'audio') {
      const s = parseTime(o.clip_start), e = parseTime(o.clip_end);
      if (s != null) body.clip_start = s;
      if (e != null) body.clip_end = e;
      body.split_by_chapters = o.split_by_chapters;
      body.sponsorblock = o.sponsorblock;
    }
    if (o.custom_name_prefix.trim()) body.custom_name_prefix = o.custom_name_prefix.trim();
    return body;
  }

  async add(url: string): Promise<boolean> {
    this.submitting = true;
    try { return await this.addInner(url); } finally { this.submitting = false; }
  }

  private async addInner(url: string): Promise<boolean> {
    const body = this.payload(url, this.mode === 'advanced');
    try {
      const r = await post('add', body);
      if (r.status === 'error') {
        // Si le serveur a déjà affiché une carte d'erreur pour ce lien, inutile de le dire deux fois.
        await new Promise((res) => setTimeout(res, 400));
        const shown = Object.values(this.done).some((d) => d.status === 'error' && (d.url === url || d.url === body.url));
        if (!shown) this.notify(`Pas à toi. ${r.msg ?? ''}`.trim(), 'error');
        return shown;
      }
      if (r.msg) this.notify(r.msg);
      return true;
    } catch (e) {
      this.notify(`Pas à toi. ${(e as Error).message}`, 'error');
      return false;
    }
  }

  /** Relance un lien de l'historique avec le même type, format et qualité. */
  async again(h: HistoryEntry): Promise<boolean> {
    const body: Record<string, unknown> = { url: h.url, download_type: h.download_type, format: h.format, quality: h.quality, codec: 'auto', auto_start: true };
    if (this.config?.CUSTOM_DIRS && h.folder) body.folder = h.folder;
    try {
      const r = await post('add', body);
      if (r.status === 'error') { this.notify(`Pas à toi. ${r.msg ?? ''}`.trim(), 'error'); return false; }
      this.notify('Relancé. Mine !');
      this.tab = 'mine';
      return true;
    } catch (e) { this.notify(`Pas à toi. ${(e as Error).message}`, 'error'); return false; }
  }

  async cancel(key: string) { await post('delete', { ids: [key], where: 'queue' }).catch(() => {}); }
  async start(key: string) { await post('start', { ids: [key] }).catch(() => {}); }
  async retry(key: string) {
    const r = await post('retry', { id: key }).catch((e) => ({ status: 'error', msg: (e as Error).message }));
    if (r.status === 'error') this.notify(`Pas à toi. ${r.msg ?? ''}`.trim(), 'error');
  }
  dismiss(key: string, d: Download) {
    this.hidden = [...this.hidden, hiddenKey(key, d)];
    save(K.hidden, this.hidden);
  }
  async clearFinished() {
    const ids = Object.entries(this.done).filter(([, d]) => d.status === 'finished').map(([k]) => k);
    if (ids.length) await post('delete', { ids, where: 'done' }).catch(() => {});
  }

  fileUrl(d: { download_type: string; folder: string; filename?: string | null }): string | null {
    if (!d.filename || !this.config) return null;
    let base = d.download_type === 'audio' ? this.config.PUBLIC_HOST_AUDIO_URL : this.config.PUBLIC_HOST_URL;
    if (d.folder) base += d.folder.split('/').map(encodeURIComponent).join('/') + '/';
    return base + encodeURIComponent(d.filename);
  }
}

function hiddenKey(key: string, d: Download) { return `${key}#${d.timestamp}`; }

async function post(path: string, body: unknown): Promise<{ status?: string; msg?: string }> {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(text.replace(/^\d{3}:\s*/, '') || r.statusText);
  try { return JSON.parse(text); } catch { return {}; }
}

export function parseTime(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const parts = s.split(':').map(Number);
  if (parts.some((n) => !isFinite(n) || n < 0) || parts.length > 3) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Retire la partie playlist d'un lien YouTube pour ne prendre que la vidéo. */
export function singleVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has('v')) { u.searchParams.delete('list'); u.searchParams.delete('index'); }
    return u.toString();
  } catch { return url; }
}

export function isUrl(v: string): boolean {
  const s = v.trim();
  if (!/^https?:\/\//i.test(s)) return false;
  try { const u = new URL(s); return !!u.hostname && u.hostname.includes('.'); } catch { return false; }
}

/** Le premier lien http(s) trouvé dans un texte partagé. */
export function extractUrl(text: string | null | undefined): string {
  const m = (text ?? '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0] : '';
}

export const app = new AppState();
