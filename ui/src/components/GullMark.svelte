<script lang="ts">
  // La mouette de Mine!? (dessin original) : tête de profil, bec ouvert.
  let { size = 28, shout = false }: { size?: number; shout?: boolean } = $props();
</script>

<svg class="mark" class:shout width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
  <path class="head" d="M15 52c0-15 5-30 19-33 7-1.5 12 2.5 13 9l.4 5c.7 9-6 16-15 19z" />
  <path class="wing" d="M15 52c2-5 7-8 13-8" />
  <circle class="eye" cx="38.5" cy="27" r="2.6" />
  <g class="beak">
    <path class="upper" d="M46.6 27.4 58 22.6 47.8 31.6z" />
    <path class="lower" d="M47.6 33.4 57.4 38 46.9 37.6z" />
  </g>
</svg>

<style>
  .mark { display: block; overflow: visible; }
  .head { fill: var(--gull); stroke: var(--gull-line); stroke-width: 2.6; stroke-linejoin: round; }
  .wing { fill: none; stroke: var(--muted); stroke-width: 2.4; stroke-linecap: round; }
  .eye { fill: #1E2329; }
  .beak path { fill: var(--accent); transform-box: view-box; transform-origin: 47px 32px; transition: transform .25s var(--spring); }
  .shout .upper { animation: up .5s var(--spring) infinite alternate; }
  .shout .lower { animation: down .5s var(--spring) infinite alternate; }
  @keyframes up { to { transform: rotate(-9deg); } }
  @keyframes down { to { transform: rotate(10deg); } }
  @media (prefers-reduced-motion: reduce) { .shout .upper, .shout .lower { animation: none; } }
</style>
