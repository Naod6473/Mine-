<script lang="ts">
  let { text = 'Mine ?' }: { text?: string } = $props();
</script>

<div class="splash" role="status" aria-live="polite">
  <img src="gull-fly.webp" alt="" width="360" height="229" />
  <p>{text}</p>
</div>

<style>
  .splash { display: grid; justify-items: center; gap: 6px; padding: 12vh 0 40px; }
  img { width: 230px; height: auto; animation: bob 2.4s ease-in-out infinite; }
  p { margin: 0; font-family: var(--display); font-weight: 500; font-size: 20px; color: var(--muted); }
  @keyframes bob { 50% { transform: translateY(-9px); } }
  @media (prefers-reduced-motion: reduce) { img { animation: none; } }
</style>
