<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { STATUS_TEXT, extOf, humanEta, humanSize, humanSpeed, label, siteOf } from '../lib/labels';
  import type { Download } from '../lib/types';
  import GullProgress from './GullProgress.svelte';

  let { key, d }: { key: string; d: Download } = $props();

  const active = $derived(!['finished', 'error', 'canceled'].includes(d.status));
  const known = $derived(d.status === 'downloading' && d.percent != null);
  const tone = $derived(d.status === 'finished' ? 'done' : d.status === 'error' ? 'error' : 'accent');
  const percent = $derived(d.status === 'finished' ? 100 : d.status === 'error' ? 100 : known ? d.percent : d.status === 'postprocessing' ? 100 : null);
  const href = $derived(d.status === 'finished' ? app.fileUrl(d) : null);
  const meta = $derived.by(() => {
    if (d.status === 'downloading') return [humanSpeed(d.speed), humanEta(d.eta)].filter(Boolean).join(' · ');
    if (d.status === 'finished') return [extOf(d.filename) || label(d.format, d.format.toUpperCase()), humanSize(d.size), d.folder].filter(Boolean).join(' · ');
    if (d.status === 'error') return d.msg || d.error || '';
    if (d.status === 'postprocessing') return 'Conversion et rangement du fichier';
    if (d.status === 'preparing') return 'Lecture du lien';
    if (d.status === 'queued') return 'En attente d’une place libre';
    return '';
  });
  let thumbFailed = $state(false);
</script>

<article class="card" data-status={d.status}>
  <div class="thumb" class:empty={!d.thumbnail || thumbFailed}>
    {#if d.thumbnail && !thumbFailed}
      <img src={d.thumbnail} alt="" loading="lazy" referrerpolicy="no-referrer" onerror={() => (thumbFailed = true)} />
    {:else}
      <span>{siteOf(d.url).slice(0, 1).toUpperCase() || '?'}</span>
    {/if}
  </div>
  <div class="body">
    <div class="top">
      <h3 title={d.title}>{d.title || d.url}</h3>
      <span class="state">
        {STATUS_TEXT[d.status] ?? d.status}{#if known}&nbsp;<b>{Math.floor(d.percent ?? 0)} %</b>{/if}
      </span>
    </div>
    <GullProgress {percent} {tone} />
    <div class="bottom">
      <span class="meta" class:err={d.status === 'error'} title={meta}>{meta}</span>
      <span class="actions">
        {#if d.status === 'pending'}
          <button onclick={() => app.start(key)}>Lancer</button>
        {/if}
        {#if active}
          <button onclick={() => app.cancel(key)}>Annuler</button>
        {:else if d.status === 'finished'}
          {#if href}<a class="primary" {href} download={d.filename ?? ''}>Récupérer</a>{/if}
          <button onclick={() => app.dismiss(key, d)} aria-label="Ranger dans l'historique">Ranger</button>
        {:else if d.status === 'error'}
          <button class="primary" onclick={() => app.retry(key)}>Réessayer</button>
          <button onclick={() => app.dismiss(key, d)}>Ranger</button>
        {/if}
      </span>
    </div>
  </div>
</article>

<style>
  .card { display: grid; grid-template-columns: 76px 1fr; gap: 16px; padding: 14px; border-radius: 18px; background: var(--surface);
    border: 1px solid var(--line); box-shadow: var(--shadow-sm); animation: land .45s var(--spring); }
  @keyframes land { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  .thumb { width: 76px; height: 56px; border-radius: 10px; overflow: hidden; background: var(--chip); display: grid; place-items: center; align-self: center; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb span { font-weight: 700; color: var(--muted); font-size: 20px; }
  .body { min-width: 0; display: grid; gap: 2px; }
  .top { display: flex; align-items: baseline; gap: 12px; justify-content: space-between; }
  h3 { margin: 0; font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .state { flex: none; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .state b { color: var(--ink); font-weight: 650; }
  [data-status='finished'] .state { color: var(--sea); font-weight: 700; }
  [data-status='error'] .state { color: var(--danger); font-weight: 700; }
  .bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 30px; }
  .meta { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .meta.err { color: var(--danger); white-space: normal; }
  .actions { display: flex; gap: 6px; flex: none; }
  .actions button, .actions a { border: 1px solid var(--line); background: none; color: var(--ink); font: inherit; font-size: 13px; font-weight: 600;
    padding: 5px 12px; border-radius: 9px; cursor: pointer; text-decoration: none; }
  .actions button:hover, .actions a:hover { border-color: var(--ink); }
  .actions .primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  @media (max-width: 560px) { .card { grid-template-columns: 1fr; } .thumb { display: none; } .bottom { flex-wrap: wrap; } }
</style>
