/**
 * Real Playthrough E2E — Physical player movement through all 7 challenges.
 *
 * Unlike playthrough.spec.ts which puppets the store directly (skipToChallenge,
 * triggerChallenge), this test exercises the ACTUAL input → movement → proximity
 * trigger pipeline:
 *
 *   keyboard 'w' → InputManager.keys → FPSController.useFrame (movement)
 *     → camera.position updates → store.playerPosition syncs
 *     → proximity distance check → triggerChallenge() fires
 *
 * For each station:
 *   1. Teleport to a standoff position outside the trigger radius, facing the station
 *   2. Press 'w' to walk forward via real keyboard input
 *   3. Player physically walks into the trigger zone
 *   4. Proximity check fires triggerChallenge() (same math as ManualProximityTrigger)
 *   5. Complete the challenge via governor (minigame timing can't be E2E automated)
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

async function waitForPlaying(page: Page) {
  await page.waitForFunction(
    () => {
      const gov = (window as any).__gov;
      return gov && gov.getState().appPhase === 'playing';
    },
    null,
    {timeout: 90_000},
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

/**
 * Face a station and walk into its trigger zone using keyboard input.
 *
 * This exercises the FULL input → movement → proximity pipeline:
 *   keyboard 'w' → InputManager.keys → FPSController.useFrame (movement)
 *     → camera.position updates → store.playerPosition syncs
 *     → checkProximityTrigger() distance check → triggerChallenge()
 *
 * 1. Teleport to a standoff position facing the station (outside trigger radius)
 * 2. Press 'w' to walk forward
 * 3. Wait for proximity trigger to fire naturally
 * 4. Release 'w'
 */
async function walkToStation(page: Page, challengeIndex: number) {
  const target = await page.evaluate(
    (idx: number) => (window as any).__gov.getStationTarget(idx),
    challengeIndex,
  );
  if (!target) throw new Error(`No station target for challenge ${challengeIndex}`);

  const [sx, , sz] = target.position;

  // Compute standoff position: stand outside trigger radius, facing the station
  // Direction from station to room center
  const dx = 0 - sx;
  const dz = 0 - sz;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  // Stand at triggerRadius + 1m clearance (guaranteed outside sensor)
  const standoff = target.triggerRadius + 1.0;
  const standX = sx + (dx / len) * standoff;
  const standZ = sz + (dz / len) * standoff;
  // Yaw to face the station from standoff position
  const faceDx = sx - standX;
  const faceDz = sz - standZ;
  const yaw = Math.atan2(-faceDx, -faceDz);

  // Teleport to standoff position (outside trigger zone)
  await page.evaluate(
    ({pos, yaw}: {pos: [number, number, number]; yaw: number}) =>
      (window as any).__gov.setCamera(pos, yaw),
    {pos: [standX, 1.6, standZ] as [number, number, number], yaw},
  );

  // Wait for teleport to be consumed by FPSController
  await page.waitForTimeout(200);

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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Real Playthrough — Physical Proximity Triggers', () => {
  test('full 7-challenge playthrough via proximity triggers', async ({page}) => {
    test.setTimeout(180_000);

    await page.goto('/');
    await waitForGovernor(page);

    // Start the game WITHOUT auto-triggering the first challenge.
    // This forces us to walk there ourselves.
    await page.evaluate(() => (window as any).__gov.startGameNoTrigger());
    await waitForPlaying(page);
    await waitForCanvas(page);
    await waitForSceneReady(page);

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

      // Walk to the station — proximity trigger fires naturally
      await walkToStation(page, i);

      // Verify the proximity system triggered the challenge (not us)
      const afterState = await getState(page);
      expect(afterState.challengeTriggered).toBe(true);
      expect(afterState.currentChallenge).toBe(i);

      // Screenshot the triggered challenge
      await page.screenshot({
        path: `e2e/screenshots/real-playthrough-${String(i).padStart(2, '0')}-${challenges[i]}.png`,
      });

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

    await page.screenshot({path: 'e2e/screenshots/real-playthrough-victory.png'});
  });

  test('proximity trigger respects challenge order', async ({page}) => {
    test.setTimeout(120_000);

    await page.goto('/');
    await waitForGovernor(page);
    await page.evaluate(() => (window as any).__gov.startGameNoTrigger());
    await waitForPlaying(page);
    await waitForCanvas(page);
    await waitForSceneReady(page);

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
    await page.evaluate(() => (window as any).__gov.startGameNoTrigger());
    await waitForPlaying(page);
    await waitForCanvas(page);
    await waitForSceneReady(page);

    // Walk to first station
    await walkToStation(page, 0);
    const state = await getState(page);
    expect(state.challengeTriggered).toBe(true);

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

    await page.screenshot({path: 'e2e/screenshots/real-playthrough-defeat.png'});
  });
});
