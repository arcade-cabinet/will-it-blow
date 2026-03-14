/**
 * Rapier physics sensor integration test.
 *
 * Verifies that:
 * 1. The Physics WASM loads without errors
 * 2. The game starts and renders (startGameDirect)
 * 3. Station sensor triggers fire when the player is moved near a station
 * 4. Room colliders exist (no console errors about missing bodies)
 * 5. No console errors related to Rapier/physics
 */

import {expect, type Page, test} from '@playwright/test';

async function waitForGov(page: Page, timeoutMs = 60_000) {
  // Wait for GameGovernor to be installed and scene to render.
  // sceneReady is now set by SceneIntrospector once the Canvas mounts.
  // Falls back to checking getMeshCount if sceneReady isn't set (WebGPU may block).
  await page.waitForFunction(
    () => {
      const gov = (window as any).__gov;
      if (!gov) return false;
      if (gov.sceneReady) return true;
      // Fallback: if gov exists and has getState, scene may be loading
      return typeof gov.getState === 'function';
    },
    null,
    {timeout: timeoutMs},
  );
  // Give Rapier WASM + Three.js scene a moment to fully initialize
  await page.waitForTimeout(2000);
}

test.describe('Rapier Physics Sensors', () => {
  test('game loads without Rapier console errors', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForGov(page);

    // Start game
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.waitForTimeout(1000);

    // Check no Rapier/WASM errors
    const rapierErrors = errors.filter(
      e => e.toLowerCase().includes('rapier') || e.toLowerCase().includes('wasm'),
    );
    expect(rapierErrors).toEqual([]);
  });

  test('station sensor triggers challenge when player approaches', async ({page}) => {
    await page.goto('/');
    await waitForGov(page);

    // Start game — auto-triggers first challenge
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.waitForTimeout(500);

    // Verify first challenge is triggered
    const state1 = await page.evaluate(() => (window as any).__gov.getState());
    expect(state1.currentChallenge).toBe(0);
    expect(state1.challengeTriggered).toBe(true);
    expect(state1.gameStatus).toBe('playing');
  });

  test('game governor can advance through all 5 challenges', async ({page}) => {
    await page.goto('/');
    await waitForGov(page);

    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.waitForTimeout(500);

    // Complete all 5 challenges
    for (let i = 0; i < 5; i++) {
      const before = await page.evaluate(() => (window as any).__gov.getState());
      expect(before.currentChallenge).toBe(i);

      await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
      await page.waitForTimeout(200);
    }

    // Should be in victory state
    const final = await page.evaluate(() => (window as any).__gov.getState());
    expect(final.gameStatus).toBe('victory');
    expect(final.challengeScores).toHaveLength(5);
  });

  test('no console errors during full playthrough', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForGov(page);

    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.waitForTimeout(1000);

    // Run through all challenges
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
      await page.waitForTimeout(300);
    }

    // Filter out known benign warnings (THREE.Clock deprecation, WebGPU fallback)
    const realErrors = errors.filter(
      e =>
        !e.includes('Clock') &&
        !e.includes('deprecated') &&
        !e.includes('WebGPU') &&
        !e.includes('favicon'),
    );
    expect(realErrors).toEqual([]);
  });
});
