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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (
            id.includes('@react-three/fiber') ||
            id.includes('@react-three/drei') ||
            id.includes('@react-three/postprocessing') ||
            id.includes('@react-three/rapier') ||
            id.includes('@dimforge/rapier3d-compat')
          )
            return 'r3f';
          if (id.includes('node_modules/tone/')) return 'tone';
        },
      },
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  optimizeDeps: {
    exclude: ['@react-three/rapier'],
  },
});
