/**
 * Vitest configuration — two workspace projects, each with its own
 * runtime, plus a **multi-viewport browser matrix** baked directly into
 * the `browser` project.
 *
 *  ┌─ unit ──────────────── jsdom, fast, pure logic ───────────────────┐
 *  ├─ browser ─┬─ desktop-1280 (1280×720)                              │
 *  │           ├─ mobile-390  (390×844, touch)                         │
 *  │           ├─ tablet-768  (768×1024)                               │
 *  │           └─ uhd-3840    (3840×2160, devicePixelRatio=1)          │
 *  └───────────┴────────────────────────────────────────────────────────┘
 *
 * `pnpm test`          → unit only (historical default, still fast)
 * `pnpm test:browser`  → every browser-test file × every viewport
 * `pnpm test:all`      → both projects
 *
 * The browser project runs HEADED (`headless: false`) because Chromium
 * throttles requestAnimationFrame aggressively in headless mode, which
 * starves R3F's render loop and breaks `useFrame` in tests. CI wraps the
 * command in `xvfb-run` to provide a virtual display. The
 * `--disable-background-*` launch flags are belt-and-braces insurance
 * against any remaining throttling when the window is not frontmost.
 *
 * This config **replaces** the previous `playwright.config.ts` — Vitest
 * browser mode uses Playwright's provider under the hood, so we keep all
 * the real-browser capabilities while collapsing to a single test runner.
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

/** Shared Chromium launch args — unlocks RAF, WebGL, and audio mute. */
const CHROMIUM_LAUNCH_ARGS = [
  '--no-sandbox',
  '--use-angle=gl',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--mute-audio',
  // Critical: Chromium throttles RAF and timers in backgrounded or
  // occluded windows, which causes R3F's frame loop to stall. Off.
  '--disable-backgrounding-occluded-windows',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
];

/** Every viewport size we test at. Driven into a Vitest browser instance. */
const VIEWPORTS = [
  {name: 'desktop-1280', width: 1280, height: 720},
  {name: 'mobile-390', width: 390, height: 844},
  {name: 'tablet-768', width: 768, height: 1024},
  // 4K is split out with DPR forced to 1 — at the default DPR the
  // backing texture would blow past Chromium's 16 MP limit.
  {name: 'uhd-3840', width: 3840, height: 2160},
] as const;

const browserAlias = {
  'react-native': path.resolve(__dirname, 'src/__mocks__/react-native.tsx'),
};

export default defineConfig({
  plugins: [react()],
  resolve: {alias: browserAlias},
  test: {
    projects: [
      // ── unit (jsdom) ────────────────────────────────────────────────
      {
        plugins: [react()],
        resolve: {alias: browserAlias},
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
          exclude: [
            'e2e/**',
            'tests/**',
            'node_modules/**',
            'src/**/*.browser.test.{ts,tsx}',
          ],
        },
      },

      // ── browser (real Chromium, multi-viewport) ─────────────────────
      {
        plugins: [react()],
        resolve: {alias: browserAlias},
        test: {
          name: 'browser',
          globals: true,
          include: [
            'src/**/*.browser.test.{ts,tsx}',
            'tests/**/*.browser.test.{ts,tsx}',
          ],
          // Sequential file execution + per-file isolation so each
          // browser test file gets a clean page context. Prevents
          // WebGL context limits and React-tree leaks between files.
          fileParallelism: false,
          isolate: true,
          browser: {
            enabled: true,
            provider: 'playwright',
            // Headless (the "new" headless shell in Playwright ≥1.46)
            // is fast AND doesn't background-throttle as long as the
            // `--disable-background-*` launch flags are set. Vitest
            // also refuses to run multiple headed instances
            // concurrently, so headless is the only way to use the
            // multi-viewport matrix.
            headless: true,
            screenshotFailures: false,
            isolate: true,
            instances: VIEWPORTS.map(vp => ({
              browser: 'chromium',
              name: vp.name,
              // These fields flow into the Playwright browser context.
              viewport: {width: vp.width, height: vp.height},
              launch: {args: CHROMIUM_LAUNCH_ARGS},
              // Clamp DPR on the 4K project so the back-buffer stays
              // under the GPU's max texture size.
              deviceScaleFactor: vp.name === 'uhd-3840' ? 1 : undefined,
            })),
          },
        },
      },
    ],
  },
});
