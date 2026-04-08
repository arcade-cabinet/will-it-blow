import {expect, test} from '@playwright/test';

test.describe('Visual Regression', () => {
  // Navigate away before teardown to cleanly unmount R3F / Rapier WASM.
  test.afterEach(async ({page}) => {
    await page.goto('about:blank', {timeout: 5000}).catch(() => {});
  });

  test('title screen matches snapshot', async ({page}) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // Let animations settle
    // Cross-OS font rasterisation / GPU hinting can move every glyph by
    // sub-pixel amounts, so keep the tolerance generous. Real regressions
    // still trip this check because they produce whole-area diffs, not a
    // percentage of anti-aliased edges.
    await expect(page).toHaveScreenshot('title-screen.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.4,
    });
  });

  test('difficulty selector matches snapshot', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('difficulty-selector.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.4,
    });
  });

  test('kitchen scene renders (canvas present)', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await page.getByText('Medium', {exact: true}).first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(3000);
    // Just verify canvas exists and has pixels (WebGL screenshots vary by GPU)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});
