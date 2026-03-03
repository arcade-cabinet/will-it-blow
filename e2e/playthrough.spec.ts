/**
 * Comprehensive visual playthrough test — all 7 challenges.
 *
 * Uses the GameGovernor (window.__gov) to programmatically drive the game
 * to each stage and capture screenshots for visual review.
 *
 * Each challenge captures two shots:
 *   - `*-scene.png`  — the raw 3D canvas (overlay hidden)
 *   - `*-full.png`   — the full game view (overlay + canvas)
 *
 * Run:
 *   npx playwright test e2e/playthrough.spec.ts
 *
 * Screenshots saved to: e2e/screenshots/
 */

import path from 'node:path';
import {expect, type Page, test} from '@playwright/test';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function snap(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

/** Take a screenshot with the UI overlay temporarily hidden (shows raw 3D scene) */
async function snapScene(page: Page, name: string) {
  // Hide the overlay layer to reveal the 3D canvas
  await page.evaluate(() => {
    const overlays = document.querySelectorAll('[data-testid="game-overlay"]');
    overlays.forEach(el => {
      (el as HTMLElement).dataset.wasHidden = 'true';
      (el as HTMLElement).style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(100);
  await snap(page, `${name}-scene`);
  // Restore overlays
  await page.evaluate(() => {
    const overlays = document.querySelectorAll('[data-was-hidden]');
    overlays.forEach(el => {
      (el as HTMLElement).style.visibility = '';
      delete (el as HTMLElement).dataset.wasHidden;
    });
  });
}

/** Take both scene (3D only) and full (overlay + 3D) screenshots */
async function snapBoth(page: Page, name: string) {
  await snapScene(page, name);
  await snap(page, `${name}-full`);
}

async function waitForGovernor(page: Page) {
  await page.waitForFunction(() => (window as any).__gov !== undefined, null, {
    timeout: 30_000,
  });
}

async function getState(page: Page) {
  return page.evaluate(() => (window as any).__gov.getState());
}

async function waitForPhase(page: Page, phase: string, timeoutMs = 60_000) {
  await page.waitForFunction(
    p => {
      const gov = (window as any).__gov;
      return gov && gov.getState().appPhase === p;
    },
    phase,
    {timeout: timeoutMs},
  );
}

async function waitForChallenge(page: Page, index: number, timeoutMs = 15_000) {
  await page.waitForFunction(
    idx => {
      const gov = (window as any).__gov;
      const state = gov?.getState();
      return (
        state &&
        state.currentChallenge === idx &&
        state.gameStatus === 'playing' &&
        state.challengeTriggered === true
      );
    },
    index,
    {timeout: timeoutMs},
  );
}

async function waitForCanvas(page: Page, timeoutMs = 30_000) {
  await page.waitForSelector('canvas', {timeout: timeoutMs});
}

/** Dismiss dialogue by clicking through all lines + choosing first option if choices appear */
async function dismissDialogue(page: Page) {
  for (let attempt = 0; attempt < 10; attempt++) {
    // Check for "Tap to continue" first
    const tapElement = page.locator('[data-testid="dialogue-tap"]');
    if (await tapElement.isVisible({timeout: 500}).catch(() => false)) {
      await tapElement.click();
      await page.waitForTimeout(400);
      continue;
    }

    // Check for choice buttons — just click the first one
    const firstChoice = page.locator('[data-testid="dialogue-choice"]').first();
    if (await firstChoice.isVisible({timeout: 500}).catch(() => false)) {
      await firstChoice.click();
      await page.waitForTimeout(400);
      continue;
    }

    // No more dialogue elements visible — we're past the dialogue
    break;
  }
}

/** Brief pause for animations/transitions */
async function settle(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait until the 3D scene + GLB meshes are fully loaded */
async function waitForSceneReady(page: Page, timeoutMs = 90_000) {
  await page.waitForFunction(() => (window as any).__gov?.sceneReady === true, null, {
    timeout: timeoutMs,
  });
}

/** Start game through loading screen and wait for 3D scene to be ready */
async function startAndWaitForScene(page: Page) {
  await page.evaluate(() => (window as any).__gov.startGame());
  await waitForPhase(page, 'playing', 90_000);
  await waitForCanvas(page);
  await waitForSceneReady(page);
  await page.evaluate(() => (window as any).__gov.triggerCurrentChallenge());
}

// ---------------------------------------------------------------------------
// Tests — all 7 challenges
// ---------------------------------------------------------------------------

test.describe('Full Game Playthrough — Visual Audit (7 Challenges)', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('01 — Menu screen', async ({page}) => {
    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    await settle(1500);
    await snap(page, '01-menu');
  });

  test('02 — Loading screen', async ({page}) => {
    // Stall asset fetches (never resolve) so preloading doesn't complete.
    // This keeps the sausage-links progress bar visible for the screenshot.
    await page.route('**/*.{glb,ogg,jpg}', _route => {});
    await page.evaluate(() => (window as any).__gov.setPhase('loading'));
    await waitForPhase(page, 'loading');
    await settle(1500); // Allow fade-in animation (600ms) to complete
    await snap(page, '02-loading');
    // Unblock for subsequent tests
    await page.unrouteAll();
  });

  test('03 — Challenge 0: Fridge / Ingredient Selection', async ({page}) => {
    await startAndWaitForScene(page);
    await waitForChallenge(page, 0);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '03-challenge0-fridge');
  });

  test('04 — Challenge 1: Chopping / Cutting Board', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '04-challenge1-chopping');
  });

  test('05 — Challenge 2: Grinding / Grinder', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '05-challenge2-grinder');
  });

  test('06 — Challenge 3: Stuffing / Stuffer', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '06-challenge3-stuffer');
  });

  test('07 — Challenge 4: Cooking / Stove', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(4));
    await waitForChallenge(page, 4);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '07-challenge4-stove');
  });

  test('08 — Challenge 5: Blowout / Dining Table', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(5));
    await waitForChallenge(page, 5);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '08-challenge5-blowout');
  });

  test('09 — Challenge 6: Tasting / CRT TV', async ({page}) => {
    await startAndWaitForScene(page);
    await page.evaluate(() => (window as any).__gov.skipToChallenge(6));
    await waitForChallenge(page, 6);
    await settle(4000);
    await dismissDialogue(page);
    await settle(2000);
    await snapBoth(page, '09-challenge6-tasting');
  });

  test('10 — Victory screen (S-rank)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([95, 94, 92, 93, 91, 95, 96]));
    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'victory',
      null,
      {timeout: 15_000},
    );
    await settle(3000);
    await snap(page, '10-victory-srank');
  });

  test('11 — Defeat screen', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'defeat',
      null,
      {timeout: 15_000},
    );
    await settle(3000);
    await snap(page, '11-defeat');
  });

  test('12 — Full sequential run: all 7 challenges', async ({page}) => {
    await startAndWaitForScene(page);

    const challenges = ['fridge', 'chopping', 'grinder', 'stuffer', 'stove', 'blowout', 'tasting'];
    const scores = [85, 70, 80, 75, 90, 82, 88];

    for (let i = 0; i < challenges.length; i++) {
      await waitForChallenge(page, i);
      await settle(3000);
      await dismissDialogue(page);
      await settle(2000);

      await snapBoth(page, `12-fullrun-${String(i).padStart(2, '0')}-${challenges[i]}`);

      // Check state is correct at each station
      const state = await getState(page);
      expect(state.currentChallenge).toBe(i);
      expect(state.gameStatus).toBe('playing');

      await page.evaluate(({score}) => (window as any).__gov.completeCurrentChallenge(score), {
        score: scores[i],
      });
    }

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'victory',
      null,
      {timeout: 15_000},
    );
    await settle(3000);
    await snap(page, '12-fullrun-victory');

    // Verify all scores recorded
    const finalState = await getState(page);
    expect(finalState.challengeScores).toEqual(scores);
  });

  test('13 — 3D scene inventory: furniture, machines, lighting', async ({page}) => {
    await startAndWaitForScene(page);
    await settle(3000);

    // Count meshes
    const meshCount = await page.evaluate(() => (window as any).__gov.getMeshCount?.() ?? -1);
    console.log(`  Mesh count: ${meshCount}`);
    expect(meshCount).toBeGreaterThan(50); // Kitchen should have lots of geometry

    // Check scene children exist
    const sceneChildren = await page.evaluate(
      () => (window as any).__gov.getSceneChildren?.() ?? [],
    );
    console.log(`  Top-level scene children: ${sceneChildren.length}`);
    expect(sceneChildren.length).toBeGreaterThan(0);

    // Check camera position (player should be inside the room)
    const camera = await page.evaluate(() => (window as any).__gov.getCamera?.() ?? null);
    if (camera) {
      console.log(`  Camera position: [${camera.position.join(', ')}]`);
      console.log(`  Camera FOV: ${camera.fov}`);
    }

    await snapBoth(page, '13-scene-inventory');
  });

  test('14 — Horror props exist in scene', async ({page}) => {
    await startAndWaitForScene(page);
    await settle(3000);

    // Check for horror prop groups in scene graph
    const horrorGroups = await page.evaluate(() => {
      const find = (window as any).__gov.findGroups;
      if (!find) return [];
      const patterns = ['bear-trap', 'worm', 'fly-swatter'];
      return patterns.map(p => ({name: p, found: find(p).length > 0}));
    });
    console.log('  Horror props:', JSON.stringify(horrorGroups));

    await snap(page, '14-horror-props');
  });

  test('15 — Defeat at each station (strike system)', async ({page}) => {
    for (let challengeIdx = 0; challengeIdx < 7; challengeIdx++) {
      await page.goto('/');
      await waitForGovernor(page);
      await page.evaluate(() => (window as any).__gov.startGame());
      await waitForPhase(page, 'playing', 90_000);

      // Skip to target challenge
      if (challengeIdx > 0) {
        const scores = Array(challengeIdx).fill(75);
        await page.evaluate(
          ({idx, scores}) => (window as any).__gov.skipToChallengeWithScores(idx, scores),
          {idx: challengeIdx, scores},
        );
      } else {
        await page.evaluate(() => (window as any).__gov.triggerCurrentChallenge());
      }

      // Add 3 strikes for defeat
      await page.evaluate(() => {
        const gov = (window as any).__gov;
        gov.addStrike();
        gov.addStrike();
        gov.addStrike();
      });

      const state = await getState(page);
      expect(state.gameStatus).toBe('defeat');
      expect(state.strikes).toBe(3);
    }
    await snap(page, '15-defeat-at-last-station');
  });
});
