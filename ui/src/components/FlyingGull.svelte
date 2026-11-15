<script lang="ts">
  // Mouette en vol, ailes battantes : la brique de toutes les animations de chargement.
  let { size = 40, speed = 1 }: { size?: number; speed?: number } = $props();
</script>

<svg class="fly" width={size} height={size * 0.6} viewBox="0 0 40 24" style:--flap="{0.42 / speed}s" aria-hidden="true">
  <g class="bob">
    <path class="wing l" d="M20 12C15 5 8 4 1.5 7.2 7.6 7 12.8 9.2 17 13.4Z" />
    <path class="wing r" d="M20 12c5-7 12-8 18.5-4.8C32.4 7 27.2 9.2 23 13.4Z" />
    <ellipse class="body" cx="20" cy="13.2" rx="4.6" ry="2.7" />
    <path class="beak" d="M24.2 12.4 28 12.2 24.4 13.9Z" />
  </g>
</svg>

<style>
  .fly { display: block; overflow: visible; }
  .wing, .body { fill: var(--ink); }
  .beak { fill: var(--accent); }
  .wing { transform-box: view-box; transform-origin: 20px 12.6px; }
  .l { animation: flapL var(--flap) ease-in-out infinite alternate; }
  .r { animation: flapR var(--flap) ease-in-out infinite alternate; }
  .bob { animation: bob var(--flap) ease-in-out infinite alternate; }
  @keyframes flapL { from { transform: rotate(-14deg); } to { transform: rotate(30deg) scaleY(.7); } }
  @keyframes flapR { from { transform: rotate(14deg); } to { transform: rotate(-30deg) scaleY(.7); } }
  @keyframes bob { from { transform: translateY(1.4px); } to { transform: translateY(-1.2px); } }
  @media (prefers-reduced-motion: reduce) { .l, .r, .bob { animation: none; } }
</style>
