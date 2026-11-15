<script lang="ts">
  import { untrack } from 'svelte';
  import { app, isUrl } from '../lib/state.svelte';
  import { label } from '../lib/labels';
  import FlyingGull from './FlyingGull.svelte';
  import Advanced from './Advanced.svelte';

  let { initialUrl = '' }: { initialUrl?: string } = $props();
  let url = $state(untrack(() => initialUrl));
  let busy = $state(false);
  let pecked = $state(false);
  let input: HTMLInputElement | undefined = $state();
  const valid = $derived(isUrl(url));
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  async function submit(e?: Event) {
    e?.preventDefault();
    if (!valid || busy) return;
    busy = true;
    const ok = await app.add(url.trim());
    busy = false;
    if (ok) {
      url = '';
      pecked = true;
      setTimeout(() => (pecked = false), 600);
    }
    input?.focus();
  }

  async function paste() {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) { url = t; input?.focus(); }
    } catch { app.notify('Le navigateur refuse l’accès au presse-papiers : colle avec Ctrl+V.'); }
  }

  function summary(): string {
    const o = app.options;
    const t = app.catalog?.download_type.options.find((x) => x.id === o.download_type);
    const f = t?.format.options.find((x) => x.id === o.format);
    const parts = [label(o.download_type, t?.text ?? o.download_type)];
    if (f) parts.push(label(f.id, f.text));
    if (f?.quality && o.quality !== 'best') parts.push(label(o.quality, o.quality, 'quality'));
    if (o.folder) parts.push(o.folder);
    return parts.join(' · ');
  }
</script>

<form class="bar" class:pecked onsubmit={submit} autocomplete="off">
  <div class="field" class:filled={url.length > 0} class:invalid={url.length > 0 && !valid}>
    <input bind:this={input} bind:value={url} type="url" inputmode="url" spellcheck="false"
      aria-label="Lien à télécharger" enterkeyhint="go" />
    {#if canPaste && !url}
      <button type="button" class="paste" onclick={paste} title="Coller le lien">Coller</button>
    {:else if url}
      <button type="button" class="paste clear" onclick={() => { url = ''; input?.focus(); }} aria-label="Vider le champ">×</button>
    {/if}
  </div>
  <button class="mine" type="submit" disabled={!valid || busy} aria-busy={busy}>
    {#if busy}
      <span class="busy"><FlyingGull size={26} speed={1.6} /><span>Mine…</span></span>
    {:else}
      <span>Mine !</span>
    {/if}
  </button>
</form>

<div class="under">
  <div class="toggle" role="radiogroup" aria-label="Mode">
    <button role="radio" aria-checked={app.mode === 'simple'} class:on={app.mode === 'simple'} onclick={() => app.setMode('simple')}>Simple</button>
    <button role="radio" aria-checked={app.mode === 'advanced'} class:on={app.mode === 'advanced'} onclick={() => app.setMode('advanced')}>Avancé</button>
    <span class="knob" class:right={app.mode === 'advanced'}></span>
  </div>
  {#if app.mode === 'advanced'}
    <span class="summary">{summary()}</span>
  {/if}
</div>

{#if app.mode === 'advanced'}
  <Advanced />
{:else if app.presets.length}
  <div class="chips" aria-label="Préréglages">
    {#each app.presets as p (p.name)}
      <button class="chip" onclick={() => { app.applyPreset(p); app.setMode('advanced'); }} title="Appliquer ce préréglage">{p.name}</button>
    {/each}
  </div>
{/if}

<style>
  .bar { display: flex; gap: 10px; }
  .field { position: relative; flex: 1; min-width: 0; }
  input {
    width: 100%; height: 56px; padding: 0 76px 0 20px; border-radius: 16px; border: 1.5px solid var(--line);
    background: var(--surface); color: var(--ink); font: inherit; font-size: 17px; outline: none;
    box-shadow: var(--shadow-sm); transition: border-color .2s, box-shadow .2s;
  }
  input:focus { border-color: var(--ink); box-shadow: 0 0 0 4px var(--ring), var(--shadow-sm); }
  .invalid input { border-color: color-mix(in oklab, var(--danger) 60%, var(--line)); }
  .paste {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%); height: 34px; padding: 0 12px;
    border: 0; border-radius: 10px; background: var(--chip); color: var(--muted); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .paste:hover { color: var(--ink); }
  .clear { width: 34px; padding: 0; font-size: 20px; line-height: 1; }
  .mine {
    position: relative; height: 56px; min-width: 128px; padding: 0 24px; border: 0; border-radius: 16px; cursor: pointer;
    background: var(--accent); color: var(--accent-ink); font: inherit; font-size: 18px; font-weight: 750; letter-spacing: -.01em;
    box-shadow: 0 1px 0 rgb(0 0 0 / .08), 0 6px 18px -6px color-mix(in oklab, var(--accent) 70%, transparent);
    transition: transform .15s var(--spring), filter .2s, opacity .2s;
  }
  .mine:hover:not(:disabled) { filter: brightness(1.04); transform: translateY(-1px); }
  .mine:active:not(:disabled) { transform: translateY(1px) scale(.98); }
  .mine:disabled { cursor: default; opacity: .45; box-shadow: none; }
  .mine[aria-busy='true'] { opacity: 1; }
  .busy { display: inline-flex; align-items: center; gap: 8px; }
  .busy :global(.wing), .busy :global(.body) { fill: var(--accent-ink); }
  .busy :global(.beak) { fill: #fff; }
  .pecked .mine { animation: peck .5s var(--spring); }
  @keyframes peck { 30% { transform: rotate(-4deg) translateY(2px); } 60% { transform: rotate(2deg); } }

  .under { display: flex; align-items: center; gap: 14px; margin-top: 16px; min-height: 32px; flex-wrap: wrap; justify-content: center; }
  .toggle { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 99px; background: var(--chip); }
  .toggle button { position: relative; z-index: 1; border: 0; background: none; font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); padding: 6px 16px; cursor: pointer; transition: color .2s; }
  .toggle button.on { color: var(--ink); }
  .knob { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 99px; background: var(--surface); box-shadow: var(--shadow-sm); transition: transform .3s var(--spring); }
  .knob.right { transform: translateX(100%); }
  .summary { font-size: 13px; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
  .chip { border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 99px; padding: 6px 14px; font: inherit; font-size: 13px; cursor: pointer; }
  .chip:hover { border-color: var(--ink); }
  @media (max-width: 560px) {
    .bar { flex-direction: column; }
    .mine { width: 100%; }
  }
</style>
