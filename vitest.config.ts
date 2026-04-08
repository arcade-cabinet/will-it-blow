/**
 * Vitest configuration with two workspace projects:
 *
 * 1. **unit** — runs under jsdom in the default Node worker. This is where
 *    pure logic + ECS + scoring tests live. Fast, no browser. Matches the
 *    historical `pnpm test` behaviour so nothing regresses.
 *
 * 2. **browser** — runs in a real Chromium browser via `@vitest/browser`
 *    + the Playwright provider. This is where REAL R3F/Rapier component
 *    and integration tests live: we mount actual `<Canvas>` scenes, let
 *    WebGL and the physics world run, and assert against live state.
 *
 * The `browser` project is opt-in via `pnpm test:browser` so the default
 * `pnpm test` stays fast. CI runs both.
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'src/__mocks__/react-native.tsx'),
    },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            'react-native': path.resolve(__dirname, 'src/__mocks__/react-native.tsx'),
          },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
          exclude: ['e2e/**', 'node_modules/**', 'src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            'react-native': path.resolve(__dirname, 'src/__mocks__/react-native.tsx'),
          },
        },
        test: {
          name: 'browser',
          globals: true,
          include: ['src/**/*.browser.test.{ts,tsx}'],
          // Run browser tests sequentially with full isolation — Chromium
          // limits simultaneous WebGL contexts, so R3F canvases from
          // concurrent test files can exhaust the pool and fail with
          // "Error creating WebGL context". Isolating ensures each file
          // gets a fresh browser context (and therefore a fresh WebGL
          // quota) regardless of what the previous file left around.
          fileParallelism: false,
          isolate: true,
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{browser: 'chromium'}],
            screenshotFailures: false,
            isolate: true,
          },
        },
      },
    ],
  },
});
