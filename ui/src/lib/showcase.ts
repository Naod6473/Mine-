// Vitrine (mine.apphero.cloud) : la vraie interface, mais rien n'est téléchargé.
// Le serveur est imité dans le navigateur : la mouette s'envole, l'avancement défile, « À moi ! »,
// puis un faux fichier apparaît comme s'il arrivait sur l'ordinateur.

export const SHOWCASE = import.meta.env.MODE === 'showcase';
export const SAMPLE_URL = 'https://www.youtube.com/watch?v=Q7HjxOAU5Kc';

type Handler = (raw: string) => void;
const handlers = new Map<string, Handler[]>();
const fire = (event: string, data: unknown = '') =>
  handlers.get(event)?.forEach((h) => h(typeof data === 'string' ? data : JSON.stringify(data)));

const CONFIG = {
  CUSTOM_DIRS: false, CREATE_CUSTOM_DIRS: false, DEFAULT_FOLDER: '', PUBLIC_HOST_URL: '', PUBLIC_HOST_AUDIO_URL: '',
  SEND_TO_BROWSER: true, SHOWCASE: true,
};
const FORMATS = {
  download_type: {
    default: 'audio',
    options: [
      { id: 'video', text: 'Vidéo', format: { default: 'any', options: [{ id: 'any', text: 'Auto' }, { id: 'mp4', text: 'MP4' }] } },
      { id: 'audio', text: 'Audio seul', format: { default: 'mp3', options: [{ id: 'mp3', text: 'MP3', quality: { default: 'best', options: [{ id: 'best', text: 'Meilleure' }] }, tags: true }] } },
    ],
  },
};

export function showcaseSocket() {
  const socket = {
    on(event: string, h: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), h]);
      return socket;
    },
  };
  setTimeout(() => {
    fire('configuration', CONFIG);
    fire('formats', FORMATS);
    fire('all', [[], []]);
    fire('connect');
  }, 600);
  return socket;
}

function titleFor(url: string): string {
  if (url.includes('Q7HjxOAU5Kc')) return '[Copyright Free Chill Background Music] - "Way Home" by @tokyowalker4038';
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return `Ta trouvaille sur ${h}`;
  } catch { return 'Ta trouvaille'; }
}

const stopped = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Imite /add : le téléchargement avance tout seul, puis se termine. */
export async function showcasePost(path: string, body: unknown): Promise<{ status?: string; msg?: string }> {
  if (path === 'delete') {
    const { ids, where } = body as { ids: string[]; where: string };
    for (const id of ids) { stopped.add(id); fire(where === 'queue' ? 'canceled' : 'cleared', JSON.stringify(id)); }
    return { status: 'ok' };
  }
  if (path !== 'add') return { status: 'ok' };
  const b = body as { url: string; download_type?: string; format?: string; quality?: string };
  const url = b.url;
  const title = titleFor(url);
  const audio = (b.download_type ?? 'audio') === 'audio';
  const ext = audio ? 'mp3' : 'mp4';
  const size = audio ? 8_600_000 : 48_000_000;
  const base = {
    id: url, title, url, quality: b.quality ?? 'best', download_type: audio ? 'audio' : 'video', codec: 'auto',
    format: b.format ?? ext, folder: '', msg: null, error: null, percent: null, speed: null, eta: null, size: null,
    filename: null, thumbnail: null, timestamp: Date.now() * 1e6,
  };
  stopped.delete(url);
  void (async () => {
    fire('added', { ...base, status: 'preparing' });
    await sleep(1400);
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const p = Math.min(100, (i / steps) * 100 + Math.random() * 2);
      const left = ((steps - i) / steps) * 4.5;
      if (stopped.has(url)) return;
      fire('updated', { ...base, status: 'downloading', percent: p, speed: 1.6e6 + Math.random() * 1.4e6, eta: Math.ceil(left) });
      await sleep(170 + Math.random() * 60);
    }
    if (stopped.has(url)) return;
    fire('updated', { ...base, status: 'postprocessing', percent: 100 });
    await sleep(1500);
    if (stopped.has(url)) return;
    const filename = `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 80)}.${ext}`;
    fire('completed', { ...base, status: 'finished', percent: 100, size, filename });
  })();
  return { status: 'ok' };
}

/** Le « fichier » qui arrive : une fausse bulle de téléchargement, façon navigateur. */
export function fakeDeliver(filename: string, size: number | null) {
  window.dispatchEvent(new CustomEvent('mine-fake-download', { detail: { filename, size } }));
}
