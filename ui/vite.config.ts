import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// En dev, le serveur Python tourne sur :8081 ; Vite lui relaie l'API et le WebSocket.
const backend = 'http://localhost:8081';
const api = ['add', 'retry', 'delete', 'start', 'cancel-add', 'upload-cookies', 'delete-cookies',
  'cookie-status', 'version', 'download', 'audio_download'];

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0 },
  server: {
    proxy: {
      '/socket.io': { target: backend, ws: true },
      ...Object.fromEntries(api.map((p) => [`/${p}`, backend])),
    },
  },
});
