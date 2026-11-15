<script lang="ts">
  // Tout ce que Mine!? sait récupérer : les types de fichiers, puis la liste des sites lus par yt-dlp.
  import { onMount } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n.svelte';

  type Site = { name: string; kinds: string[]; cookies: boolean };
  const POPULAR = ['YouTube', 'Vimeo', 'Dailymotion', 'Twitch', 'TikTok', 'Instagram', 'X (Twitter)', 'Facebook', 'SoundCloud', 'Bandcamp', 'Reddit', 'Bilibili', 'France TV', 'Mixcloud', 'Bluesky'];

  let sites = $state<Site[] | null>(null);
  let failed = $state(false);
  let q = $state('');

  onMount(async () => {
    try { sites = await (await fetch('sites')).json(); } catch { failed = true; }
  });

  const popular = $derived((sites ?? []).filter((s) => POPULAR.includes(s.name)));
  const list = $derived.by(() => {
    const n = q.trim().toLowerCase();
    return (sites ?? []).filter((s) => !n || s.name.toLowerCase().includes(n) || s.kinds.some((k) => k.includes(n)));
  });
</script>

<section class="sites">
  <h1>{t('sitesTitle')}</h1>
  <p class="intro">{t('sitesIntro')}</p>

  <ul class="kinds">
    <li><strong>{t('kVideo')}</strong><span>{t('kVideoText')}</span></li>
    <li><strong>{t('kAudio')}</strong><span>{t('kAudioText')}</span></li>
    <li><strong>{t('kSubs')}</strong><span>{t('kSubsText')}</span></li>
    <li><strong>{t('kThumb')}</strong><span>{t('kThumbText')}</span></li>
    <li><strong>{t('kLists')}</strong><span>{t('kListsText')}</span></li>
    <li><strong>{t('kClips')}</strong><span>{t('kClipsText')}</span></li>
  </ul>

  <h2>{t('sitesHeading', sites ? sites.length.toLocaleString() : '…')}</h2>
  {#if failed}
    <p class="muted">{t('nope')}</p>
  {:else if !sites}
    <p class="muted">{t('ask')}</p>
  {:else}
    {#if popular.length && !q}
      <p class="popular">{popular.map((s) => s.name).join(' · ')}</p>
    {/if}
    <input class="search" type="search" bind:value={q} placeholder={t('sitesSearch')} aria-label={t('sitesSearch')} />
    <p class="count">{t('sitesCount', list.length)}</p>
    <ul class="list">
      {#each list as s, i (i)}
        <li>
          <span class="name">{s.name}</span>
          {#if s.kinds.length}<span class="sub">{s.kinds.slice(0, 4).join(', ')}{s.kinds.length > 4 ? '…' : ''}</span>{/if}
          {#if s.cookies}<span class="tag" title={t('cookiesHint')}>{t('cookies')}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
  <p class="note">{t('sitesNote')}</p>
  <p class="back"><button class="textbtn strong" onclick={() => app.go('mine')}>{t('back')}</button></p>
</section>

<style>
  .sites { padding: 0 0 8px; }
  h1 { font-family: var(--display); font-weight: 600; font-size: 30px; margin: 0 0 8px; }
  h2 { font-size: 15px; font-weight: 600; margin: 34px 0 10px; }
  .intro { color: var(--muted); margin: 0 0 22px; }
  .kinds { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
  .kinds li { padding: 14px 16px; border-radius: 14px; background: var(--wash); display: grid; gap: 4px; }
  .kinds strong { font-size: 14px; }
  .kinds span { font-size: 12.5px; color: var(--muted); line-height: 1.45; }
  .popular { font-size: 13.5px; line-height: 1.7; margin: 0 0 14px; }
  .search { width: 100%; height: 40px; border: 0; border-bottom: 1px solid var(--line); background: none; font: 15px var(--body); outline: none; padding: 0 2px; }
  .search:focus { border-bottom-color: var(--ink); }
  .count { font-size: 12px; color: var(--muted); margin: 8px 0; }
  .list { list-style: none; padding: 0; margin: 0; columns: 2 240px; column-gap: 28px; }
  .list li { break-inside: avoid; padding: 5px 0; border-bottom: 1px solid var(--line); display: flex; gap: 8px; align-items: baseline; font-size: 13.5px; }
  .name { font-weight: 500; }
  .sub { color: var(--muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .tag { margin-left: auto; flex: none; font-size: 10.5px; color: var(--muted); border: 1px solid var(--line); border-radius: 99px; padding: 0 6px; }
  .note { font-size: 12.5px; color: var(--muted); margin-top: 24px; }
  .back { margin-top: 24px; }
  .muted { color: var(--muted); }
</style>
