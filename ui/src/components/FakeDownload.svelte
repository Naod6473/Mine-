<script lang="ts">
  // Vitrine : la bulle de téléchargement du navigateur, imitée. Aucun fichier n'est créé.
  import { humanSize } from '../lib/labels';

  type Item = { id: number; filename: string; size: number | null; pct: number };
  let items = $state<Item[]>([]);
  let open = $state(false);
  let n = 0;

  $effect(() => {
    const h = (e: Event) => {
      const { filename, size } = (e as CustomEvent<{ filename: string; size: number | null }>).detail;
      const it: Item = { id: ++n, filename, size, pct: 0 };
      items = [it, ...items].slice(0, 4);
      open = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(100, ((now - start) / 900) * 100);
        items = items.map((x) => (x.id === it.id ? { ...x, pct: p } : x));
        if (p < 100) requestAnimationFrame(tick);
        else setTimeout(() => (open = false), 5200);
      };
      requestAnimationFrame(tick);
    };
    addEventListener('mine-fake-download', h);
    return () => removeEventListener('mine-fake-download', h);
  });
</script>

{#if open && items.length}
  <div class="dl" role="status" aria-label="Téléchargements">
    <div class="head">
      <span>Téléchargements récents</span>
      <button onclick={() => (open = false)} aria-label="Fermer">×</button>
    </div>
    {#each items as it (it.id)}
      <div class="row">
        <span class="ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </span>
        <span class="txt">
          <b>{it.filename}</b>
          <small>{it.pct < 100 ? `${Math.floor(it.pct)} %` : `${humanSize(it.size)} · Terminé (pour de faux)`}</small>
          <i class="bar"><i style:width="{it.pct}%"></i></i>
        </span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .dl { position: fixed; top: 14px; right: 14px; z-index: 20; width: min(360px, calc(100vw - 28px)); padding: 10px 12px 12px; border-radius: 14px;
    background: var(--surface); border: 1px solid var(--line); box-shadow: 0 18px 40px -14px rgb(0 0 0 / .45); animation: pop .35s var(--spring); }
  .head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  .head button { border: 0; background: none; color: var(--muted); font-size: 18px; cursor: pointer; }
  .row { display: flex; gap: 10px; align-items: center; padding: 6px 4px; }
  .ico { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--wash); color: var(--beak); }
  .txt { min-width: 0; flex: 1; display: grid; gap: 2px; }
  .txt b { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .txt small { font-size: 12px; color: var(--muted); }
  .bar { display: block; height: 3px; border-radius: 3px; background: var(--line); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--beak); }
  @keyframes pop { from { opacity: 0; transform: translateY(-8px) scale(.97); } }
</style>
