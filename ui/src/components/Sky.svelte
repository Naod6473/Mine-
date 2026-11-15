<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  // La mouette n'apparaît que pendant un téléchargement : elle s'envole, bat des ailes et annonce l'avancement.
  import { app } from '../lib/state.svelte';

  const lead = $derived(app.lead);
  const flying = $derived(app.submitting || !!lead || app.celebrate);
  const others = $derived(Math.max(0, app.activeCount - 1));
  const caption = $derived.by(() => {
    if (lead) {
      if (lead.status === 'downloading' && lead.percent != null) return t('pct', Math.floor(lead.percent));
      if (lead.status === 'postprocessing') return t('almost');
      return t('ask');
    }
    if (app.submitting) return t('ask');
    if (app.celebrate) return t('cry');
    return '';
  });
  const pct = $derived(lead?.status === 'downloading' && lead.percent != null ? lead.percent : lead?.status === 'postprocessing' ? 100 : null);
</script>

<div class="sky" class:flying aria-live="polite">
  <img class="gull" src="gull-fly.webp" alt="" width="360" height="229" />
  <div class="caption">
    {#key caption === t('cry')}
      <span class:pop={caption === t('cry')} class:done={caption === t('cry')}>{caption}</span>
    {/key}
    {#if others && lead}<small>+{others} en cours</small>{/if}
  </div>
  <div class="track mini" class:unknown={flying && pct == null && !app.celebrate} class:ok={app.celebrate && !lead}>
    <i style:width="{app.celebrate && !lead ? 100 : pct ?? 0}%"></i>
  </div>
</div>

<style>
  .sky { position: relative; height: 0; overflow: hidden; transition: height .6s var(--ease); }
  .sky.flying { height: clamp(190px, 30vh, 250px); }
  .gull { position: absolute; left: 50%; top: 44%; width: clamp(190px, 30vh, 250px); height: auto; pointer-events: none;
    opacity: 0; transform: translate(-50%, -40%) scale(.9); transition: opacity .4s var(--ease), transform .5s var(--ease); }
  .flying .gull { opacity: 1; transform: translate(-50%, -50%); animation: bob 2.4s ease-in-out .4s infinite; }
  @keyframes bob { 50% { transform: translate(-50%, calc(-50% - 9px)); } }
  .caption { position: absolute; bottom: 14px; left: 0; right: 0; display: flex; justify-content: center; align-items: baseline; gap: 8px; min-height: 28px;
    font-family: var(--display); font-weight: 500; font-size: 20px; font-variant-numeric: tabular-nums; }
  .caption .done { color: var(--sea); font-weight: 600; }
  .caption small { font-family: var(--body); font-size: 12.5px; color: var(--muted); font-weight: 500; }
  .mini { position: absolute; bottom: 4px; left: 50%; width: 180px; margin-left: -90px; }
  .mini > :global(i) { background: var(--beak); }
  @media (prefers-reduced-motion: reduce) { .flying .gull { animation: none; } .sky { transition: none; } }
</style>
