<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { app } from '../lib/state.svelte';

  const SOURCE_URL = 'https://github.com/Naod6473/Mine-';
  const demo = $derived(app.demo);

  // Turnstile (Cloudflare) : le plus souvent invisible, il ne s'affiche que s'il a un doute.
  type Turnstile = {
    render: (el: HTMLElement, o: Record<string, unknown>) => string;
    reset: (id?: string) => void;
    remove: (id?: string) => void;
  };
  let box: HTMLDivElement | undefined = $state();

  function loadScript(): Promise<Turnstile> {
    const w = window as unknown as { turnstile?: Turnstile };
    if (w.turnstile) return Promise.resolve(w.turnstile);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile')));
      s.onerror = () => reject(new Error('turnstile'));
      document.head.append(s);
    });
  }

  $effect(() => {
    const key = demo?.turnstile_sitekey;
    const el = box;
    if (!key || !el) return;
    let id: string | undefined;
    let ts: Turnstile | undefined;
    loadScript().then((api) => {
      ts = api;
      id = api.render(el, {
        sitekey: key,
        appearance: 'interaction-only',
        language: document.documentElement.lang || 'auto',
        callback: (token: string) => { app.turnstileToken = token; },
        'expired-callback': () => { app.turnstileToken = ''; api.reset(id); },
        'error-callback': () => { app.turnstileToken = ''; },
      });
      app.turnstileReset = () => api.reset(id);
    }).catch(() => {});
    return () => { app.turnstileReset = null; if (ts && id) ts.remove(id); };
  });
</script>

{#if demo}
  <aside class="demo" aria-label={t('demoTitle')}>
    <strong>{t('demoTitle')}</strong>
    <p>{t('demoLimits', demo.per_hour, demo.max_minutes)}</p>
    <p class="home">{t('demoHome')}</p>
    <p class="links">
      <a href={demo.install_url} target="_blank" rel="noreferrer">{t('demoInstall')}</a>
      <span>·</span>
      <a href={SOURCE_URL} target="_blank" rel="noreferrer">{t('demoCode')}</a>
    </p>
    <div class="ts" bind:this={box}></div>
  </aside>
{/if}

<style>
  .demo { margin: 18px 0 0; padding: 14px 18px; border-radius: 18px; border: 1px dashed color-mix(in oklab, var(--beak) 55%, var(--line));
    background: color-mix(in oklab, var(--beak) 7%, var(--surface)); font-size: 13.5px; color: var(--ink); }
  strong { font-family: var(--display); font-weight: 600; font-size: 15px; color: var(--beak); }
  p { margin: 4px 0 0; }
  .home { color: var(--muted); }
  .links { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 8px; font-weight: 600; }
  .links a { color: var(--sea); }
  .links span { color: var(--muted); }
  .ts:not(:empty) { margin-top: 10px; }
</style>
