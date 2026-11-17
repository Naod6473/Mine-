<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { chooseFolder } from '../lib/desktop';
  import { app } from '../lib/state.svelte';
  import { label } from '../lib/labels';
  import type { TypeOption } from '../lib/types';

  const types = $derived(app.catalog?.download_type.options ?? []);
  const type = $derived<TypeOption | undefined>(types.find((t) => t.id === app.options.download_type));
  const format = $derived(type?.format.options.find((f) => f.id === app.options.format));
  const isMedia = $derived(app.options.download_type === 'video' || app.options.download_type === 'audio');
  const dirs = $derived(app.options.download_type === 'audio' ? app.audioDirs : app.dirs);

  // Favori : ouvre Mine!? dans un nouvel onglet avec le lien de la page et le lance tout de suite.
  const bookmarklet = `javascript:void(open(${JSON.stringify(new URL('.', document.baseURI).href + '?go=1&url=')}+encodeURIComponent(location.href)))`;

  let presetName = $state('');
  let cookies = $state<boolean | null>(null);
  let cookieInput: HTMLInputElement | undefined = $state();

  $effect(() => { refreshCookies(); });
  // Toute modification est mémorisée dans le navigateur.
  $effect(() => { JSON.stringify(app.options); app.saveOptions(); });
  // Le catalogue arrive après le chargement : on recale un réglage mémorisé qui n'existe plus.
  $effect(() => {
    if (!type && types.length) setType(app.catalog!.download_type.default);
    else if (type && !format) setFormat(type.format.default);
  });

  function setType(id: string) {
    const t = types.find((x) => x.id === id);
    if (!t) return;
    app.options.download_type = id;
    app.options.codec = t.codec?.default ?? 'auto';
    setFormat(id === 'video' ? 'any' : t.format.default);
  }
  function setFormat(id: string) {
    app.options.format = id;
    const f = type?.format.options.find((x) => x.id === id);
    app.options.quality = f?.quality?.default ?? 'best';
  }
  async function refreshCookies() {
    if (app.desktop) return;
    try { cookies = !!(await (await fetch('cookie-status')).json()).has_cookies; } catch { cookies = null; }
  }
  async function uploadCookies(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('cookies', file);
    const r = await fetch('upload-cookies', { method: 'POST', body: fd }).catch(() => null);
    app.notify(r?.ok ? t('cookiesSaved') : t('cookiesRefused'), r?.ok ? 'info' : 'error');
    if (cookieInput) cookieInput.value = '';
    refreshCookies();
  }
  async function deleteCookies() {
    await fetch('delete-cookies', { method: 'POST' }).catch(() => null);
    app.notify(t('cookiesRemoved'));
    refreshCookies();
  }
  function savePreset(e: Event) {
    e.preventDefault();
    const n = presetName.trim();
    if (!n) return;
    app.addPreset(n); presetName = '';
    app.notify(t('presetSaved', n));
  }
</script>

