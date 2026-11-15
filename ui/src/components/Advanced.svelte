<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { label } from '../lib/labels';
  import type { TypeOption } from '../lib/types';

  const types = $derived(app.catalog?.download_type.options ?? []);
  const type = $derived<TypeOption | undefined>(types.find((t) => t.id === app.options.download_type));
  const format = $derived(type?.format.options.find((f) => f.id === app.options.format));
  const isMedia = $derived(app.options.download_type === 'video' || app.options.download_type === 'audio');
  const dirs = $derived(app.options.download_type === 'audio' ? app.audioDirs : app.dirs);

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
    try { cookies = !!(await (await fetch('cookie-status')).json()).has_cookies; } catch { cookies = null; }
  }
  async function uploadCookies(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('cookies', file);
    const r = await fetch('upload-cookies', { method: 'POST', body: fd }).catch(() => null);
    app.notify(r?.ok ? 'Cookies enregistrés.' : 'Pas à toi. Le fichier de cookies a été refusé.', r?.ok ? 'info' : 'error');
    if (cookieInput) cookieInput.value = '';
    refreshCookies();
  }
  async function deleteCookies() {
    await fetch('delete-cookies', { method: 'POST' }).catch(() => null);
    app.notify('Cookies supprimés.');
    refreshCookies();
  }
  function savePreset(e: Event) {
    e.preventDefault();
    const n = presetName.trim();
    if (!n) return;
    app.addPreset(n); presetName = '';
    app.notify(`Préréglage « ${n} » enregistré.`);
  }
</script>

