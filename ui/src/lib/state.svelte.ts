import { io, type Socket } from 'socket.io-client';
import type { Catalog, Download, HistoryEntry, Options, Preset, ServerConfig } from './types';
import { load, save } from './storage';
import { siteOf } from './labels';
import { t } from './i18n.svelte';
import { DESKTOP, desktopPost, desktopSocket } from './desktop';
import { SHOWCASE, showcasePost, showcaseSocket, fakeDeliver } from './showcase';

const K = { history: 'mine.history.v1', options: DESKTOP ? 'mine.options.desktop.v1' : 'mine.options.v2', mode: 'mine.mode.v1', presets: 'mine.presets.v1', hidden: 'mine.hidden.v1' };
const HISTORY_MAX = 500;

export const DEFAULT_OPTIONS: Options = {
  // Partout (web, démo, app de bureau) : MP3, meilleure qualité, avec la pochette.
  download_type: 'audio', codec: 'auto', format: 'mp3', quality: 'best',
  folder: '',
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
  tab = $state<Tab>(tabFromHash());
  submitting = $state(false);
  /** Visite guidée : ouverte d'office à la première visite, puis depuis le bas de page. */
  tour = $state(false);
  /** Cri de mouette à la fin d'un téléchargement lancé depuis ce navigateur. */
  sound = $state<boolean>(load('mine.sound.v1', true));
  private cry: HTMLAudioElement | null = null;
  /** Vrai pendant ~2 s après un téléchargement réussi : la mouette crie « Mine ! ». */
  celebrate = $state(false);
  private celebrateTimer: ReturnType<typeof setTimeout> | undefined;
  toast = $state<{ text: string; kind: 'info' | 'error' } | null>(null);
  /** Version de bureau : où en sont yt-dlp, ffmpeg et deno. */
  tools = $state<{ ready: boolean; stage: string; percent: number | null; error: string | null }>({ ready: !DESKTOP, stage: '', percent: null, error: null });
  readonly desktop = DESKTOP;
  readonly showcase = SHOWCASE;
  /** Démo publique : jeton Turnstile du moment (usage unique) et de quoi en demander un autre. */
  turnstileToken = $state('');
  turnstileReset: (() => void) | null = null;
  get demo() { return this.config?.DEMO ?? null; }
  /** Réglages par défaut, avec le dossier par défaut du serveur. */
  get defaults(): Options {
    return { ...DEFAULT_OPTIONS, folder: this.config?.DEFAULT_FOLDER ?? '' };
  }
  private socket: Socket | null = null;
  /** Liens lancés depuis ce navigateur : leur fichier y est envoyé automatiquement à la fin. */
  private mine = new Set<string>(sessionLoad());
  private claimUntil = 0;
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
    const s = DESKTOP ? (desktopSocket() as unknown as Socket) : SHOWCASE ? (showcaseSocket() as unknown as Socket) : this.socketIo();
    s.on('tools', (raw: string) => { if (raw) this.tools = JSON.parse(raw); });
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
    s.on('added', (raw: string) => {
      const d = parse<Download>(raw);
      this.queue[d.url] = d;
      if (Date.now() < this.claimUntil) { this.mine.add(d.url); sessionSave(this.mine); }
    });
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
        this.celebrateTimer = setTimeout(() => (this.celebrate = false), 2400);
        if (DESKTOP) this.shout(d);
        else if (this.mine.has(d.url)) {
          if (this.sendToBrowser) this.deliver(d);
          this.shout(d);
        }
      }
      if (this.mine.delete(d.url)) sessionSave(this.mine);
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

  private socketIo() {
    const path = new URL('socket.io', document.baseURI).pathname;
    const s = io({ path, transports: ['websocket', 'polling'] });
    this.socket = s;
    return s;
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
      filepath: d.filepath ?? null,
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

  /** Change de page et garde l'adresse à jour (#historique, #conditions, #confidentialite). */
  go(t: Tab) {
    this.tab = t;
    const hash = t === 'mine' ? '' : '#' + HASH[t];
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
    scrollTo({ top: 0 });
  }

  setMode(m: 'simple' | 'advanced') { this.mode = m; save(K.mode, m); }
  saveOptions() { save(K.options, $state.snapshot(this.options)); }
  resetOptions() { this.options = this.defaults; this.saveOptions(); }
  addPreset(name: string) {
    const p = { name, options: $state.snapshot(this.options) };
    this.presets = [...this.presets.filter((x) => x.name !== name), p];
    save(K.presets, this.presets);
  }
  removePreset(name: string) { this.presets = this.presets.filter((p) => p.name !== name); save(K.presets, this.presets); }
  applyPreset(p: Preset) { this.options = { ...this.defaults, ...p.options }; this.saveOptions(); }

  notify(text: string, kind: 'info' | 'error' = 'info') {
    this.toast = { text, kind };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), kind === 'error' ? 7000 : 3500);
  }

  /** Le corps envoyé à /add : en mode Simple, les réglages par défaut ; en Avancé, ceux du panneau. */
  payload(url: string, useOptions: boolean): Record<string, unknown> {
    const o = useOptions ? this.options : this.defaults;
    const body: Record<string, unknown> = {
      url, download_type: o.download_type, codec: o.codec, format: o.format, quality: o.quality,
      auto_start: true,
    };
    if (this.config?.CUSTOM_DIRS && o.folder) body.folder = o.folder;
    if (this.demo) {
      body.url = singleVideoUrl(url);
      if (this.turnstileToken) body.turnstile = this.turnstileToken;
    }
    if (!useOptions) return body;
    if (o.playlist === 'single') body.url = singleVideoUrl(url);
    if (o.playlist === 'limit' && !this.demo) body.playlist_item_limit = Math.max(1, Number(o.playlist_item_limit) || 1);
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
    this.askNotifications();
    this.submitting = true;
    try { return await this.addInner(url); } finally { this.submitting = false; }
  }

  private async addInner(url: string): Promise<boolean> {
    const body = this.payload(url, this.mode === 'advanced');
    this.claim();
    try {
      const r = await post('add', body);
      this.spendTurnstile();
      if (r.code === 'demo_turnstile') { this.notify(t('demoBot'), 'error'); return false; }
      if (r.status === 'error') {
        // Si le serveur a déjà affiché une carte d'erreur pour ce lien, inutile de le dire deux fois.
        await new Promise((res) => setTimeout(res, 400));
        const shown = Object.values(this.done).some((d) => d.status === 'error' && (d.url === url || d.url === body.url));
        if (!shown) this.notify(`${t('nope')} ${r.msg ?? ''}`.trim(), 'error');
        return shown;
      }
      if (r.msg) this.notify(r.msg);
      return true;
    } catch (e) {
      this.notify(`${t('nope')} ${(e as Error).message}`, 'error');
      return false;
    }
  }

  /** Relance un lien de l'historique avec le même type, format et qualité. */
  async again(h: HistoryEntry): Promise<boolean> {
    const body: Record<string, unknown> = { url: h.url, download_type: h.download_type, format: h.format, quality: h.quality, codec: 'auto', auto_start: true };
    if (this.config?.CUSTOM_DIRS && h.folder) body.folder = h.folder;
    if (this.demo && this.turnstileToken) body.turnstile = this.turnstileToken;
    this.claim();
    try {
      const r = await post('add', body);
      this.spendTurnstile();
      if (r.status === 'error') { this.notify(`${t('nope')} ${r.msg ?? ''}`.trim(), 'error'); return false; }
      this.notify(t('sentAgain'));
      this.go('mine');
      return true;
    } catch (e) { this.notify(`${t('nope')} ${(e as Error).message}`, 'error'); return false; }
  }

  /** Un jeton Turnstile ne sert qu'une fois : on en redemande un après chaque envoi. */
  private spendTurnstile() {
    if (!this.turnstileToken) return;
    this.turnstileToken = '';
    this.turnstileReset?.();
  }

  async cancel(key: string) { await post('delete', { ids: [key], where: 'queue' }).catch(() => {}); }
  async start(key: string) { await post('start', { ids: [key] }).catch(() => {}); }
  async retry(key: string) {
    const r = await post('retry', { id: key }).catch((e) => ({ status: 'error', msg: (e as Error).message }));
    if (r.status === 'error') this.notify(`${t('nope')} ${r.msg ?? ''}`.trim(), 'error');
  }
  dismiss(key: string, d: Download) {
    this.hidden = [...this.hidden, hiddenKey(key, d)];
    save(K.hidden, this.hidden);
  }
  async clearFinished() {
    const ids = Object.entries(this.done).filter(([, d]) => d.status === 'finished').map(([k]) => k);
    if (ids.length) await post('delete', { ids, where: 'done' }).catch(() => {});
  }

  setSound(v: boolean) { this.sound = v; save('mine.sound.v1', v); if (v) this.playCry(); }

  private playCry() {
    try {
      this.cry ??= Object.assign(new Audio('mine.mp3'), { volume: 0.55 });
      this.cry.currentTime = 0;
      void this.cry.play().catch(() => {});
    } catch {}
  }

  /** Fin d'un téléchargement : un cri, et une notification si l'onglet est caché. */
  private shout(d: Download) {
    if (this.sound) this.playCry();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(t('cry'), { body: d.title || d.url, icon: 'icon-192.png', tag: d.url }); } catch {}
    }
  }

  /** Demande une fois, au premier clic sur « Mine ! », le droit de prévenir quand c'est fini. */
  private askNotifications() {
    if (SHOWCASE) return;
    if ('Notification' in window && Notification.permission === 'default') {
      try { void Notification.requestPermission().catch(() => {}); } catch {}
    }
  }

  /** Le serveur ne garde pas les fichiers : il les envoie au navigateur puis les efface. */
  get sendToBrowser() { return this.config?.SEND_TO_BROWSER !== false; }

  /** Les téléchargements annoncés dans la minute qui suit un ajout viennent de ce navigateur. */
  private claim() { this.claimUntil = Date.now() + 60_000; }

  /** Déclenche le téléchargement du fichier dans le navigateur. */
  deliver(d: Download) {
    if (SHOWCASE) { if (d.filename) fakeDeliver(d.filename, d.size ?? null); return; }
    const href = this.takeUrl(d);
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = '';
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  }

  takeUrl(d: { url: string; filename?: string | null }): string | null {
    if (SHOWCASE) return null;
    return d.filename ? `take?id=${encodeURIComponent(d.url)}` : null;
  }

  fileUrl(d: { download_type: string; folder: string; filename?: string | null }): string | null {
    if (!d.filename || !this.config) return null;
    // Envoyé au navigateur puis effacé : il n'y a plus de fichier à pointer sur le serveur.
    if (this.sendToBrowser) return null;
    let base = d.download_type === 'audio' ? this.config.PUBLIC_HOST_AUDIO_URL : this.config.PUBLIC_HOST_URL;
    if (d.folder) base += d.folder.split('/').map(encodeURIComponent).join('/') + '/';
    return base + encodeURIComponent(d.filename);
  }
}

