export type Status =
  | 'pending' | 'queued' | 'scheduled' | 'preparing' | 'downloading'
  | 'postprocessing' | 'finished' | 'error' | 'canceled' | string;

export interface Download {
  id: string;
  title: string;
  url: string;
  quality: string;
  download_type: string;
  codec: string;
  format: string;
  folder: string;
  status: Status;
  msg: string | null;
  error: string | null;
  percent: number | null;
  speed: number | null;
  eta: number | null;
  size: number | null;
  filename?: string | null;
  filepath?: string | null;
  thumbnail?: string | null;
  timestamp: number;
  chapter_files?: { filename: string; size?: number }[];
}

export interface Choice<T = Option> { default: string; options: T[] }
export interface Option { id: string; text: string }
export interface FormatOption extends Option { quality?: Choice; tags?: boolean }
export interface TypeOption extends Option {
  codec?: Choice;
  format: Choice<FormatOption>;
  audio_tags?: Choice;
  subtitle_mode?: Choice;
  subtitle_language?: Choice;
}
export interface Catalog { download_type: Choice<TypeOption> }

export interface ServerConfig {
  CUSTOM_DIRS: boolean;
  CREATE_CUSTOM_DIRS: boolean;
  DEFAULT_FOLDER: string;
  PUBLIC_HOST_URL: string;
  SEND_TO_BROWSER?: boolean;
  PUBLIC_HOST_AUDIO_URL: string;
  DEFAULT_OPTION_PLAYLIST_ITEM_LIMIT?: number | string;
  [k: string]: unknown;
}

export interface Options {
  download_type: string;
  codec: string;
  format: string;
  quality: string;
  folder: string;
  playlist: 'all' | 'single' | 'limit';
  playlist_item_limit: number;
  subtitle_language: string;
  subtitle_mode: string;
  audio_tags: string;
  clip_start: string;
  clip_end: string;
  custom_name_prefix: string;
  split_by_chapters: boolean;
  sponsorblock: boolean;
}

export interface Preset { name: string; options: Options }

export interface HistoryEntry {
  key: string;          // url + horodatage serveur : unique par téléchargement
  url: string;
  title: string;
  site: string;
  thumbnail: string | null;
  status: 'ok' | 'error';
  error: string | null;
  download_type: string;
  format: string;
  quality: string;
  folder: string;
  filename: string | null;
  size: number | null;
  filepath?: string | null;
  date: number;         // ms
}