<section class="panel" aria-label="Options avancées">
  {#if !app.catalog}
    <p class="muted">Chargement des options…</p>
  {:else}
    <div class="row">
      <span class="lbl">Type</span>
      <div class="seg">
        {#each types as t (t.id)}
          <button class:on={t.id === app.options.download_type} onclick={() => setType(t.id)}>{label(t.id, t.text)}</button>
        {/each}
      </div>
    </div>

    <div class="grid">
      <label>
        <span class="lbl">Format</span>
        <select value={app.options.format} onchange={(e) => setFormat(e.currentTarget.value)}>
          {#each type?.format.options ?? [] as f (f.id)}<option value={f.id}>{label(f.id, f.text)}</option>{/each}
        </select>
      </label>
      {#if format?.quality && format.quality.options.length > 1}
        <label>
          <span class="lbl">Qualité</span>
          <select bind:value={app.options.quality}>
            {#each format.quality.options as q (q.id)}<option value={q.id}>{label(q.id, q.text, 'quality')}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.codec}
        <label>
          <span class="lbl">Codec</span>
          <select bind:value={app.options.codec}>
            {#each type.codec.options as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.audio_tags}
        <label>
          <span class="lbl">Tags</span>
          <select bind:value={app.options.audio_tags}>
            {#each type.audio_tags.options as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if type?.subtitle_language}
        <label>
          <span class="lbl">Langue</span>
          <input list="mine-langs" bind:value={app.options.subtitle_language} />
          <datalist id="mine-langs">
            {#each type.subtitle_language.options as c (c.id)}<option value={c.id}>{label(c.id, c.text, 'subtitle_language')}</option>{/each}
          </datalist>
        </label>
        <label>
          <span class="lbl">Sous-titres</span>
          <select bind:value={app.options.subtitle_mode}>
            {#each type.subtitle_mode?.options ?? [] as c (c.id)}<option value={c.id}>{label(c.id, c.text)}</option>{/each}
          </select>
        </label>
      {/if}
      {#if app.config?.CUSTOM_DIRS}
        <label>
          <span class="lbl">Dossier</span>
          <input list="mine-dirs" bind:value={app.options.folder} placeholder="Racine des téléchargements" />
          <datalist id="mine-dirs">
            {#each dirs.filter(Boolean) as d (d)}<option value={d}></option>{/each}
          </datalist>
        </label>
      {/if}
    </div>

    <div class="row">
      <span class="lbl">Playlist</span>
      <div class="seg">
        <button class:on={app.options.playlist === 'all'} onclick={() => (app.options.playlist = 'all')}>Tout</button>
        <button class:on={app.options.playlist === 'single'} onclick={() => (app.options.playlist = 'single')}>Cette vidéo</button>
        <button class:on={app.options.playlist === 'limit'} onclick={() => (app.options.playlist = 'limit')}>Limiter</button>
      </div>
      {#if app.options.playlist === 'limit'}
        <input class="num" type="number" min="1" bind:value={app.options.playlist_item_limit} aria-label="Nombre d'éléments" />
        <span class="muted">premiers éléments</span>
      {/if}
    </div>

    {#if isMedia}
      <div class="grid">
        <label>
          <span class="lbl">Début de l'extrait</span>
          <input bind:value={app.options.clip_start} placeholder="0:00" inputmode="numeric" />
        </label>
        <label>
          <span class="lbl">Fin de l'extrait</span>
          <input bind:value={app.options.clip_end} placeholder="fin" inputmode="numeric" />
        </label>
        <label>
          <span class="lbl">Préfixe du nom</span>
          <input bind:value={app.options.custom_name_prefix} placeholder="aucun" />
        </label>
      </div>
      <div class="row checks">
        <label class="check"><input type="checkbox" bind:checked={app.options.split_by_chapters} /> Un fichier par chapitre</label>
        <label class="check"><input type="checkbox" bind:checked={app.options.sponsorblock} /> Sauter les passages sponsorisés</label>
      </div>
    {/if}

    <div class="foot">
      <div class="cookies">
        <span class="lbl">Cookies</span>
        <span class="muted">{cookies ? 'Fichier en place' : cookies === false ? 'Aucun' : '…'}</span>
        <button class="link" onclick={() => cookieInput?.click()}>{cookies ? 'Remplacer' : 'Envoyer un fichier'}</button>
        {#if cookies}<button class="link" onclick={deleteCookies}>Supprimer</button>{/if}
        <input bind:this={cookieInput} type="file" accept=".txt,text/plain" hidden onchange={uploadCookies} />
      </div>
      <form class="preset" onsubmit={savePreset}>
        <input bind:value={presetName} placeholder="Nom du préréglage" aria-label="Nom du préréglage" />
        <button class="ghost" disabled={!presetName.trim()}>Enregistrer</button>
      </form>
    </div>

    {#if app.presets.length}
      <div class="presets">
        {#each app.presets as p (p.name)}
          <span class="chip">
            <button class="chip-main" onclick={() => app.applyPreset(p)}>{p.name}</button>
            <button class="chip-x" onclick={() => app.removePreset(p.name)} aria-label="Supprimer {p.name}">×</button>
          </span>
        {/each}
      </div>
    {/if}
    <button class="link reset" onclick={() => app.resetOptions()}>Revenir aux réglages par défaut</button>
  {/if}
</section>

<style>
  .panel { margin-top: 16px; padding: 20px; border-radius: 18px; background: var(--surface); border: 1px solid var(--line);
    box-shadow: var(--shadow-sm); display: grid; gap: 18px; animation: unfold .35s var(--spring); transform-origin: top; }
  @keyframes unfold { from { opacity: 0; transform: translateY(-6px) scaleY(.97); } }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  label { display: grid; gap: 6px; }
  .lbl { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .02em; }
  .row > .lbl { min-width: 64px; }
  select, input:not([type='checkbox']) { height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: inherit; font-size: 14px; padding: 0 10px; outline: none; min-width: 0; }
  select:focus, input:focus { border-color: var(--ink); }
  .num { width: 76px; }
  .seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 12px; background: var(--chip); }
  .seg button { border: 0; background: none; font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); padding: 7px 12px; border-radius: 9px; cursor: pointer; }
  .seg button.on { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-sm); }
  .checks { gap: 20px; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
  .check input { accent-color: var(--accent); width: 16px; height: 16px; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line); }
  .cookies { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }
  .preset { display: flex; gap: 8px; }
  .preset input { width: 170px; }
  .ghost { height: 38px; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; padding: 0 12px; cursor: pointer; }
  .ghost:disabled { opacity: .4; cursor: default; }
  .link { border: 0; background: none; color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--line); cursor: pointer; padding: 0; }
  .link:hover { text-decoration-color: var(--ink); }
  .reset { justify-self: start; color: var(--muted); font-weight: 500; }
  .presets { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { display: inline-flex; border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
  .chip button { border: 0; background: none; color: var(--ink); font: inherit; font-size: 13px; cursor: pointer; }
  .chip-main { padding: 5px 4px 5px 12px; }
  .chip-x { padding: 5px 10px 5px 6px; color: var(--muted) !important; }
  .muted { color: var(--muted); font-size: 13px; }
</style>
