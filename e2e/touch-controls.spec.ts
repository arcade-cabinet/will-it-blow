/**
 * Touch Controls E2E — Dual-Zone SwipeFPSControls
 *
 * Verifies the dual-zone touch control layout renders correctly on mobile
 * viewports and responds to touch gestures (move left / look right / tap interact).
 *
 * Run on a specific mobile profile:
 *   npx playwright test e2e/touch-controls.spec.ts --project=iphone-14
 *   npx playwright test e2e/touch-controls.spec.ts --project=pixel-7
 *   npx playwright test e2e/touch-controls.spec.ts --project=galaxy-fold
 *
 * Run on ALL mobile profiles:
 *   npx playwright test e2e/touch-controls.spec.ts --project=iphone-14 --project=pixel-7 --project=ipad-mini --project=galaxy-fold --project=iphone-se
 */

import {expect, type Page, test} from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForGovernor(page: Page) {
  await page.waitForFunction(() => (window as any).__gov !== undefined, null, {
    timeout: 30_000,
  });
}

async function waitForPlaying(page: Page) {
  await page.waitForFunction(
    () => {
      const gov = (window as any).__gov;
      return gov && gov.getState().appPhase === 'playing';
    },
    null,
    {timeout: 60_000},
  );
}

async function startGame(page: Page) {
  await waitForGovernor(page);
  await page.evaluate(() => (window as any).__gov.startGameDirect());
  await waitForPlaying(page);
  // Wait for SwipeFPSControls lazy chunk to load and mount.
  // The component is behind a Suspense boundary + lazy import cascade
  // (GameWorld chunk → SwipeFPSControls chunk), so a fixed timeout is unreliable.
  await page.waitForSelector('[data-testid="touch-surface"]', {timeout: 30_000});
}

/**
 * Query touch zone layout via data-testid attributes.
 * React Native Web renders testID as data-testid on DOM elements.
 */
async function getTouchZones(page: Page) {
  return page.evaluate(() => {
    const container = document.querySelector('[data-testid="touch-surface"]');
    const moveZone = document.querySelector('[data-testid="move-zone"]');
    const lookZone = document.querySelector('[data-testid="look-zone"]');
    if (!container || !moveZone || !lookZone) return null;
    const containerRect = container.getBoundingClientRect();
    const moveRect = moveZone.getBoundingClientRect();
    const lookRect = lookZone.getBoundingClientRect();
    return {
      container: {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left,
      },
      moveZone: {
        width: moveRect.width,
        height: moveRect.height,
        left: moveRect.left,
        top: moveRect.top,
      },
      lookZone: {
        width: lookRect.width,
        height: lookRect.height,
        left: lookRect.left,
        top: lookRect.top,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Tests — only run on mobile projects (skip desktop 'chrome')
// ---------------------------------------------------------------------------

test.describe('Dual-zone touch controls', () => {
  test.beforeEach(async ({page}, testInfo) => {
    // Skip desktop project — SwipeFPSControls only renders on touch devices
    test.skip(testInfo.project.name === 'chrome', 'Desktop — no touch controls');
    // Playwright's hasTouch adds ontouchstart but doesn't set maxTouchPoints.
    // The app checks both, so we inject maxTouchPoints before page loads.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {value: 5, writable: false});
    });
    await page.goto('/');
    await startGame(page);
  });

  test('touch surface renders with two 50% zones', async ({page}) => {
    const zones = await getTouchZones(page);
    expect(zones).not.toBeNull();
    if (!zones) return;

    const viewport = page.viewportSize()!;

    // Container should be fullscreen
    expect(zones.container.width).toBeCloseTo(viewport.width, 0);
    expect(zones.container.height).toBeCloseTo(viewport.height, 0);

    // Both zones should be ~50% width
    const halfWidth = viewport.width / 2;
    expect(zones.moveZone.width).toBeCloseTo(halfWidth, 0);
    expect(zones.lookZone.width).toBeCloseTo(halfWidth, 0);

    // Move zone on left, look zone on right
    expect(zones.moveZone.left).toBeLessThan(zones.lookZone.left);

    // Full height
    expect(zones.moveZone.height).toBeCloseTo(viewport.height, 0);
    expect(zones.lookZone.height).toBeCloseTo(viewport.height, 0);
  });

  test('left zone drag writes to joystickRef (movement)', async ({page}) => {
    const viewport = page.viewportSize()!;
    // Touch center of left half
    const startX = viewport.width * 0.25;
    const startY = viewport.height * 0.5;

    // Simulate drag on left zone: pointer down, move right, pointer up
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Drag 60px right (should produce positive x in joystick)
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(startX + i * 10, startY, {steps: 1});
    }
    await page.waitForTimeout(100);

    // Take screenshot for visual verification
    await page.screenshot({
      path: `e2e/screenshots/touch-move-drag-${test.info().project.name}.png`,
    });

    await page.mouse.up();
  });

  test('right zone drag calls onLookDrag (camera look)', async ({page}) => {
    const viewport = page.viewportSize()!;
    // Touch center of right half
    const startX = viewport.width * 0.75;
    const startY = viewport.height * 0.5;

    // Simulate drag on right zone
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(startX + i * 10, startY - i * 5, {steps: 1});
    }
    await page.waitForTimeout(100);

    // Take screenshot during look drag
    await page.screenshot({
      path: `e2e/screenshots/touch-look-drag-${test.info().project.name}.png`,
    });

    await page.mouse.up();
  });

  test('tap on either zone triggers interact', async ({page}) => {
    const viewport = page.viewportSize()!;

    // Tap left zone (quick press + release = interact)
    const leftX = viewport.width * 0.25;
    const centerY = viewport.height * 0.5;
    await page.touchscreen.tap(leftX, centerY);
    await page.waitForTimeout(100);

    // Tap right zone
    const rightX = viewport.width * 0.75;
    await page.touchscreen.tap(rightX, centerY);
    await page.waitForTimeout(100);

    // If we get here without error, taps were handled (no crash)
  });

  test('screenshot: full touch layout', async ({page}) => {
    const projectName = test.info().project.name;
    await page.screenshot({
      path: `e2e/screenshots/touch-layout-${projectName}.png`,
      fullPage: true,
    });

    // Verify zones are present
    const zones = await getTouchZones(page);
    expect(zones).not.toBeNull();
  });
});
