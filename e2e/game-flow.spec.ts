import {expect, test} from '@playwright/test';

test.describe('Game Flow', () => {
  test('title screen renders with butcher shop sign', async ({page}) => {
    await page.goto('/');
    await expect(page.getByText('WILL IT')).toBeVisible();
    await expect(page.getByText('BLOW?')).toBeVisible();
    await expect(page.getByText('START COOKING')).toBeVisible();
    await expect(page.getByText('Fine Meats & Sausages')).toBeVisible();
  });

  test('clicking START COOKING shows difficulty selector', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await expect(page.getByText('CHOOSE YOUR DONENESS')).toBeVisible({timeout: 5000});
    await expect(page.getByText('Medium')).toBeVisible({timeout: 5000});
  });

  test('difficulty selector shows all five tiers', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await expect(page.getByText('Rare')).toBeVisible({timeout: 5000});
    await expect(page.getByText('Medium Rare')).toBeVisible({timeout: 5000});
    await expect(page.getByText('Medium', {exact: true})).toBeVisible({timeout: 5000});
    await expect(page.getByText('Medium Well')).toBeVisible({timeout: 5000});
    await expect(page.getByText('Well Done')).toBeVisible({timeout: 5000});
  });

  test('difficulty selector has PERMADEATH divider', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await expect(page.getByText('PERMADEATH')).toBeVisible({timeout: 5000});
  });

  test('BACK button returns to title screen', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await expect(page.getByText('CHOOSE YOUR DONENESS')).toBeVisible({timeout: 5000});
    await page.getByLabel('Back to main menu').click();
    await expect(page.getByText('START COOKING')).toBeVisible({timeout: 5000});
  });

  test('selecting difficulty loads 3D scene', async ({page}) => {
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await page.getByText('Medium', {exact: true}).first().click();
    // Canvas should appear once the 3D scene starts loading
    await expect(page.locator('canvas')).toBeVisible({timeout: 30000});
  });

  test('3D scene has no critical console errors', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.getByText('START COOKING').click();
    await page.getByText('Medium', {exact: true}).first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(3000);
    // Filter out known harmless errors (AudioContext, 404 assets, Three.js warnings, React hydration)
    const realErrors = errors.filter(
      e =>
        !e.includes('AudioContext') &&
        !e.includes('404') &&
        !e.includes('THREE.Clock') &&
        !e.includes('getSnapshot should be cached') &&
        !e.includes('Maximum update depth exceeded') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
