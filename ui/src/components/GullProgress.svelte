<script lang="ts">
  import FlyingGull from './FlyingGull.svelte';
  // percent = null : on ne sait pas encore (préparation, file d'attente) → la mouette fait des allers-retours.
  let { percent = null, tone = 'accent' }: { percent?: number | null; tone?: 'accent' | 'done' | 'error' } = $props();
  const p = $derived(percent == null ? null : Math.max(0, Math.min(100, percent)));
</script>

<div class="progress" class:indeterminate={p == null} data-tone={tone}
  role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={p ?? undefined}>
  <div class="track">
    <div class="fill" style:width="{p ?? 0}%"></div>
  </div>
  {#if tone === 'accent'}
    <div class="rider" style:left={p == null ? undefined : `${p}%`}>
      <FlyingGull size={30} speed={p == null ? 0.8 : 1.3} />
    </div>
  {/if}
</div>

<style>
  .progress { position: relative; height: 30px; display: flex; align-items: flex-end; padding-bottom: 2px; }
  .track { position: relative; width: 100%; height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
  .fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width .6s cubic-bezier(.2,.8,.2,1);
    background-image: linear-gradient(90deg, transparent 0 40%, rgb(255 255 255 / .45) 50%, transparent 60% 100%);
    background-size: 200% 100%; animation: sheen 1.8s linear infinite; }
  [data-tone='done'] .fill { background-color: var(--sea); animation: none; background-image: none; }
  [data-tone='error'] .fill { background-color: var(--danger); animation: none; background-image: none; }
  .indeterminate .track::after { content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--accent) 55%, transparent) 0 8px, transparent 8px 16px);
    animation: drift 1s linear infinite; opacity: .55; }
  .rider { position: absolute; bottom: 5px; transform: translateX(-60%); transition: left .6s cubic-bezier(.2,.8,.2,1); pointer-events: none; }
  .indeterminate .rider { animation: patrol 2.6s ease-in-out infinite; }
  @keyframes sheen { from { background-position: 150% 0; } to { background-position: -50% 0; } }
  @keyframes drift { to { background-position: 22.6px 0; } }
  @keyframes patrol {
    0% { left: 4%; transform: translateX(-50%) scaleX(1); }
    48% { left: 92%; transform: translateX(-50%) scaleX(1); }
    50% { left: 92%; transform: translateX(-50%) scaleX(-1); }
    98% { left: 4%; transform: translateX(-50%) scaleX(-1); }
    100% { left: 4%; transform: translateX(-50%) scaleX(1); }
  }
  @media (prefers-reduced-motion: reduce) { .fill, .indeterminate .track::after, .indeterminate .rider { animation: none; } }
</style>
