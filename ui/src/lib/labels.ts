import { i18n, t } from './i18n.svelte';

// Libellés des options envoyées par le serveur (repli : texte du serveur, en anglais).
const L: Record<'fr' | 'en', Record<string, string>> = {
  fr: {
    video: 'Vidéo', audio: 'Audio seul', captions: 'Sous-titres', thumbnail: 'Miniature',
    any: 'Auto', auto: 'Auto', ios: 'Compatible iOS', best: 'Meilleure', worst: 'Minimale',
    with_cover: 'Avec pochette', no_cover: 'Sans pochette', none: 'Aucun tag',
    prefer_manual: 'Manuels de préférence', prefer_auto: 'Automatiques de préférence',
    manual_only: 'Manuels uniquement', auto_only: 'Automatiques uniquement',
    txt: 'TXT (texte seul)',
  },
  en: {
    video: 'Video', audio: 'Audio only', captions: 'Subtitles', thumbnail: 'Thumbnail',
    any: 'Auto', auto: 'Auto', ios: 'iOS compatible', best: 'Best', worst: 'Lowest',
    with_cover: 'With cover', no_cover: 'Without cover', none: 'No tags',
    prefer_manual: 'Manual preferred', prefer_auto: 'Automatic preferred',
    manual_only: 'Manual only', auto_only: 'Automatic only',
    txt: 'TXT (text only)',
  },
};

function languageName(id: string, fallback: string): string {
  try {
    const name = new Intl.DisplayNames([i18n.locale], { type: 'language' }).of(id);
    return name ? name[0].toUpperCase() + name.slice(1) : fallback;
  } catch {
    return fallback;
  }
}

export function label(id: string, fallback: string, field = ''): string {
  if (field === 'subtitle_language') return languageName(id, fallback);
  if (field === 'quality' && /^\d+$/.test(id) && fallback.includes('kbps')) return `${id} kb/s`;
  return L[i18n.lang][id] ?? fallback;
}

export function humanSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const u = i18n.lang === 'fr' ? ['o', 'Ko', 'Mo', 'Go', 'To'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toLocaleString(i18n.locale, { maximumFractionDigits: n < 10 && i > 0 ? 1 : 0 })} ${u[i]}`;
}

export function humanSpeed(bps: number | null | undefined): string {
  return bps ? `${humanSize(bps)}/s` : '';
}

export function humanEta(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec)) return '';
  if (sec < 60) return t('left', `${Math.max(1, Math.round(sec))} s`);
  if (sec < 3600) return t('left', `${Math.round(sec / 60)} min`);
  const h = Math.floor(sec / 3600);
  return t('left', `${h} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`);
}

export function siteOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\.|^m\./, ''); } catch { return ''; }
}

export function relativeDate(ms: number): string {
  const d = new Date(ms); const now = new Date();
  const day = 864e5;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = d.toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
  if (ms >= startToday) return t('today', time);
  if (ms >= startToday - day) return t('yesterday', time);
  return d.toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }) + `, ${time}`;
}

export function extOf(filename: string | null | undefined): string {
  const m = (filename ?? '').match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toUpperCase() : '';
}
