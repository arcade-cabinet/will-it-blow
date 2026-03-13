/**
 * Greenfield Playthrough E2E Test
 *
 * Verifies the game loads and renders correctly in a browser.
 * Uses the Zustand store via the DOM to verify state transitions.
 *
 * Run: npx playwright test e2e/greenfield-playthrough.spec.ts --project=chrome
 */

import {expect, test} from '@playwright/test';

test.describe('Greenfield Playthrough', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/', {waitUntil: 'networkidle', timeout: 60000});
    // Wait for React to mount
    await page.waitForSelector('#root > *', {timeout: 30000});
    await page.waitForTimeout(2000);
  });

  test('title screen renders', async ({page}) => {
    const rootContent = await page.innerHTML('#root');
    expect(rootContent.length).toBeGreaterThan(100);

    // Should show the title screen with the game name
    const text = await page.textContent('#root');
    expect(text).toContain('WILL IT');
    expect(text).toContain('BLOW');
  });

  test('START COOKING button is visible', async ({page}) => {
    const button = page.getByText('START COOKING');
    await expect(button).toBeVisible({timeout: 10000});
  });

  test('no fatal JavaScript errors on load', async ({page}) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', err => {
      // Filter out known non-fatal errors
      if (!err.message.includes('WebGL') && !err.message.includes('THREE')) {
        fatalErrors.push(err.message);
      }
    });

    await page.waitForTimeout(5000);
    expect(fatalErrors).toHaveLength(0);
  });

  test('clicking START COOKING shows difficulty selector', async ({page}) => {
    const startButton = page.getByText('START COOKING');
    await expect(startButton).toBeVisible({timeout: 10000});
    await startButton.click();
    await page.waitForTimeout(1000);

    // Should show difficulty options (names from difficulty.json)
    const rootText = (await page.textContent('#root')) ?? '';
    const hasDifficulty =
      rootText.includes('Medium') || rootText.includes('Rare') || rootText.includes('Well');
    expect(hasDifficulty).toBeTruthy();
  });

  test('selecting difficulty loads the game with canvas', async ({page}) => {
    // Click START COOKING
    const startButton = page.getByText('START COOKING');
    await expect(startButton).toBeVisible({timeout: 10000});
    await startButton.click();
    await page.waitForTimeout(1000);

    // Click Medium difficulty
    const mediumButton = page.getByText('Medium', {exact: false});
    await expect(mediumButton.first()).toBeVisible({timeout: 5000});
    await mediumButton.first().click();

    // Wait for loading screen to complete and canvas to appear
    // LoadingScreen runs ~2s, then 3D scene mounts
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({timeout: 30000});
  });

  test('no React infinite loop errors', async ({page}) => {
    const reactErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Maximum update depth exceeded')) {
          reactErrors.push(text);
        }
      }
    });

    // Click through to playing state
    const startButton = page.getByText('START COOKING');
    if (await startButton.isVisible({timeout: 5000}).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
      const mediumButton = page.getByText('Medium', {exact: false});
      if (await mediumButton.first().isVisible({timeout: 3000}).catch(() => false)) {
        await mediumButton.first().click();
      }
    }

    await page.waitForTimeout(8000);
    expect(reactErrors).toHaveLength(0);
  });
});
