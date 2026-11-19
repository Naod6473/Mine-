<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { untrack } from 'svelte';
  import { app, isUrl } from '../lib/state.svelte';
  import { label } from '../lib/labels';
  import Advanced from './Advanced.svelte';

  let { initialUrl = '', autostart = false }: { initialUrl?: string; autostart?: boolean } = $props();
  let url = $state(untrack(() => initialUrl));
  let input: HTMLInputElement | undefined = $state();
  const valid = $derived(isUrl(url));
  const open = $derived(app.mode === 'advanced');

  async function submit(e?: Event) {
    e?.preventDefault();
    if (!valid || app.submitting) return;
    const ok = await app.add(url.trim());
    if (ok) url = '';
    input?.focus();
  }

  // Lien reçu par le favori « À moi ! » : on lance dès que le serveur est prêt.
  let started = false;
  $effect(() => {
    if (autostart && !started && app.connected && app.config && valid) { started = true; submit(); }
  });

  // Vitrine : le lien d'exemple s'écrit tout seul dans le champ, lettre par lettre.
  let typing = 0;
  function typeLink(link: string) {
    const run = ++typing;
    url = '';
    input?.focus();
    let i = 0;
    const step = () => {
      if (run !== typing) return;
      url = link.slice(0, ++i);
      if (i < link.length) setTimeout(step, 28 + Math.random() * 40);
    };
    step();
  }
  $effect(() => {
    if (!app.showcase) return;
    const h = (e: Event) => typeLink((e as CustomEvent<string>).detail);
    addEventListener('mine-type', h);
    return () => removeEventListener('mine-type', h);
  });

  /** Un lien glissé sur la page part tout de suite ; un lien collé hors du champ le remplit. */
  let dragging = $state(false);
  function linkFrom(dt: DataTransfer | null): string {
    const raw = dt?.getData('text/uri-list') || dt?.getData('text/plain') || '';
    return raw.split(/\s+/).find((x) => isUrl(x)) ?? '';
  }
  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.some((x) => x === 'text/uri-list' || x === 'text/plain')) return;
    e.preventDefault(); dragging = true;
  }
  function onDrop(e: DragEvent) {
    dragging = false;
    const link = linkFrom(e.dataTransfer);
    if (!link) return;
    e.preventDefault(); url = link; submit();
  }
  function onPaste(e: ClipboardEvent) {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) return;
    const link = linkFrom(e.clipboardData);
    if (!link) return;
    e.preventDefault(); url = link; input?.focus();
  }

  function summary(): string {
    const o = app.options;
    const t = app.catalog?.download_type.options.find((x) => x.id === o.download_type);
    const f = t?.format.options.find((x) => x.id === o.format);
    const parts = [label(o.download_type, t?.text ?? o.download_type)];
    if (f && f.id !== 'any' && f.id !== 'auto') parts.push(label(f.id, f.text));
    if (f?.quality && o.quality !== 'best') parts.push(label(o.quality, o.quality, 'quality'));
    if (o.folder) parts.push(o.folder);
    return parts.join(' · ');
  }
</script>

<svelte:window ondragover={onDragOver} ondragleave={(e) => { if (!e.relatedTarget) dragging = false; }} ondrop={onDrop} onpaste={onPaste} />

<form class="bar" data-tour="bar" class:dragging class:invalid={url.length > 0 && !valid} onsubmit={submit} autocomplete="off">
  <input bind:this={input} bind:value={url} type="url" inputmode="url" spellcheck="false"
    aria-label={t('linkLabel')} enterkeyhint="go" />
  {#if url}
    <button type="button" class="clear" onclick={() => { url = ''; input?.focus(); }} aria-label={t('clear')}>×</button>
  {/if}
  <button class="mine" type="submit" disabled={!valid || app.submitting} aria-busy={app.submitting}>
    {app.submitting ? t('busy') : t('cry')}
  </button>
</form>

<div class="under">
  <button class="textbtn" data-tour="options" onclick={() => app.setMode(open ? 'simple' : 'advanced')} aria-expanded={open}>
    {open ? t('hideOptions') : t('options')}
  </button>
  {#if !open && (app.options.download_type !== 'video' || app.options.folder || app.options.quality !== 'best')}
    <span class="summary">· {summary()}</span>
  {/if}
</div>

{#if open}
  <Advanced />
{:else if app.presets.length}
  <div class="chips" aria-label={t('presets')}>
    {#each app.presets as p (p.name)}
      <button class="textbtn" onclick={() => { app.applyPreset(p); }}>{p.name}</button>
    {/each}
  </div>
{/if}

<style>
  .bar { position: relative; display: flex; align-items: center; gap: 4px; height: 62px; padding: 6px; border-radius: 99px;
    background: var(--surface); border: 1px solid var(--line); transition: border-color .2s, box-shadow .2s; }
  .bar:focus-within { border-color: var(--ink); box-shadow: 0 0 0 4px color-mix(in oklab, var(--beak) 18%, transparent); }
  .bar.dragging { border-color: var(--beak); border-style: dashed; box-shadow: 0 0 0 6px color-mix(in oklab, var(--beak) 22%, transparent); }
  .bar.invalid { border-color: color-mix(in oklab, var(--danger) 55%, var(--line)); }
  input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; font: 16.5px var(--body); padding: 0 8px 0 18px; outline: none; }
  .clear { flex: none; width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: var(--muted); font-size: 20px; line-height: 1; cursor: pointer; }
  .clear:hover { color: var(--ink); background: var(--wash); }
  .mine { flex: none; height: 100%; min-width: 116px; padding: 0 22px; border: 0; border-radius: 99px; cursor: pointer;
    background: var(--ink); color: var(--bg); font: 600 16px var(--body); letter-spacing: -.005em;
    transition: transform .15s var(--spring), opacity .2s; }
  .mine:hover:not(:disabled) { transform: scale(1.03); }
  .mine:active:not(:disabled) { transform: scale(.97); }
  .mine:disabled { opacity: .22; cursor: default; }
  .mine[aria-busy='true'] { opacity: 1; }
  .under { display: flex; justify-content: center; align-items: baseline; gap: 6px; margin-top: 14px; min-height: 22px; flex-wrap: wrap; }
  .summary { font-size: 13px; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; margin-top: 8px; }
  @media (max-width: 480px) { .mine { min-width: 92px; padding: 0 16px; } input { padding-left: 12px; } }
</style>
