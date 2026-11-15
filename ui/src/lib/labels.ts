// Libellés français des options envoyées par le serveur (repli : texte du serveur).
const L: Record<string, string> = {
  video: 'Vidéo', audio: 'Audio seul', captions: 'Sous-titres', thumbnail: 'Miniature',
  any: 'Auto', auto: 'Auto', ios: 'Compatible iOS', best: 'Meilleure', worst: 'Minimale',
  with_cover: 'Avec pochette', no_cover: 'Sans pochette', none: 'Aucun tag',
  prefer_manual: 'Manuels de préférence', prefer_auto: 'Automatiques de préférence',
  manual_only: 'Manuels uniquement', auto_only: 'Automatiques uniquement',
  'txt': 'TXT (texte seul)',
};
const LANG: Record<string, string> = {
  fr: 'Français', en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien', pt: 'Portugais',
  'pt-BR': 'Portugais (Brésil)', nl: 'Néerlandais', ja: 'Japonais', ko: 'Coréen', ru: 'Russe',
  ar: 'Arabe', zh: 'Chinois', 'zh-Hans': 'Chinois simplifié', 'zh-Hant': 'Chinois traditionnel',
  pl: 'Polonais', sv: 'Suédois', tr: 'Turc', uk: 'Ukrainien', el: 'Grec', he: 'Hébreu', hi: 'Hindi',
};

export function label(id: string, fallback: string, field = ''): string {
  if (field === 'subtitle_language') return LANG[id] ?? fallback;
  if (field === 'quality' && /^\d+$/.test(id) && fallback.includes('kbps')) return `${id} kb/s`;
  return L[id] ?? fallback;
}

export const STATUS_TEXT: Record<string, string> = {
  pending: 'Mine ?',
  queued: 'Mine ? En file',
  scheduled: 'Mine ? Programmé',
  preparing: 'Mine… je regarde',
  downloading: 'Mine…',
  postprocessing: 'Mine… presque',
  finished: 'Mine !',
  error: 'Pas à toi.',
  canceled: 'Laissé tomber',
};

export function humanSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const u = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 && i > 0 ? 1 : 0 })} ${u[i]}`;
}

export function humanSpeed(bps: number | null | undefined): string {
  return bps ? `${humanSize(bps)}/s` : '';
}

export function humanEta(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec)) return '';
  if (sec < 60) return `reste ${Math.max(1, Math.round(sec))} s`;
  if (sec < 3600) return `reste ${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  return `reste ${h} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
}

export function siteOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\.|^m\./, ''); } catch { return ''; }
}

export function relativeDate(ms: number): string {
  const d = new Date(ms); const now = new Date();
  const day = 864e5;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (ms >= startToday) return `Aujourd'hui, ${time}`;
  if (ms >= startToday - day) return `Hier, ${time}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }) + `, ${time}`;
}

export function extOf(filename: string | null | undefined): string {
  const m = (filename ?? '').match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toUpperCase() : '';
}