export type Tab = 'mine' | 'history' | 'terms' | 'privacy' | 'sites';
const HASH: Record<Exclude<Tab, 'mine'>, string> = { history: 'historique', terms: 'conditions', privacy: 'confidentialite', sites: 'sites' };
function tabFromHash(): Tab {
  const h = location.hash.slice(1);
  return (Object.entries(HASH).find(([, v]) => v === h)?.[0] as Tab) ?? 'mine';
}

const MINE_KEY = 'mine.claimed.v1';
function sessionLoad(): string[] {
  try { return JSON.parse(sessionStorage.getItem(MINE_KEY) ?? '[]'); } catch { return []; }
}
function sessionSave(set: Set<string>) {
  try { sessionStorage.setItem(MINE_KEY, JSON.stringify([...set].slice(-200))); } catch {}
}

function hiddenKey(key: string, d: Download) { return `${key}#${d.timestamp}`; }

async function post(path: string, body: unknown): Promise<{ status?: string; msg?: string; code?: string }> {
  if (DESKTOP) return desktopPost(path, body);
  if (SHOWCASE) return showcasePost(path, body);
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) {
    // Les refus de la démo (quota, anti-robot…) arrivent en JSON avec un message lisible.
    try { const j = JSON.parse(text); if (j && typeof j.msg === 'string') return { status: 'error', msg: j.msg, code: j.code }; } catch {}
    throw new Error(text.replace(/^\d{3}:\s*/, '') || r.statusText);
  }
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
