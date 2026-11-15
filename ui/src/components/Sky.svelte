<script lang="ts">
  // Animation 2 « Sur place » : le logo s'envole et bat des ailes tant qu'un téléchargement tourne.
  // Au repos, le logo animé joue une fois à l'arrivée, au clic, et quand un téléchargement se termine.
  import { onDestroy, onMount } from 'svelte';
  import { app } from '../lib/state.svelte';

  const ANIM_MS = 58 * 66;
  let animSrc = $state('');
  let playing = $state(false);
  let blob: Blob | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function play() {
    if (playing || flying) return;
    try {
      blob ??= await (await fetch('logo-anim.webp')).blob();
    } catch {
      return;
    }
    // Une nouvelle adresse à chaque fois, pour que l'animation reparte du début.
    if (animSrc) URL.revokeObjectURL(animSrc);
    animSrc = URL.createObjectURL(blob);
    playing = true;
    clearTimeout(timer);
    timer = setTimeout(() => (playing = false), ANIM_MS);
  }

  onMount(() => {
    let seen = false;
    try {
      seen = !!sessionStorage.getItem('mine.intro');
      sessionStorage.setItem('mine.intro', '1');
    } catch {}
    if (!calm && !seen) setTimeout(play, 500);
  });
  onDestroy(() => {
    clearTimeout(timer);
    if (animSrc) URL.revokeObjectURL(animSrc);
  });

  const lead = $derived(app.lead);
  const flying = $derived(app.submitting || !!lead);
  $effect(() => {
    if (app.celebrate && !calm) setTimeout(play, 350);
  });
  $effect(() => {
    if (flying) playing = false;
  });
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
  <button class="perch" onclick={play} tabindex="-1" aria-label="Mine!?">
    <img class="logo" class:hidden={playing} src="logo-rest.webp" alt="" width="400" height="317" />
    {#if animSrc}<img class="logo anim" class:hidden={!playing} src={animSrc} alt="" width="400" height="317" />{/if}
  </button>
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
  .perch { position: absolute; inset: 0; border: 0; padding: 0; background: none; cursor: pointer; transition: opacity .4s var(--ease), transform .5s var(--ease); -webkit-tap-highlight-color: transparent; }
  .logo, .gull { position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%); transition: opacity .4s var(--ease), transform .5s var(--ease); }
  .logo { height: calc(100% - 44px); width: auto; max-width: 100%; }
  .logo.hidden { opacity: 0; transition-duration: .5s; }
  .perch .logo { top: calc(50% - 20px); transform: translate(-50%, -50%); }
  .gull { width: clamp(190px, 30vh, 250px); height: auto; opacity: 0; pointer-events: none; transform: translate(-50%, -40%) scale(.9); }
  .flying .perch { opacity: 0; transform: translateY(-6%) scale(.9); pointer-events: none; }
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
