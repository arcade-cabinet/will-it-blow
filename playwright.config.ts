import {defineConfig, devices} from '@playwright/test';

// Extract viewport/touch/UA from device profiles without their browserName
// (we force Chrome channel for WebGL support across all profiles)
function chromeDevice(deviceName: string) {
  const {browserName: _, defaultBrowserType: __, ...rest} = devices[deviceName] as any;
  return {channel: 'chrome' as const, ...rest};
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 120_000,

  use: {
    baseURL: 'http://localhost:8082',
    screenshot: 'off',
    trace: 'on-first-retry',
    headless: false,
  },

  projects: [
    // Desktop — default
    {
      name: 'chrome',
      use: {
        channel: 'chrome',
        viewport: {width: 1280, height: 720},
      },
    },

    // ── Mobile viewport profiles (touch-enabled, Chrome for WebGL) ──

    {name: 'iphone-14', use: chromeDevice('iPhone 14')},
    {name: 'iphone-se', use: chromeDevice('iPhone SE')},
    {name: 'pixel-7', use: chromeDevice('Pixel 7')},
    {name: 'ipad-mini', use: chromeDevice('iPad Mini')},
    {
      name: 'galaxy-fold',
      use: {
        channel: 'chrome',
        viewport: {width: 280, height: 653},
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; SM-F926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
  ],

  webServer: {
    command: 'npx expo start --web --port 8082',
    port: 8082,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
