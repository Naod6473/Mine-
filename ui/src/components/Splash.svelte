<script lang="ts">
  import FlyingGull from './FlyingGull.svelte';
  let { text = 'Mine ?' }: { text?: string } = $props();
</script>

<div class="splash" role="status" aria-live="polite">
  <div class="sky">
    <div class="glide"><FlyingGull size={72} /></div>
    <svg class="sea" viewBox="0 0 240 24" preserveAspectRatio="none" aria-hidden="true">
      <path class="w1" d="M0 12q15-8 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0V24H0Z" />
      <path class="w2" d="M0 16q20-7 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0V24H0Z" />
    </svg>
  </div>
  <p>{text}</p>
</div>

<style>
  .splash { display: grid; justify-items: center; gap: 18px; padding: 72px 0 40px; color: var(--muted); }
  .sky { position: relative; width: 240px; height: 120px; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent); }
  .glide { position: absolute; left: 50%; top: 22px; margin-left: -36px; animation: glide 3.2s ease-in-out infinite; }
  .sea { position: absolute; bottom: 0; left: 0; width: 480px; height: 26px; }
  .w1 { fill: color-mix(in oklab, var(--sea) 22%, transparent); animation: swell 4s linear infinite; }
  .w2 { fill: color-mix(in oklab, var(--sea) 38%, transparent); animation: swell 2.8s linear infinite reverse; }
  p { font-weight: 600; letter-spacing: .02em; animation: pulse 1.6s ease-in-out infinite; }
  @keyframes glide { 0%, 100% { transform: translate(-34px, 6px) rotate(-4deg); } 50% { transform: translate(34px, -6px) rotate(5deg); } }
  @keyframes swell { to { transform: translateX(-240px); } }
  @keyframes pulse { 50% { opacity: .45; } }
  @media (prefers-reduced-motion: reduce) { .glide, .w1, .w2, p { animation: none; } }
</style>
