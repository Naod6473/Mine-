<script lang="ts">
  import { onMount } from 'svelte';
  import { app, extractUrl } from './lib/state.svelte';
  import MineBar from './components/MineBar.svelte';
  import DownloadRow from './components/DownloadRow.svelte';
  import Sky from './components/Sky.svelte';
  import History from './components/History.svelte';
  import Splash from './components/Splash.svelte';
  import { theme } from './lib/theme.svelte';

  const SOURCE_URL = 'https://github.com/Naod6473/Mine-';

  // Lien reçu par le partage Android (PWA) ou par ?url=…
  const params = new URLSearchParams(location.search);
  const shared = extractUrl(params.get('url')) || extractUrl(params.get('text')) || extractUrl(params.get('title'));
  if (shared) history.replaceState(null, '', location.pathname);

  let version = $state('');
  const finishedCount = $derived(app.cards.filter(([, d]) => d.status === 'finished').length);
  const heading = $derived(app.activeCount >= 3 ? 'Mine ! Mine ! Mine !' : app.activeCount ? 'En cours' : 'Récemment');

  onMount(() => {
    app.connect();
    fetch('version').then((r) => r.json()).then((v) => (version = v.version ?? '')).catch(() => {});
  });

  function tidy() {
    for (const [k, d] of app.cards) if (d.status === 'finished') app.dismiss(k, d);
  }
</script>

<svelte:head>
  <title>{app.activeCount ? `(${app.activeCount}) Mine… · Mine!?` : 'Mine!?'}</title>
</svelte:head>

<header>
  <button class="brand" onclick={() => (app.tab = 'mine')} aria-label="Mine!?, accueil">
    <img src="gull-head.png" alt="" width="30" height="30" />
    <span>Mine!?</span>
  </button>
  <nav aria-label="Sections">
    <button class:on={app.tab === 'mine'} onclick={() => (app.tab = 'mine')} aria-current={app.tab === 'mine' ? 'page' : undefined}>
      Mine{#if app.activeCount}<span class="badge">{app.activeCount}</span>{/if}
    </button>
    <button class:on={app.tab === 'history'} onclick={() => (app.tab = 'history')} aria-current={app.tab === 'history' ? 'page' : undefined}>Historique</button>
    <button class="mode" onclick={() => theme.toggle()} aria-label={theme.current === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit'} title={theme.current === 'dark' ? 'Mode jour' : 'Mode nuit'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class:night={theme.current === 'dark'}>
        <mask id="moon"><rect width="24" height="24" fill="#fff" /><circle class="bite" cx="24" cy="4" r="7" fill="#000" /></mask>
        <circle class="core" cx="12" cy="12" r="5" mask="url(#moon)" fill="currentColor" />
        <g class="rays" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
    </button>
  </nav>
</header>

{#if app.everConnected && !app.connected}
  <div class="offline" role="status">Le serveur ne répond plus, je réessaie…</div>
{/if}

<main>
  {#if !app.everConnected}
    <Splash text="Mine ?" />
  {:else if app.tab === 'mine'}
    <section class="hero">
      <Sky />
      <MineBar initialUrl={shared} />
    </section>

    {#if app.cards.length}
      <section class="cards" aria-live="polite">
        <div class="cards-head">
          <h2>{heading}</h2>
          {#if finishedCount}<button class="link" onclick={tidy}>Tout ranger</button>{/if}
        </div>
        {#each app.cards as [key, d] (key)}
          <DownloadRow {key} {d} />
        {/each}
      </section>
    {/if}
  {:else}
    <History />
  {/if}
</main>

<footer class="foot">
  <a href={SOURCE_URL} target="_blank" rel="noreferrer">Code source</a>
  {#if version}<span>· {version}</span>{/if}
</footer>

{#if app.toast}
  <div class="toast" data-kind={app.toast.kind} role={app.toast.kind === 'error' ? 'alert' : 'status'}>
    {app.toast.text}
    <button onclick={() => (app.toast = null)} aria-label="Fermer">×</button>
  </div>
{/if}

<style>
  header { max-width: 720px; margin: 0 auto; padding: 20px 20px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .brand { display: inline-flex; align-items: center; gap: 9px; border: 0; background: none; cursor: pointer; padding: 0; }
  .brand img { border-radius: 9px; }
  .brand span { font-family: var(--display); font-size: 21px; font-weight: 600; letter-spacing: -.01em; }
  nav { display: flex; gap: 20px; }
  nav button { position: relative; border: 0; background: none; color: var(--muted); font: 500 14px var(--body); padding: 6px 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  nav button:hover, nav button.on { color: var(--ink); }
  nav button.on { font-weight: 600; }
  .mode { width: 32px; height: 32px; justify-content: center; border-radius: 99px; margin-left: -6px; }
  .mode:hover { background: var(--wash); }
  .mode svg { overflow: visible; }
  .mode .core { transition: r .5s var(--ease); }
  .mode .bite { transition: cx .5s var(--ease), cy .5s var(--ease); }
  .mode .rays { transform-origin: 12px 12px; transition: opacity .35s, transform .5s var(--ease); }
  .mode .night .core { r: 8; }
  .mode .night .bite { cx: 17; cy: 7; }
  .mode .night .rays { opacity: 0; transform: rotate(-45deg) scale(.6); }
  .badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px; background: var(--beak); color: #14181C; font-size: 11px; font-weight: 700; display: inline-grid; place-items: center; }
  main { max-width: 640px; margin: 0 auto; padding: 0 20px 40px; }
  .hero { padding: clamp(8px, 4vh, 40px) 0 32px; }
  .cards { display: grid; gap: 26px; margin-top: 8px; }
  .cards-head { display: flex; justify-content: space-between; align-items: baseline; }
  h2 { margin: 0; font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; }
  .link { border: 0; background: none; color: var(--muted); font: 500 13px var(--body); cursor: pointer; padding: 0; }
  .link:hover { color: var(--ink); }
  main:has(:global(.history)) { padding-top: 36px; max-width: 720px; }
  .offline { max-width: 600px; margin: 14px auto 0; padding: 8px 14px; border-radius: 99px; background: color-mix(in oklab, var(--danger) 10%, var(--bg)); color: var(--danger); font-size: 13px; font-weight: 500; text-align: center; }
  .foot { text-align: center; padding: 28px 20px 32px; font-size: 12px; color: var(--muted); }
  .foot a { color: inherit; }
  .toast { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); max-width: min(560px, calc(100vw - 32px)); display: flex; align-items: center; gap: 12px;
    padding: 11px 12px 11px 18px; border-radius: 99px; background: var(--ink); color: var(--bg); font-size: 14px; box-shadow: 0 10px 30px -12px rgb(0 0 0 / .35); animation: toast .35s var(--spring); z-index: 10; }
  .toast[data-kind='error'] { background: var(--danger); color: #fff; border-radius: 18px; }
  .toast button { border: 0; background: none; color: inherit; font-size: 18px; cursor: pointer; opacity: .7; }
  @keyframes toast { from { opacity: 0; transform: translate(-50%, 12px) scale(.96); } }
</style>
