/**
 * Playwright E2E Configuration for Will It Blow?
 *
 * Projects:
 * - desktop: Desktop Chrome with GPU-accelerated WebGL (1280x720)
 * - mobile: Mobile Chrome with touch (390x844, iPhone-like)
 */

import {defineConfig} from '@playwright/test';

const isCI = !!process.env.CI;

/** GPU-accelerated WebGL args for headed Chrome */
const GPU_ARGS = [
  '--no-sandbox',
  '--use-angle=gl',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--mute-audio',
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 120_000,

  reporter: [['html', {open: isCI ? 'never' : 'on-failure'}], ['list']],

  // Drop the `{platform}` suffix from snapshot names so a single baseline
  // (generated on whichever OS the author happens to be on) is reused on
  // every CI runner. GPU font rasterisation still differs between macOS
  // and Linux, so the visual regression tests set a generous
  // `maxDiffPixels` / `threshold`.
  //
  // Must be anchored under `{snapshotDir}` — the default template is
  // `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}`
  // and omitting it resolves to an absolute `/...` path at the FS root.
  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',

  expect: {
    timeout: 15_000,
  },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: isCI ? 'on-first-retry' : 'on',
    viewport: {width: 1280, height: 720},
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        headless: false,
        viewport: {width: 1280, height: 720},
        launchOptions: {
          args: GPU_ARGS,
        },
      },
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        headless: false,
        viewport: {width: 390, height: 844},
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: GPU_ARGS,
        },
      },
    },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        port: 3000,
        reuseExistingServer: !isCI,
        timeout: 30_000,
      },
});
