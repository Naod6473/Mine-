<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { app } from '../lib/state.svelte';
  import { openFile, reveal } from '../lib/desktop';
  import { extOf, humanEta, humanSize, humanSpeed, label } from '../lib/labels';
  import type { Download } from '../lib/types';

  let { key, d }: { key: string; d: Download } = $props();

  const active = $derived(!['finished', 'error', 'canceled'].includes(d.status));
  const known = $derived(d.status === 'downloading' && d.percent != null);
  const pct = $derived(d.status === 'finished' || d.status === 'error' || d.status === 'postprocessing' ? 100 : known ? d.percent ?? 0 : 0);
  const href = $derived(d.status !== 'finished' ? null : app.sendToBrowser ? app.takeUrl(d) : app.fileUrl(d));
  const state = $derived.by(() => {
    switch (d.status) {
      case 'downloading': return known ? t('pct', Math.floor(d.percent ?? 0)) : t('busy');
      case 'postprocessing': return t('almost');
      case 'finished': return t('cry');
      case 'error': return t('nope');
      case 'pending': return t('paused');
      case 'queued': return t('queued');
      default: return t('ask');
    }
  });
  const meta = $derived.by(() => {
    if (d.status === 'downloading') return [humanSpeed(d.speed), humanEta(d.eta)].filter(Boolean).join(' · ');
    if (d.status === 'finished') return [extOf(d.filename) || label(d.format, d.format.toUpperCase()), humanSize(d.size), d.folder].filter(Boolean).join(' · ');
    if (d.status === 'error') return d.msg || d.error || '';
    if (d.status === 'preparing') return t('reading');
    if (d.status === 'postprocessing') return t('converting');
    if (d.status === 'queued') return t('waiting');
    return '';
  });
</script>

<article class="row" data-status={d.status}>
  <div class="top">
    <h3 title={d.title}>{d.title || d.url}</h3>
    <span class="state">{state}</span>
  </div>
  <div class="track" class:ok={d.status === 'finished'} class:err={d.status === 'error'} class:unknown={active && !known && d.status !== 'postprocessing' && d.status !== 'pending'}>
    <i style:width="{pct}%"></i>
  </div>
  <div class="bottom">
    <span class="meta" class:err={d.status === 'error'} title={meta}>{meta}</span>
    <span class="actions">
      {#if d.status === 'pending'}<button class="textbtn strong" onclick={() => app.start(key)}>{t('start')}</button>{/if}
      {#if active}
        <button class="textbtn" onclick={() => app.cancel(key)}>{t('cancel')}</button>
      {:else if d.status === 'finished'}
        {#if app.desktop}
          {#if d.filepath}<button class="textbtn strong" onclick={() => openFile(d.filepath!)}>{t('open')}</button>{/if}
          <button class="textbtn" onclick={() => reveal(d.filepath)}>{t('reveal')}</button>
        {:else if href}<a class="textbtn strong" {href} download={d.filename ?? ''}>{t('fetch')}</a>{/if}
        <button class="textbtn" onclick={() => app.dismiss(key, d)}>{t('dismiss')}</button>
      {:else if d.status === 'error'}
        <button class="textbtn strong" onclick={() => app.retry(key)}>{t('retry')}</button>
        <button class="textbtn" onclick={() => app.dismiss(key, d)}>{t('dismiss')}</button>
      {/if}
    </span>
  </div>
</article>

<style>
  .row { display: grid; gap: 8px; animation: land .4s var(--ease); }
  @keyframes land { from { opacity: 0; transform: translateY(6px); } }
  .top, .bottom { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
  h3 { margin: 0; font-size: 14.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .state { flex: none; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  [data-status='finished'] .state { color: var(--sea); font-weight: 600; }
  [data-status='error'] .state { color: var(--danger); font-weight: 600; }
  .meta { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .meta.err { color: var(--danger); white-space: normal; }
  .actions { display: flex; gap: 16px; flex: none; }
</style>
