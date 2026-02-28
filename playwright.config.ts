import { defineConfig } from '@playwright/test';

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
		headless: !!process.env.CI,
	},

	projects: [
		{
			name: 'chrome',
			use: {
				// Use installed Chrome (not bundled Chromium) for WebGL/WebGPU support.
				// Three.js/R3F needs GPU rendering that bundled Chromium doesn't support.
				channel: 'chrome',
				viewport: { width: 1280, height: 720 },
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
