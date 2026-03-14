/**
 * Real Playthrough E2E — Physical player movement through all 7 challenges.
 *
 * Unlike playthrough.spec.ts which puppets the store directly (skipToChallenge,
 * triggerChallenge), this test exercises the ACTUAL input → movement → proximity
 * trigger pipeline:
 *
 *   keyboard 'w' → InputManager.keys → FPSController.useFrame (movement)
 *     → camera.position updates → store.playerPosition syncs
 *     → Rapier StationSensor.onIntersectionEnter → triggerChallenge()
 *
 * For each station:
 *   1. Teleport to a standoff position outside the trigger radius, facing the station
 *   2. Press 'w' to walk forward via real keyboard input
 *   3. Player physically walks into the trigger zone
 *   4. Rapier sensor fires triggerChallenge()
 *   5. Teleport back to standoff for screenshot (clear view of station)
 *   6. Complete the challenge via governor (minigame timing can't be E2E automated)
 *
 * Run:
 *   npx playwright test e2e/real-playthrough.spec.ts
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

/** Wait for appPhase to reach a target value */
async function waitForPhase(page: Page, phase: string, timeoutMs = 90_000) {
  await page.waitForFunction(
    (p: string) => {
      const gov = (window as any).__gov;
      return gov && gov.getState().appPhase === p;
    },
    phase,
    {timeout: timeoutMs},
  );
}

async function waitForSceneReady(page: Page) {
  await page.waitForFunction(() => (window as any).__gov?.sceneReady === true, null, {
    timeout: 90_000,
  });
}

async function waitForCanvas(page: Page) {
  await page.waitForSelector('canvas', {timeout: 30_000});
}

async function getState(page: Page) {
  return page.evaluate(() => (window as any).__gov.getState());
}

/** Allow N ms for R3F render frames to flush (GLBs, textures, post-processing) */
async function settle(page: Page, ms = 1500) {
  await page.waitForTimeout(ms);
}

/**
 * Boot the game through the loading screen (preloads GLBs/textures),
 * wait for the 3D scene to be fully rendered and ready.
 * Does NOT trigger any challenge — the player spawns at room center.
 */
async function startAndWaitForScene(page: Page) {
  await page.evaluate(() => (window as any).__gov.startGame());
  await waitForPhase(page, 'playing');
  await waitForCanvas(page);
  await waitForSceneReady(page);
  // Extra settle for GLBs/textures to finish loading after sceneReady
  await settle(page, 3000);
}

/**
 * Compute standoff position and yaw for a station.
 * Returns { standX, standZ, yaw } — a position outside the trigger radius,
 * facing the station, offset toward room center.
 */
function computeStandoff(target: {position: [number, number, number]; triggerRadius: number}) {
  const [sx, , sz] = target.position;
  const dx = 0 - sx;
  const dz = 0 - sz;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const standoff = target.triggerRadius + 1.0;
  const standX = sx + (dx / len) * standoff;
  const standZ = sz + (dz / len) * standoff;
  const faceDx = sx - standX;
  const faceDz = sz - standZ;
  const yaw = Math.atan2(-faceDx, -faceDz);
  return {standX, standZ, yaw};
}

/**
 * Face a station and walk into its trigger zone using keyboard input.
 *
 * This exercises the FULL input → movement → proximity pipeline:
 *   keyboard 'w' → InputManager.keys → FPSController.useFrame (movement)
 *     → camera.position updates → PlayerBody.setNextKinematicTranslation
 *     → Rapier physics step → StationSensor.onIntersectionEnter → triggerChallenge()
 *
 * 1. Teleport to a standoff position facing the station (outside trigger radius)
 * 2. Press 'w' to walk forward
 * 3. Wait for Rapier sensor to fire triggerChallenge()
 * 4. Release 'w'
 *
 * Returns the standoff position so the caller can teleport back for screenshots.
 */
async function walkToStation(
  page: Page,
  challengeIndex: number,
): Promise<{standX: number; standZ: number; yaw: number}> {
  const target = await page.evaluate(
    (idx: number) => (window as any).__gov.getStationTarget(idx),
    challengeIndex,
  );
  if (!target) throw new Error(`No station target for challenge ${challengeIndex}`);

  const {standX, standZ, yaw} = computeStandoff(target);

  // Teleport to standoff position (outside trigger zone)
  await page.evaluate(
    ({pos, yaw}: {pos: [number, number, number]; yaw: number}) =>
      (window as any).__gov.setCamera(pos, yaw),
    {pos: [standX, 1.6, standZ] as [number, number, number], yaw},
  );

  // Wait for teleport to be consumed by FPSController
  await settle(page, 300);

  // Walk forward with 'w' key — real keyboard input through InputManager
  await page.keyboard.down('w');

  // Wait for Rapier StationSensor to fire onIntersectionEnter as the
  // PlayerBody walks into the trigger zone.
  await page.waitForFunction(
    () => {
      const gov = (window as any).__gov;
      return gov && gov.getState().challengeTriggered === true;
    },
    null,
    {timeout: 15_000},
  );

  // Stop walking
  await page.keyboard.up('w');

  return {standX, standZ, yaw};
}

