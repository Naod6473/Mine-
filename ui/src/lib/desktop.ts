// Version de bureau (Tauri) : les mêmes événements que le serveur, mais venus de l'app elle-même.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const DESKTOP = import.meta.env.MODE === 'desktop';

type Handler = (raw: string) => void;

/** Remplace la connexion Socket.IO : `on(événement, fonction)`, et rien d'autre. */
export function desktopSocket() {
  const handlers = new Map<string, Handler[]>();
  const fire = (event: string, data = '') => handlers.get(event)?.forEach((h) => h(data));
  const socket = {
    on(event: string, h: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), h]);
      return socket;
    },
  };
  queueMicrotask(async () => {
    await listen<{ event: string; data: string }>('mine', (e) => fire(e.payload.event, e.payload.data));
    const [formats, hello] = await Promise.all([
      fetch('formats.json').then((r) => r.text()),
      invoke<{ config: string; all: string; tools: string }>('hello'),
    ]);
    fire('configuration', hello.config);
    fire('formats', formats);
    fire('tools', hello.tools);
    fire('all', hello.all);
    fire('connect');
  });
  return socket;
}

const COMMANDS: Record<string, string> = { add: 'add', delete: 'remove', retry: 'retry', start: 'start' };

export async function desktopPost(path: string, body: unknown): Promise<{ status?: string; msg?: string }> {
  const cmd = COMMANDS[path];
  if (!cmd) return { status: 'error', msg: path };
  return (await invoke<{ status?: string; msg?: string }>(cmd, { body })) ?? {};
}

export const openFile = (path: string) => invoke('open_file', { path });
export const reveal = (path?: string | null) => invoke('reveal', { path: path ?? null });
export const chooseFolder = () => invoke<string>('choose_folder');
export const retryTools = () => invoke('setup_tools');

/** Les liens externes s'ouvrent dans le navigateur de l'ordinateur, pas dans la fenêtre de l'app. */
export function externalLinks() {
  addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !/^https?:\/\//i.test(a.href) || a.origin === location.origin) return;
    e.preventDefault();
    void invoke('open_url', { url: a.href }).catch(() => {});
  });
}