<section class="panel" aria-label={t('advanced')}>
  {#if !app.catalog}
    <p class="muted">{t('loadingOptions')}</p>
  {:else}
    <div class="row">
      <span class="lbl">{t('type')}</span>
      <div class="seg">
        {#each types as t (t.id)}
          <button class:on={t.id === app.options.download_type} onclick={() => setType(t.id)}>{label(t.id, t.text)}</button>
        {/each}
      </div>
    </div>

    <div class="grid">
      <label>
        <span class="lbl">{t('format')}</span>
        <select value={app.options.format} onchange={(e) => setFormat(e.currentTarget.value)}>
          {#each type?.format.options ?? [] as f (f.id)}<option value={f.id}>{label(f.id, f.text)}</option>{/each}
        </select>
      </label>
      {#if format?.quality && format.quality.options.length > 1}
        <label>
          <span class="lbl">{t('quality')}</span>
          <select bind:value={app.options.quality}>
            {#each format.quality.options as q (q.id)}<option value={q.id}>{label(q.id, q.text, 'quality')}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.codec}
        <label>
          <span class="lbl">{t('codec')}</span>
          <select bind:value={app.options.codec}>
            {#each type.codec.options as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.audio_tags}
        <label>
          <span class="lbl">{t('tags')}</span>
          <select bind:value={app.options.audio_tags}>
            {#each type.audio_tags.options as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.subtitle_language}
        <label>
          <span class="lbl">{t('language')}</span>
          <input list="mine-langs" bind:value={app.options.subtitle_language} />
          <datalist id="mine-langs">
            {#each type.subtitle_language.options as c (c.id)}<option value={c.id}>{label(c.id, c.text, 'subtitle_language')}</option>{/each}
          </datalist>
        </label>
        <label>
          <span class="lbl">{t('subtitles')}</span>
          <select bind:value={app.options.subtitle_mode}>
            {#each type.subtitle_mode?.options ?? [] as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if app.config?.CUSTOM_DIRS}
        <label>
          <span class="lbl">{t('folder')}</span>
          <input list="mine-dirs" bind:value={app.options.folder} placeholder={t('root')} />
          <datalist id="mine-dirs">
            {#each dirs.filter(Boolean) as d (d)}<option value={d}></option>{/each}
          </datalist>
        </label>
      {/if}
    </div>

    {#if !app.demo}<div class="row">
      <span class="lbl">{t('playlist')}</span>
      <div class="seg">
        <button class:on={app.options.playlist === 'all'} onclick={() => (app.options.playlist = 'all')}>{t('all')}</button>
        <button class:on={app.options.playlist === 'single'} onclick={() => (app.options.playlist = 'single')}>{t('thisVideo')}</button>
        <button class:on={app.options.playlist === 'limit'} onclick={() => (app.options.playlist = 'limit')}>{t('limit')}</button>
      </div>
      {#if app.options.playlist === 'limit'}
        <input class="num" type="number" min="1" bind:value={app.options.playlist_item_limit} aria-label={t('itemCount')} />
        <span class="muted">{t('firstItems')}</span>
      {/if}
    </div>{/if}

    {#if isMedia}
      <div class="grid">
        <label>
          <span class="lbl">{t('clipStart')}</span>
          <input bind:value={app.options.clip_start} placeholder="0:00" inputmode="numeric" />
        </label>
        <label>
          <span class="lbl">{t('clipEnd')}</span>
          <input bind:value={app.options.clip_end} placeholder={t('end')} inputmode="numeric" />
        </label>
        <label>
          <span class="lbl">{t('prefix')}</span>
          <input bind:value={app.options.custom_name_prefix} placeholder={t('none')} />
        </label>
      </div>
      <div class="row checks">
        <label class="check"><input type="checkbox" bind:checked={app.options.split_by_chapters} /> {t('chapters')}</label>
        <label class="check"><input type="checkbox" bind:checked={app.options.sponsorblock} /> {t('sponsor')}</label>
      </div>
    {/if}

    <div class="row checks">
      <label class="check"><input type="checkbox" checked={app.sound} onchange={(e) => app.setSound(e.currentTarget.checked)} /> {t('soundOn')}</label>
    </div>

    {#if app.desktop}
      <div class="row bm">
        <span class="lbl">{t('saveTo')}</span>
        <span class="muted path" title={String(app.config?.DOWNLOAD_DIR ?? '')}>{app.config?.DOWNLOAD_DIR ?? ''}</span>
        <button class="link" onclick={() => chooseFolder().catch(() => {})}>{t('change')}</button>
      </div>
    {:else}
      <div class="row bm">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <a class="bookmarklet" href={bookmarklet} onclick={(e) => { e.preventDefault(); app.notify(t('bookmarkletClick')); }}>{t('bookmarklet')}</a>
        <span class="muted">{t('bookmarkletHint')}</span>
      </div>
    {/if}

    <div class="foot">
      {#if !app.desktop && !app.demo}<div class="cookies">
        <span class="lbl">{t('cookies')}</span>
        <span class="muted">{cookies ? t('cookieSet') : cookies === false ? t('cookieNone') : '…'}</span>
        <button class="link" onclick={() => cookieInput?.click()}>{cookies ? t('replace') : t('sendFile')}</button>
        {#if cookies}<button class="link" onclick={deleteCookies}>{t('remove')}</button>{/if}
        <input bind:this={cookieInput} type="file" accept=".txt,text/plain" hidden onchange={uploadCookies} />
      </div>{/if}
      <form class="preset" onsubmit={savePreset}>
        <input bind:value={presetName} placeholder={t('presetName')} aria-label={t('presetName')} />
        <button class="ghost" disabled={!presetName.trim()}>{t('save')}</button>
      </form>
    </div>

    {#if app.presets.length}
      <div class="presets">
        {#each app.presets as p (p.name)}
          <span class="chip">
            <button class="chip-main" onclick={() => app.applyPreset(p)}>{p.name}</button>
            <button class="chip-x" onclick={() => app.removePreset(p.name)} aria-label={t('removeX', p.name)}>×</button>
          </span>
        {/each}
      </div>
    {/if}
    <button class="link reset" onclick={() => app.resetOptions()}>{t('reset')}</button>
  {/if}
</section>

<style>
  .panel { margin-top: 20px; padding: 22px 0 0; border-top: 1px solid var(--line); display: grid; gap: 20px; animation: unfold .35s var(--ease); }
  @keyframes unfold { from { opacity: 0; transform: translateY(-4px); } }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px 20px; }
  label { display: grid; gap: 4px; }
  .lbl { font-size: 12px; font-weight: 500; color: var(--muted); }
  .row > .lbl { min-width: 64px; }
  select, input:not([type='checkbox']) { height: 34px; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; background: none; font: 500 14px var(--body); padding: 0 2px; outline: none; min-width: 0; }
  select:focus, input:not([type='checkbox']):focus { border-bottom-color: var(--ink); }
  input::placeholder { color: var(--muted); opacity: .7; }
  .num { width: 64px; }
  .seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 99px; background: var(--wash); }
  .seg button { border: 0; background: none; font: 500 13px var(--body); color: var(--muted); padding: 6px 13px; border-radius: 99px; cursor: pointer; }
  .seg button.on { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgb(0 0 0 / .06); }
  .checks { gap: 22px; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
  .check input { accent-color: var(--ink); width: 15px; height: 15px; }
  .bm { align-items: center; flex-wrap: nowrap; }
  .path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
  .bookmarklet { flex: none; padding: 7px 14px; border-radius: 99px; background: var(--ink); color: var(--bg); font: 600 13px var(--body); text-decoration: none; cursor: grab; }
  .bm .muted { font-size: 12.5px; line-height: 1.4; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; }
  .cookies { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; font-size: 13px; }
  .preset { display: flex; gap: 10px; align-items: center; }
  .preset input { width: 160px; }
  .ghost { border: 0; background: none; color: var(--ink); font: 600 13px var(--body); cursor: pointer; padding: 0; }
  .ghost:disabled { opacity: .35; cursor: default; }
  .link { border: 0; background: none; color: var(--ink); font: 600 13px var(--body); cursor: pointer; padding: 0; }
  .link:hover { text-decoration: underline; text-underline-offset: 3px; }
  .reset { justify-self: start; color: var(--muted); font-weight: 500; }
  .presets { display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .chip { display: inline-flex; align-items: baseline; gap: 2px; }
  .chip button { border: 0; background: none; font: 500 13px var(--body); cursor: pointer; padding: 0; }
  .chip-x { color: var(--muted) !important; padding: 0 4px !important; }
  .muted { color: var(--muted); font-size: 13px; }
</style>
