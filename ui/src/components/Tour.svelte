<script lang="ts">
  // Visite guidée en 4 étapes. La mouette commence en langue mouette (« Mine ! Mine ?! »),
  // puis son texte se transforme lettre par lettre en vraie explication.
  import { onDestroy, tick } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { i18n, t } from '../lib/i18n.svelte';

  const KEY = 'mine.tour.v1';
  const STEPS = [
    { target: 'bar', text: 'tour1' },
    { target: 'options', text: 'tour2' },
    { target: 'sites', text: 'tour3' },
    { target: 'history', text: 'tour4' },
  ] as const;

  let step = $state(0);
  let shown = $state('');
  let rect = $state<DOMRect | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Première visite : la visite s'ouvre toute seule une fois connecté.
  $effect(() => {
    if (!app.everConnected) return;
    let seen = true;
    try { seen = !!localStorage.getItem(KEY); } catch {}
    if (!seen) app.tour = true;
  });

  $effect(() => {
    if (!app.tour) return;
    void i18n.lang;
    if (app.tab !== 'mine') app.go('mine');
    void place(step);
  });

  function gull(len: number): string {
    const words = ['Mine !', 'Mine ?', 'Mine !?', 'Mine…', 'Mine ?!'];
    let out = '';
    for (let i = 0; out.length < len; i++) out += (out ? ' ' : '') + words[(i * 7 + len) % words.length];
    return out.slice(0, len);
  }

  async function place(i: number) {
    clearInterval(timer);
    await tick();
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[i].target}"]`);
    el?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    await new Promise((r) => setTimeout(r, calm ? 0 : 350));
    rect = el?.getBoundingClientRect() ?? null;
    const real = t(STEPS[i].text);
    if (calm) { shown = real; return; }
    const noise = gull(real.length);
    shown = noise;
    let k = 0;
    // Un temps en langue mouette, puis la traduction s'écrit par-dessus.
    setTimeout(() => {
      clearInterval(timer);
      timer = setInterval(() => {
        k += 2;
        shown = real.slice(0, k) + noise.slice(k);
        if (k >= real.length) { shown = real; clearInterval(timer); }
      }, 22);
    }, 900);
  }

  function close() {
    clearInterval(timer);
    app.tour = false; step = 0; rect = null;
    try { localStorage.setItem(KEY, '1'); } catch {}
  }
  function next() { if (step < STEPS.length - 1) step += 1; else close(); }

  function onResize() {
    if (!app.tour) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step].target}"]`);
    rect = el?.getBoundingClientRect() ?? null;
  }
  onDestroy(() => clearInterval(timer));

  const below = $derived(!rect || rect.top < innerHeight / 2);
</script>

<svelte:window onresize={onResize} onscroll={onResize} onkeydown={(e) => { if (app.tour && e.key === 'Escape') close(); }} />

{#if app.tour}
  <div class="veil" role="presentation" onclick={close}></div>
  {#if rect}
    <div class="spot" style:left="{rect.left - 8}px" style:top="{rect.top - 8}px" style:width="{rect.width + 16}px" style:height="{rect.height + 16}px"></div>
  {/if}
  <div class="card" class:below class:above={!below} role="dialog" aria-modal="true" aria-label={t('tourLink')}
    style:top={rect ? (below ? `${rect.bottom + 18}px` : 'auto') : '30%'}
    style:bottom={rect && !below ? `${innerHeight - rect.top + 18}px` : 'auto'}>
    <img src="logo-rest.webp" alt="" width="400" height="317" />
    <div class="talk">
      <p aria-live="polite">{shown}</p>
      <div class="nav">
        <button class="textbtn" onclick={close}>{t('skip')}</button>
        <span class="count">{t('stepOf', step + 1)}</span>
        <button class="go" onclick={next}>{step === STEPS.length - 1 ? t('done') : t('next')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .veil { position: fixed; inset: 0; z-index: 50; }
  .spot { position: fixed; z-index: 51; border-radius: 22px; pointer-events: none;
    box-shadow: 0 0 0 9999px color-mix(in oklab, var(--bg) 18%, rgb(8 12 16 / .62)), 0 0 0 2px var(--beak);
    transition: all .45s var(--ease); }
  .card { position: fixed; left: 50%; transform: translateX(-50%); z-index: 52; width: min(520px, calc(100vw - 24px));
    display: grid; grid-template-columns: 150px 1fr; gap: 6px; align-items: end; transition: top .45s var(--ease), bottom .45s var(--ease); }
  .card img { width: 150px; height: auto; animation: bob 2.6s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(-5px); } }
  .talk { position: relative; background: var(--surface); color: var(--ink); border-radius: 18px; padding: 14px 16px 10px; box-shadow: 0 10px 40px rgb(0 0 0 / .18); }
  .talk::before { content: ''; position: absolute; left: -7px; bottom: 22px; width: 14px; height: 14px; background: inherit; transform: rotate(45deg); border-radius: 3px; }
  p { margin: 0 0 10px; font-size: 14.5px; line-height: 1.5; min-height: 4.5em; font-family: var(--body); }
  .nav { display: flex; align-items: center; gap: 12px; }
  .count { margin-left: auto; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .go { border: 0; border-radius: 99px; background: var(--ink); color: var(--bg); font: 600 13.5px var(--body); padding: 8px 16px; cursor: pointer; }
  @media (max-width: 480px) { .card { grid-template-columns: 96px 1fr; } .card img { width: 96px; } }
  @media (prefers-reduced-motion: reduce) { .card img { animation: none; } .spot, .card { transition: none; } }
</style>
