<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { extOf, humanSize, label, relativeDate } from '../lib/labels';
  import type { HistoryEntry } from '../lib/types';

  let q = $state('');
  let filter = $state<'all' | 'ok' | 'error'>('all');
  let confirmClear = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  const list = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return app.history.filter((h) =>
      (filter === 'all' || h.status === filter) &&
      (!needle || h.title.toLowerCase().includes(needle) || h.site.includes(needle) || h.url.toLowerCase().includes(needle)));
  });
  const counts = $derived({ ok: app.history.filter((h) => h.status === 'ok').length, error: app.history.filter((h) => h.status === 'error').length });

  async function copy(h: HistoryEntry) {
    try { await navigator.clipboard.writeText(h.url); app.notify('Lien copié.'); }
    catch { app.notify('Copie impossible ici : le lien est ' + h.url); }
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(app.history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mine-historique-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function importJson(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error();
      const before = app.history.length;
      app.importHistory(data);
      app.notify(`${app.history.length - before} entrée(s) ajoutée(s).`);
    } catch { app.notify('Pas à toi. Ce fichier n’est pas un historique Mine!?.', 'error'); }
    if (fileInput) fileInput.value = '';
  }
  function clearAll() {
    if (!confirmClear) { confirmClear = true; setTimeout(() => (confirmClear = false), 4000); return; }
    app.clearHistory(); confirmClear = false;
  }
</script>

<section class="history">
  <div class="tools">
    <input class="search" type="search" bind:value={q} placeholder="Rechercher un titre ou un site" aria-label="Rechercher dans l'historique" />
    <div class="seg" role="radiogroup" aria-label="Filtrer">
      <button role="radio" aria-checked={filter === 'all'} class:on={filter === 'all'} onclick={() => (filter = 'all')}>Tout <small>{app.history.length}</small></button>
      <button role="radio" aria-checked={filter === 'ok'} class:on={filter === 'ok'} onclick={() => (filter = 'ok')}>Réussis <small>{counts.ok}</small></button>
      <button role="radio" aria-checked={filter === 'error'} class:on={filter === 'error'} onclick={() => (filter = 'error')}>Échoués <small>{counts.error}</small></button>
    </div>
  </div>

  {#if app.history.length === 0}
    <div class="empty">
      <img src="gull-head.png" alt="" width="56" height="56" />
      <p>Rien dans le bec pour l'instant.</p>
      <small>Les téléchargements terminés apparaissent ici, dans ce navigateur uniquement.</small>
    </div>
  {:else if list.length === 0}
    <div class="empty"><p>Rien ne correspond.</p></div>
  {:else}
    <ul>
      {#each list as h (h.key)}
        {@const href = h.status === 'ok' ? app.fileUrl(h) : null}
        <li class:err={h.status === 'error'}>
          <div class="thumb">
            {#if h.thumbnail}<img src={h.thumbnail} alt="" loading="lazy" referrerpolicy="no-referrer" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />{/if}
            <img class="ph" src="gull-head.png" alt="" />
          </div>
          <div class="info">
            <a class="title" href={h.url} target="_blank" rel="noreferrer" title={h.title}>{h.title}</a>
            <span class="meta">
              {[h.site, relativeDate(h.date), extOf(h.filename) || label(h.format, h.format.toUpperCase()), humanSize(h.size), h.folder].filter(Boolean).join(' · ')}
            </span>
            {#if h.error}<span class="error" title={h.error}>Pas à toi. {h.error}</span>{/if}
          </div>
          <div class="actions">
            {#if href}<a {href} download={h.filename ?? ''} title="Récupérer le fichier">Fichier</a>{/if}
            <button onclick={() => app.again(h)} title="Relancer avec les mêmes options">Relancer</button>
            <button onclick={() => copy(h)} title="Copier le lien d'origine">Copier</button>
            <button class="x" onclick={() => app.removeHistory(h.key)} aria-label="Retirer de l'historique" title="Retirer">×</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <footer>
    <span>Gardé dans ce navigateur, 500 entrées maximum.</span>
    <span class="links">
      <button onclick={exportJson} disabled={!app.history.length}>Exporter</button>
      <button onclick={() => fileInput?.click()}>Importer</button>
      <button class:danger={confirmClear} onclick={clearAll} disabled={!app.history.length}>{confirmClear ? 'Sûr ? Cliquer encore' : 'Tout effacer'}</button>
    </span>
    <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={importJson} />
  </footer>
</section>

<style>
  .history { display: grid; gap: 18px; }
  .tools { display: flex; gap: 12px 18px; flex-wrap: wrap; align-items: center; }
  .search { flex: 1; min-width: 200px; height: 40px; border: 0; border-bottom: 1px solid var(--line); background: none; font: 15px var(--body); padding: 0 2px; outline: none; }
  .search:focus { border-bottom-color: var(--ink); }
  .seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 99px; background: var(--wash); }
  .seg button { border: 0; background: none; font: 500 13px var(--body); color: var(--muted); padding: 6px 13px; border-radius: 99px; cursor: pointer; }
  .seg button.on { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgb(0 0 0 / .06); }
  .seg small { font-weight: 500; opacity: .7; margin-left: 2px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 56px 1fr auto; gap: 14px; align-items: center; padding: 14px 0; border-top: 1px solid var(--line); }
  li:last-child { border-bottom: 1px solid var(--line); }
  .thumb { position: relative; width: 56px; height: 38px; border-radius: 8px; overflow: hidden; background: var(--wash); display: grid; place-items: center; }
  .thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .thumb .ph { position: static; width: 26px; height: 26px; opacity: .55; filter: grayscale(.4); }
  .info { min-width: 0; display: grid; gap: 2px; }
  .title { color: var(--ink); text-decoration: none; font-weight: 500; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .title:hover { text-decoration: underline; text-underline-offset: 3px; }
  .meta { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .error { font-size: 12.5px; color: var(--danger); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; gap: 14px; }
  .actions a, .actions button { border: 0; background: none; color: var(--muted); font: 500 13px var(--body); padding: 0; cursor: pointer; text-decoration: none; }
  .actions a:hover, .actions button:hover { color: var(--ink); }
  .actions .x { font-size: 18px; line-height: 1; }
  .empty { display: grid; justify-items: center; gap: 6px; padding: 56px 16px; text-align: center; color: var(--muted); }
  .empty img { border-radius: 14px; }
  .empty p { margin: 8px 0 0; font-family: var(--display); font-weight: 500; font-size: 18px; color: var(--ink); }
  footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); }
  .links { display: flex; gap: 16px; }
  .links button { border: 0; background: none; color: var(--muted); font: 500 12.5px var(--body); cursor: pointer; padding: 0; }
  .links button:hover:not(:disabled) { color: var(--ink); }
  .links button:disabled { opacity: .4; cursor: default; }
  .links .danger { color: var(--danger); }
  @media (max-width: 560px) {
    li { grid-template-columns: 1fr auto; }
    .thumb { display: none; }
    .actions { flex-direction: column; gap: 4px; align-items: flex-end; }
  }
</style>
