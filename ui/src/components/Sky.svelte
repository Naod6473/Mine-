<script lang="ts">
  // Animation 2 « Sur place » : le logo s'envole et bat des ailes tant qu'un téléchargement tourne.
  import { app } from '../lib/state.svelte';

  const lead = $derived(app.lead);
  const flying = $derived(app.submitting || !!lead || app.celebrate);
  const others = $derived(Math.max(0, app.activeCount - 1));
  const caption = $derived.by(() => {
    if (lead) {
      if (lead.status === 'downloading' && lead.percent != null) return `Mine… ${Math.floor(lead.percent)} %`;
      if (lead.status === 'postprocessing') return 'Mine… presque';
      return 'Mine ?';
    }
    if (app.submitting) return 'Mine ?';
    if (app.celebrate) return 'Mine !';
    return '';
  });
  const pct = $derived(lead?.status === 'downloading' && lead.percent != null ? lead.percent : lead?.status === 'postprocessing' ? 100 : null);
</script>

<div class="sky" class:flying aria-live="polite">
  <img class="logo" src="logo.webp" alt="Mine!?" width="240" height="245" />
  <img class="gull" src="gull-fly.webp" alt="" width="360" height="229" />
  <div class="caption">
    {#key caption === 'Mine !'}
      <span class:pop={caption === 'Mine !'} class:done={caption === 'Mine !'}>{caption}</span>
    {/key}
    {#if others && lead}<small>+{others} en cours</small>{/if}
  </div>
  <div class="track mini" class:unknown={flying && pct == null && !app.celebrate} class:ok={app.celebrate && !lead} class:hide={!flying}>
    <i style:width="{app.celebrate && !lead ? 100 : pct ?? 0}%"></i>
  </div>
</div>

<style>
  .sky { position: relative; height: clamp(190px, 30vh, 250px); display: grid; place-items: center; }
  .logo, .gull { position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%); transition: opacity .4s var(--ease), transform .5s var(--ease); }
  .logo { width: clamp(150px, 24vh, 200px); height: auto; }
  .gull { width: clamp(190px, 30vh, 250px); height: auto; opacity: 0; transform: translate(-50%, -40%) scale(.9); }
  .flying .logo { opacity: 0; transform: translate(-50%, -56%) scale(.9); }
  .flying .gull { opacity: 1; transform: translate(-50%, -50%); animation: bob 2.4s ease-in-out .4s infinite; }
  @keyframes bob { 50% { transform: translate(-50%, calc(-50% - 9px)); } }
  .caption { position: absolute; bottom: 14px; left: 0; right: 0; display: flex; justify-content: center; align-items: baseline; gap: 8px; min-height: 28px;
    font-family: var(--display); font-weight: 500; font-size: 20px; font-variant-numeric: tabular-nums; }
  .caption .done { color: var(--sea); font-weight: 600; }
  .caption small { font-family: var(--body); font-size: 12.5px; color: var(--muted); font-weight: 500; }
  .mini { position: absolute; bottom: 4px; left: 50%; width: 180px; margin-left: -90px; transition: opacity .3s; }
  .mini > :global(i) { background: var(--beak); }
  .mini.hide { opacity: 0; }
  @media (prefers-reduced-motion: reduce) { .flying .gull { animation: none; } }
</style>