/**
 * Teleport back to standoff position and let the frame render,
 * so the screenshot shows the station from a clear viewpoint.
 */
async function snapFromStandoff(
  page: Page,
  standoff: {standX: number; standZ: number; yaw: number},
  filename: string,
) {
  await page.evaluate(
    ({pos, yaw}: {pos: [number, number, number]; yaw: number}) =>
      (window as any).__gov.setCamera(pos, yaw),
    {pos: [standoff.standX, 1.6, standoff.standZ] as [number, number, number], yaw: standoff.yaw},
  );
  // Let R3F render the new camera position + any challenge overlay
  await settle(page, 1000);
  await page.screenshot({path: `e2e/screenshots/${filename}.png`});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Real Playthrough — Physical Proximity Triggers', () => {
  test('full 7-challenge playthrough via proximity triggers', async ({page}) => {
    test.setTimeout(300_000);

    await page.goto('/');
    await waitForGovernor(page);

    // Start game through loading screen so GLBs are preloaded.
    // Does NOT auto-trigger any challenge.
    await startAndWaitForScene(page);

    const challenges = [
      'fridge',
      'cutting-board',
      'grinder',
      'stuffer',
      'stove',
      'dining-table',
      'crt-tv',
    ];
    const scores = [85, 70, 80, 75, 90, 82, 88];

    for (let i = 0; i < challenges.length; i++) {
      // Verify we're on the right challenge and it hasn't been triggered yet
      const beforeState = await getState(page);
      expect(beforeState.currentChallenge).toBe(i);
      expect(beforeState.challengeTriggered).toBe(false);
      expect(beforeState.gameStatus).toBe('playing');

      // Walk to the station — Rapier sensor fires triggerChallenge()
      const standoff = await walkToStation(page, i);

      // Verify the proximity system triggered the challenge (not us)
      const afterState = await getState(page);
      expect(afterState.challengeTriggered).toBe(true);
      expect(afterState.currentChallenge).toBe(i);

      // Teleport back to standoff for a clear view, then screenshot
      await snapFromStandoff(
        page,
        standoff,
        `real-playthrough-${String(i).padStart(2, '0')}-${challenges[i]}`,
      );

      // Complete the challenge (score the minigame) without auto-triggering next
      await page.evaluate(
        (score: number) => (window as any).__gov.completeCurrentChallengeNoTrigger(score),
        scores[i],
      );
    }

    // After completing all 7 challenges, game should transition to victory
    const finalState = await getState(page);
    expect(finalState.gameStatus).toBe('victory');
    expect(finalState.challengeScores).toEqual(scores);

    // Victory screen is a 2D overlay — let it render
    await settle(page, 3000);
    await page.screenshot({path: 'e2e/screenshots/real-playthrough-victory.png'});
  });

  test('proximity trigger respects challenge order', async ({page}) => {
    test.setTimeout(120_000);

    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Walk to station 2 (grinder) while currentChallenge is 0.
    // The StationSensor should NOT trigger because challengeIndex !== currentChallenge.
    const grinderTarget = await page.evaluate(() => (window as any).__gov.getStationTarget(2));
    if (grinderTarget) {
      const [x, , z] = grinderTarget.position;
      // Teleport directly to the grinder station
      await page.evaluate(
        ({pos, yaw}: {pos: [number, number, number]; yaw: number}) =>
          (window as any).__gov.setCamera(pos, yaw),
        {pos: [x, 1.6, z] as [number, number, number], yaw: 0},
      );
      // Walk around a bit to ensure physics detects us
      await page.keyboard.down('w');
      await page.waitForTimeout(500);
      await page.keyboard.up('w');

      const state = await getState(page);
      // Should still be challenge 0, NOT triggered (wrong station)
      expect(state.currentChallenge).toBe(0);
      expect(state.challengeTriggered).toBe(false);
    }

    // Now walk to station 0 (fridge) — THIS should trigger
    await walkToStation(page, 0);
    const triggeredState = await getState(page);
    expect(triggeredState.currentChallenge).toBe(0);
    expect(triggeredState.challengeTriggered).toBe(true);
  });

  test('defeat via strikes during real playthrough', async ({page}) => {
    test.setTimeout(120_000);

    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Walk to first station
    const standoff = await walkToStation(page, 0);
    const state = await getState(page);
    expect(state.challengeTriggered).toBe(true);

    // Screenshot from standoff before defeat
    await snapFromStandoff(page, standoff, 'real-playthrough-fridge-triggered');

    // Add 3 strikes for defeat
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.addStrike();
      gov.addStrike();
      gov.addStrike();
    });

    const defeatState = await getState(page);
    expect(defeatState.gameStatus).toBe('defeat');
    expect(defeatState.strikes).toBe(3);

    // Defeat screen is a 2D overlay — let it render
    await settle(page, 3000);
    await page.screenshot({path: 'e2e/screenshots/real-playthrough-defeat.png'});
  });
});
