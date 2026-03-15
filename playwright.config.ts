/**
 * Playwright E2E Configuration for Will It Blow?
 *
 * Projects:
 * - desktop: Desktop Chrome with GPU-accelerated WebGL (1280x720)
 * - mobile: Mobile Chrome with touch (390x844, iPhone-like)
 */

import type {PlaywrightTestConfig} from '@playwright/test';

const isCI = !!process.env.CI;

/** GPU-accelerated WebGL args for headless Chrome */
const GPU_ARGS = [
  '--no-sandbox',
  '--use-angle=gl',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--window-position=9999,9999',
];

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 120_000,

  reporter: [['html', {open: isCI ? 'never' : 'on-failure'}], ['list']],

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
        headless: true,
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
        headless: true,
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
};

export default config;
