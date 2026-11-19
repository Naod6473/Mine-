<script lang="ts">
  // Vitrine : un mot pour dire que rien n'est téléchargé, un lien d'exemple qui s'écrit tout seul.
  import { onMount } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { SAMPLE_URL } from '../lib/showcase';
  import { i18n } from '../lib/i18n.svelte';

  const SOURCE_URL = 'https://github.com/Naod6473/Mine-';
  const fr = $derived(i18n.lang === 'fr');

  function sample() {
    dispatchEvent(new CustomEvent('mine-type', { detail: SAMPLE_URL }));
  }
  onMount(() => {
    const id = setTimeout(() => { if (app.tab === 'mine' && !app.cards.length) sample(); }, 1300);
    return () => clearTimeout(id);
  });
</script>

<aside class="show">
  <strong>{fr ? 'Démo factice' : 'Pretend demo'}</strong>
  <p>{fr
    ? 'Ici, rien n’est vraiment téléchargé : c’est une démonstration. Appuie sur « À moi ! » pour voir comment ça se passe.'
    : 'Nothing is really downloaded here: it’s a demonstration. Press “Mine!” to see how it goes.'}</p>
  <p class="links">
    <button class="textbtn" onclick={sample}>{fr ? 'Remettre le lien d’exemple' : 'Use the sample link again'}</button>
    <span>·</span>
    <a href={SOURCE_URL} target="_blank" rel="noreferrer">{fr ? 'Installer Mine!? chez toi, sans limite' : 'Install Mine!? at home, no limits'}</a>
  </p>
</aside>

<style>
  .show { margin-top: 26px; padding: 14px 18px; border-radius: 18px; border: 1px dashed color-mix(in oklab, var(--beak) 60%, var(--line));
    background: color-mix(in oklab, var(--beak) 8%, var(--surface)); font-size: 14px; }
  strong { color: var(--beak); font-weight: 600; }
  p { margin: 4px 0 0; }
  .links { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; color: var(--muted); }
  .links a { color: var(--sea, inherit); font-weight: 500; }
  .textbtn { border: 0; background: none; padding: 0; font: 500 14px var(--body); color: var(--sea, var(--ink)); text-decoration: underline; cursor: pointer; }
</style>
