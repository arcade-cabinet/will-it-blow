import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  // GitHub Pages serves from /will-it-blow/ subdirectory.
  // Locally (pnpm dev) this is just '/'.
  base: process.env.GITHUB_PAGES ? '/will-it-blow/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  optimizeDeps: {
    exclude: ['@react-three/rapier'],
  },
});
