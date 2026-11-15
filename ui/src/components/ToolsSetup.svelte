<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { app } from '../lib/state.svelte';
  import { retryTools } from '../lib/desktop';

  const pct = $derived(app.tools.percent == null ? null : Math.floor(app.tools.percent));
  const stage = $derived(['yt-dlp', 'ffmpeg', 'deno'].includes(app.tools.stage) ? app.tools.stage : '');
</script>

<div class="setup" role="dialog" aria-modal="true" aria-labelledby="setup-title">
  <img src="gull-fly.webp" alt="" width="180" height="180" />
  <h2 id="setup-title">{app.tools.error ? t('toolsError') : t('toolsTitle')}{app.tools.error ? '' : '…'}</h2>
  {#if app.tools.error}
    <p class="err">{app.tools.error}</p>
    <button class="go" onclick={() => retryTools()}>{t('toolsRetry')}</button>
  {:else}
    <p>{t('toolsText')}</p>
    <div class="track" class:unknown={pct == null}><i style:width="{pct ?? 0}%"></i></div>
    <small>{stage}{pct != null && stage ? ` · ${pct} %` : ''}</small>
  {/if}
</div>

<style>
  .setup { position: fixed; inset: 0; z-index: 60; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; text-align: center; }
  h2 { margin: 0; font: 600 24px var(--display); }
  p { margin: 0; color: var(--muted); max-width: 40ch; }
  .err { color: var(--danger); font-size: 13px; word-break: break-word; }
  .track { width: min(320px, 80vw); margin-top: 10px; }
  small { color: var(--muted); font-variant-numeric: tabular-nums; min-height: 1.4em; }
  .go { margin-top: 8px; border: 0; border-radius: 99px; background: var(--beak); color: #14181C; font: 600 15px var(--display); padding: 10px 22px; cursor: pointer; }
</style>
