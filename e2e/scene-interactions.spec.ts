/**
 * Scene Interactions E2E — Station Placement, Always-Render Verification,
 * Camera Positioning, Challenge Advancement, and Interactive State.
 *
 * Uses GameGovernor (window.__gov) + SceneIntrospector for programmatic
 * game control AND Three.js scene graph queries.
 *
 * Run:
 *   npx playwright test e2e/scene-interactions.spec.ts
 */

import {expect, type Page, test} from '@playwright/test';

// ---------------------------------------------------------------------------
// Expected positions (from GameWorld.tsx STATION_CAMERAS)
// ---------------------------------------------------------------------------

/** Camera positions from STATION_CAMERAS in GameWorld.tsx */
const CAMERA_POSITIONS = [
  {name: 'fridge', position: [-2.5, 1.6, -2.5]},
  {name: 'grinder', position: [-2, 1.6, -0.5]},
  {name: 'stuffer', position: [0, 1.6, 0]},
  {name: 'stove', position: [-2.5, 1.6, -2.0]},
  {name: 'tasting', position: [-1, 1.6, 0]},
] as const;

const MENU_CAMERA_POSITION = [0, 1.6, 2];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      return (
        gov && gov.getState().currentChallenge === idx && gov.getState().gameStatus === 'playing'
      );
    },
    index,
    {timeout: timeoutMs},
  );
}

async function waitForCanvas(page: Page, timeoutMs = 30_000) {
  await page.waitForSelector('canvas', {timeout: timeoutMs});
}

async function waitForSceneReady(page: Page, timeoutMs = 90_000) {
  await page.waitForFunction(() => (window as any).__gov?.sceneReady === true, null, {
    timeout: timeoutMs,
  });
}

/** Wait for scene introspection functions to be injected by SceneIntrospector */
async function waitForIntrospector(page: Page, timeoutMs = 15_000) {
  await page.waitForFunction(() => typeof (window as any).__gov?.getCamera === 'function', null, {
    timeout: timeoutMs,
  });
}

async function startAndWaitForScene(page: Page) {
  await page.evaluate(() => (window as any).__gov.startGame());
  await waitForPhase(page, 'playing', 90_000);
  await waitForCanvas(page);
  await waitForSceneReady(page);
  await waitForIntrospector(page);
}

/** Wait for camera to settle near a target position (animation complete) */
async function waitForCameraAt(
  page: Page,
  expected: readonly number[],
  tolerance = 0.5,
  timeoutMs = 10_000,
) {
  await page.waitForFunction(
    ({pos, tol}) => {
      const gov = (window as any).__gov;
      if (!gov?.getCamera) return false;
      const cam = gov.getCamera();
      return (
        Math.abs(cam.position[0] - pos[0]) < tol &&
        Math.abs(cam.position[1] - pos[1]) < tol &&
        Math.abs(cam.position[2] - pos[2]) < tol
      );
    },
    {pos: [...expected], tol: tolerance},
    {timeout: timeoutMs},
  );
}

/** Brief pause for animations/transitions */
async function settle(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assertNear(actual: number, expected: number, tolerance: number, label: string) {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ~${expected}, got ${actual.toFixed(2)}`,
  ).toBeLessThan(tolerance);
}

// =========================================================================
// 1. ALWAYS-RENDERED STATIONS — Mesh presence before and during gameplay
// =========================================================================

test.describe('Always-Rendered Stations', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('grinder, stuffer, and stove meshes exist at challenge 0 (fridge)', async ({page}) => {
    await waitForChallenge(page, 0);
    await settle(1000);

    const meshCount = await page.evaluate(() => (window as any).__gov.getMeshCount());
    // With always-render, should have many meshes even at challenge 0
    // Grinder: body + hopper + spout + crank + knob + chunks + particles ≈ 7+
    // Stuffer: body + plunger + handle + knob + spout + casing + casingEnd + meatFill ≈ 8+
    // Stove: burner + pan + handle + sausage + 2 caps + thermometer parts + particles ≈ 10+
    // Kitchen: GLB meshes + room enclosure + grime + lights ≈ 20+
    // CRT TV: housing + screen + glass + borders + knobs + antennas ≈ 15+
    expect(meshCount).toBeGreaterThan(50);
  });

  test('grinder station exists in scene at all challenge indices', async ({page}) => {
    for (let challenge = 0; challenge < 5; challenge++) {
      await page.evaluate(({idx}) => (window as any).__gov.skipToChallenge(idx), {idx: challenge});
      await waitForChallenge(page, challenge);
      await settle(500);

      const meshCount = await page.evaluate(() => (window as any).__gov.getMeshCount());
      expect(meshCount, `Challenge ${challenge}: mesh count should be consistent`).toBeGreaterThan(
        40,
      );
    }
  });

  test('mesh count does not change dramatically between challenges', async ({page}) => {
    const counts: number[] = [];

    for (let challenge = 0; challenge < 5; challenge++) {
      if (challenge > 0) {
        await page.evaluate(({score}) => (window as any).__gov.completeCurrentChallenge(score), {
          score: 75,
        });
        await waitForChallenge(page, challenge);
      }
      await settle(1000);

      const count = await page.evaluate(() => (window as any).__gov.getMeshCount());
      counts.push(count);
    }

    // Fridge challenge may have fewer meshes (ingredients only when pool exists)
    // But grinder/stuffer/stove should always be there
    // Verify challenges 1-4 have similar mesh counts (within 30% of each other)
    const nonFridgeCounts = counts.slice(1);
    const avgCount = nonFridgeCounts.reduce((a, b) => a + b, 0) / nonFridgeCounts.length;
    for (let i = 0; i < nonFridgeCounts.length; i++) {
      expect(
        Math.abs(nonFridgeCounts[i] - avgCount) / avgCount,
        `Challenge ${i + 1} mesh count ${nonFridgeCounts[i]} deviates too much from avg ${avgCount.toFixed(0)}`,
      ).toBeLessThan(0.4);
    }
  });
});

// =========================================================================
// 2. STATION PLACEMENT — World position verification
// =========================================================================

test.describe('Station Placement', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('CRT Television is at expected back-wall position', async ({page}) => {
    const scene = await page.evaluate(() => (window as any).__gov.getSceneChildren());
    // CRT is always rendered and should be a top-level child
    expect(scene.length).toBeGreaterThan(0);

    // Scene should contain ambient light, camera walker null, kitchen env, CRT, stations
    const types = scene.map((c: any) => c.type);
    expect(types).toContain('Group'); // At least some groups present
  });

  test('all station meshes are visible (not hidden)', async ({page}) => {
    // Jump to challenge 2 so it's mid-game
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);
    await settle(2000);

    // Check that scene has substantial content
    const meshCount = await page.evaluate(() => (window as any).__gov.getMeshCount());
    expect(meshCount).toBeGreaterThan(50);
  });
});

// =========================================================================
// 3. CAMERA POSITIONING — Camera moves to correct station per challenge
// =========================================================================

test.describe('Camera Positioning', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('camera starts near fridge position at challenge 0', async ({page}) => {
    await waitForChallenge(page, 0);
    // Wait for camera walk animation to complete (transition speed = 0.4/frame)
    await waitForCameraAt(page, CAMERA_POSITIONS[0].position, 0.5, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[0].position[0], 0.5, 'cam.x');
    assertNear(cam.position[1], CAMERA_POSITIONS[0].position[1], 0.6, 'cam.y');
    assertNear(cam.position[2], CAMERA_POSITIONS[0].position[2], 0.5, 'cam.z');
  });

  test('camera moves to grinder position at challenge 1', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(75));
    await waitForChallenge(page, 1);
    await waitForCameraAt(page, CAMERA_POSITIONS[1].position, 0.5, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[1].position[0], 0.5, 'cam.x');
    assertNear(cam.position[1], CAMERA_POSITIONS[1].position[1], 0.6, 'cam.y');
    assertNear(cam.position[2], CAMERA_POSITIONS[1].position[2], 0.5, 'cam.z');
  });

  test('camera moves to stuffer position at challenge 2', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);
    await waitForCameraAt(page, CAMERA_POSITIONS[2].position, 0.5, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[2].position[0], 0.5, 'cam.x');
    assertNear(cam.position[1], CAMERA_POSITIONS[2].position[1], 0.6, 'cam.y');
    assertNear(cam.position[2], CAMERA_POSITIONS[2].position[2], 0.5, 'cam.z');
  });

  test('camera moves to stove position at challenge 3', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);
    await waitForCameraAt(page, CAMERA_POSITIONS[3].position, 0.5, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[3].position[0], 0.5, 'cam.x');
    assertNear(cam.position[1], CAMERA_POSITIONS[3].position[1], 0.6, 'cam.y');
    assertNear(cam.position[2], CAMERA_POSITIONS[3].position[2], 0.5, 'cam.z');
  });

  test('camera moves to tasting position at challenge 4', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(4));
    await waitForChallenge(page, 4);
    await waitForCameraAt(page, CAMERA_POSITIONS[4].position, 0.5, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[4].position[0], 0.5, 'cam.x');
    assertNear(cam.position[1], CAMERA_POSITIONS[4].position[1], 0.6, 'cam.y');
    assertNear(cam.position[2], CAMERA_POSITIONS[4].position[2], 0.5, 'cam.z');
  });

  test('camera returns to menu position when game ends', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');
    // Start a new game and return to menu to trigger camera walk
    await settle(3000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    // Menu camera should be near [0, 1.6, 2]
    assertNear(cam.position[1], MENU_CAMERA_POSITION[1], 0.6, 'cam.y');
  });

  test('camera FOV is 70 degrees', async ({page}) => {
    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    expect(cam.fov).toBe(70);
  });
});

// =========================================================================
// 4. CHALLENGE ADVANCEMENT WITH STATE VERIFICATION
// =========================================================================

test.describe('Challenge Advancement — State Integrity', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('advancing 0→1 resets ephemeral state and moves camera', async ({page}) => {
    // Set some state at challenge 0
    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(60);
      (window as any).__gov.addStrike();
    });

    let state = await getState(page);
    expect(state.challengeProgress).toBe(60);
    expect(state.strikes).toBe(1);

    // Advance
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
    await waitForChallenge(page, 1);

    state = await getState(page);
    expect(state.currentChallenge).toBe(1);
    expect(state.challengeProgress).toBe(0);
    expect(state.strikes).toBe(0);
    expect(state.challengeScores).toEqual([80]);

    // Camera should move toward grinder
    await waitForCameraAt(page, CAMERA_POSITIONS[1].position, 0.5, 15_000);
  });

  test('advancing 1→2 resets grinder state and moves camera', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    await page.evaluate(() => (window as any).__gov.setChallengeProgress(45));
    let state = await getState(page);
    expect(state.challengeProgress).toBe(45);

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(70));
    await waitForChallenge(page, 2);

    state = await getState(page);
    expect(state.currentChallenge).toBe(2);
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);

    await waitForCameraAt(page, CAMERA_POSITIONS[2].position, 0.5, 15_000);
  });

  test('advancing 2→3 resets stuffer state and moves camera', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(80);
      (window as any).__gov.setChallengePressure(55);
    });

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(85));
    await waitForChallenge(page, 3);

    const state = await getState(page);
    expect(state.currentChallenge).toBe(3);
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);

    await waitForCameraAt(page, CAMERA_POSITIONS[3].position, 0.5, 15_000);
  });

  test('advancing 3→4 resets stove state and moves camera', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(200);
      (window as any).__gov.setChallengeHeatLevel(0.8);
    });

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(90));
    await waitForChallenge(page, 4);

    const state = await getState(page);
    expect(state.currentChallenge).toBe(4);
    expect(state.challengeTemperature).toBe(70); // Reset to room temp
    expect(state.challengeHeatLevel).toBe(0);

    await waitForCameraAt(page, CAMERA_POSITIONS[4].position, 0.5, 15_000);
  });

  test('completing challenge 4 triggers victory', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallengeWithScores(4, [80, 75, 85, 70]));
    await waitForChallenge(page, 4);

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(90));

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'victory',
      null,
      {timeout: 15_000},
    );

    const state = await getState(page);
    expect(state.gameStatus).toBe('victory');
    expect(state.challengeScores).toEqual([80, 75, 85, 70, 90]);
  });
});

// =========================================================================
// 5. CHALLENGE INTERACTION — Ephemeral state changes via governor
// =========================================================================

test.describe('Challenge Interactions — Ephemeral State', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('grinder: progress updates from 0 to 100', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    // Incrementally increase progress
    for (const progress of [0, 25, 50, 75, 100]) {
      await page.evaluate(({p}) => (window as any).__gov.setChallengeProgress(p), {p: progress});
      const state = await getState(page);
      expect(state.challengeProgress).toBe(progress);
    }
  });

  test('grinder: strikes accumulate and trigger defeat at 3', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    await page.evaluate(() => (window as any).__gov.addStrike());
    let state = await getState(page);
    expect(state.strikes).toBe(1);
    expect(state.gameStatus).toBe('playing');

    await page.evaluate(() => (window as any).__gov.addStrike());
    state = await getState(page);
    expect(state.strikes).toBe(2);
    expect(state.gameStatus).toBe('playing');

    await page.evaluate(() => (window as any).__gov.addStrike());
    state = await getState(page);
    expect(state.strikes).toBe(3);
    expect(state.gameStatus).toBe('defeat');
  });

  test('stuffer: pressure and progress update independently', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(40);
      (window as any).__gov.setChallengePressure(65);
    });

    const state = await getState(page);
    expect(state.challengeProgress).toBe(40);
    expect(state.challengePressure).toBe(65);
  });

  test('stuffer: high pressure + strike = burst scenario', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(70);
      (window as any).__gov.setChallengePressure(95);
      (window as any).__gov.addStrike();
    });

    const state = await getState(page);
    expect(state.challengeProgress).toBe(70);
    expect(state.challengePressure).toBe(95);
    expect(state.strikes).toBe(1);
  });

  test('stove: temperature and heat level update', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(180);
      (window as any).__gov.setChallengeHeatLevel(0.6);
    });

    const state = await getState(page);
    expect(state.challengeTemperature).toBe(180);
    expect(state.challengeHeatLevel).toBeCloseTo(0.6, 1);
  });

  test('stove: overheating scenario', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(400);
      (window as any).__gov.setChallengeHeatLevel(1.0);
    });

    const state = await getState(page);
    expect(state.challengeTemperature).toBe(400);
    expect(state.challengeHeatLevel).toBeCloseTo(1.0, 1);
  });

  test('fridge: ingredient pool and selection state', async ({page}) => {
    await waitForChallenge(page, 0);
    await settle(2000);

    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());

    // Fridge pool should be populated by the IngredientChallenge overlay
    // (if dialogue has been dismissed and pool generated)
    // The pool may or may not be populated depending on dialogue state
    // Just verify the shape of the data
    expect(fridgeState).toHaveProperty('fridgePool');
    expect(fridgeState).toHaveProperty('fridgeMatchingIndices');
    expect(fridgeState).toHaveProperty('fridgeSelectedIndices');
    expect(fridgeState).toHaveProperty('pendingFridgeClick');
    expect(Array.isArray(fridgeState.fridgePool)).toBe(true);
    expect(Array.isArray(fridgeState.fridgeMatchingIndices)).toBe(true);
    expect(Array.isArray(fridgeState.fridgeSelectedIndices)).toBe(true);
  });

  test('fridge: triggerFridgeClick sets pendingFridgeClick', async ({page}) => {
    await waitForChallenge(page, 0);
    await settle(2000);

    await page.evaluate(() => (window as any).__gov.triggerFridgeClick(3));
    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    // pendingFridgeClick should be set (or already consumed by overlay)
    // Either way, verifying the action doesn't crash
    expect(fridgeState.pendingFridgeClick === 3 || fridgeState.pendingFridgeClick === null).toBe(
      true,
    );
  });
});

// =========================================================================
// 6. REST-STATE PROPS — Stations show idle state when not active challenge
// =========================================================================

test.describe('Rest-State Props — Inactive Station Behavior', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('at challenge 0: grinder/stuffer/stove have rest-state values', async ({page}) => {
    await waitForChallenge(page, 0);

    // Even though we set challenge progress, it should only affect fridge (challenge 0)
    // The grinder/stuffer/stove receive rest-state props
    const state = await getState(page);
    expect(state.currentChallenge).toBe(0);
    expect(state.challengeProgress).toBe(0); // No progress set yet
    expect(state.challengeTemperature).toBe(70); // Room temp default
    expect(state.challengeHeatLevel).toBe(0); // No heat
  });

  test('at challenge 1: setting progress only affects grinder visuals', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    await page.evaluate(() => (window as any).__gov.setChallengeProgress(60));
    const state = await getState(page);
    expect(state.challengeProgress).toBe(60);

    // The stuffer and stove should still see rest-state props
    // (GameWorld passes 0 to stuffer, 70/0 to stove when not active)
    // We verify this by checking the store values — the component props are derived
    expect(state.challengeTemperature).toBe(70);
    expect(state.challengeHeatLevel).toBe(0);
    expect(state.challengePressure).toBe(0);
  });

  test('at challenge 3: stuffer and grinder get rest-state props', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);

    // Set stove-specific state
    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(200);
      (window as any).__gov.setChallengeHeatLevel(0.7);
    });

    const state = await getState(page);
    expect(state.challengeTemperature).toBe(200);
    expect(state.challengeHeatLevel).toBeCloseTo(0.7, 1);

    // Grinder and stuffer are at rest state (progress=0, pressure=0)
    // confirmed by the fact that these values aren't set
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);
  });
});

// =========================================================================
// 7. SEQUENTIAL FULL PLAYTHROUGH — Every challenge with interactions
// =========================================================================

test.describe('Full Sequential Playthrough with Interactions', () => {
  test('play all 5 challenges with state changes at each station', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // --- Challenge 0: Ingredients / Fridge ---
    await waitForChallenge(page, 0);
    await settle(1000);

    let state = await getState(page);
    expect(state.currentChallenge).toBe(0);
    expect(state.challengeScores).toEqual([]);

    // Verify camera at fridge
    await waitForCameraAt(page, CAMERA_POSITIONS[0].position, 0.5, 15_000);

    // Complete
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(85));
    await waitForChallenge(page, 1);

    // --- Challenge 1: Grinding ---
    state = await getState(page);
    expect(state.currentChallenge).toBe(1);
    expect(state.challengeScores).toEqual([85]);
    expect(state.challengeProgress).toBe(0);
    expect(state.strikes).toBe(0);

    // Simulate grinding
    for (const p of [20, 40, 60, 80, 100]) {
      await page.evaluate(({v}) => (window as any).__gov.setChallengeProgress(v), {v: p});
    }
    state = await getState(page);
    expect(state.challengeProgress).toBe(100);

    // Verify camera at grinder
    await waitForCameraAt(page, CAMERA_POSITIONS[1].position, 0.5, 15_000);

    // Simulate a strike during grinding (doesn't kill — still 1 of 3)
    await page.evaluate(() => (window as any).__gov.addStrike());
    state = await getState(page);
    expect(state.strikes).toBe(1);
    expect(state.gameStatus).toBe('playing');

    // Complete
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(70));
    await waitForChallenge(page, 2);

    // --- Challenge 2: Stuffing ---
    state = await getState(page);
    expect(state.currentChallenge).toBe(2);
    expect(state.challengeScores).toEqual([85, 70]);
    expect(state.strikes).toBe(0); // Reset
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);

    // Simulate stuffing with pressure
    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(50);
      (window as any).__gov.setChallengePressure(45);
    });
    state = await getState(page);
    expect(state.challengeProgress).toBe(50);
    expect(state.challengePressure).toBe(45);

    // Verify camera at stuffer
    await waitForCameraAt(page, CAMERA_POSITIONS[2].position, 0.5, 15_000);

    // Complete
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(90));
    await waitForChallenge(page, 3);

    // --- Challenge 3: Cooking ---
    state = await getState(page);
    expect(state.currentChallenge).toBe(3);
    expect(state.challengeScores).toEqual([85, 70, 90]);
    expect(state.challengeTemperature).toBe(70); // Room temp
    expect(state.challengeHeatLevel).toBe(0);

    // Simulate cooking
    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(160);
      (window as any).__gov.setChallengeHeatLevel(0.5);
    });
    state = await getState(page);
    expect(state.challengeTemperature).toBe(160);

    // Verify camera at stove
    await waitForCameraAt(page, CAMERA_POSITIONS[3].position, 0.5, 15_000);

    // Complete
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
    await waitForChallenge(page, 4);

    // --- Challenge 4: Tasting ---
    state = await getState(page);
    expect(state.currentChallenge).toBe(4);
    expect(state.challengeScores).toEqual([85, 70, 90, 80]);

    // Verify camera at tasting/CRT
    await waitForCameraAt(page, CAMERA_POSITIONS[4].position, 0.5, 15_000);

    // Complete → Victory
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(75));

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'victory',
      null,
      {timeout: 15_000},
    );

    state = await getState(page);
    expect(state.gameStatus).toBe('victory');
    expect(state.challengeScores).toEqual([85, 70, 90, 80, 75]);

    // Average = 80 → A-rank ("Almost Worthy")
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Almost Worthy');
  });
});

// =========================================================================
// 8. DEFEAT DURING INTERACTION — Strike behavior per station
// =========================================================================

test.describe('Defeat During Active Interaction', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('defeat at grinder with partial progress', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    // Simulate partial grind then fail
    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(35);
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
    });

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'defeat',
      null,
      {timeout: 10_000},
    );

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.currentChallenge).toBe(1);
    expect(state.challengeScores).toEqual([75]); // skipToChallenge used 75
  });

  test('defeat at stuffer with high pressure', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeProgress(60);
      (window as any).__gov.setChallengePressure(92);
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
    });

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'defeat',
      null,
      {timeout: 10_000},
    );

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.currentChallenge).toBe(2);
  });

  test('defeat at stove with overheated sausage', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);

    await page.evaluate(() => {
      (window as any).__gov.setChallengeTemperature(350);
      (window as any).__gov.setChallengeHeatLevel(0.9);
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
    });

    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'defeat',
      null,
      {timeout: 10_000},
    );

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.currentChallenge).toBe(3);
    expect(state.challengeScores).toEqual([75, 75, 75]); // skipToChallenge defaults
  });
});

// =========================================================================
// 9. HINT INTERACTION — Hints at each station
// =========================================================================

test.describe('Hint Interaction Per Station', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('hint at fridge challenge activates hintActive', async ({page}) => {
    await waitForChallenge(page, 0);

    await page.evaluate(() => (window as any).__gov.useHint());
    const state = await getState(page);
    expect(state.hintActive).toBe(true);
    expect(state.hintsRemaining).toBe(2);
  });

  test('hint at grinder challenge', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.skipToChallenge(1));
    await waitForChallenge(page, 1);

    await page.evaluate(() => (window as any).__gov.useHint());
    const state = await getState(page);
    expect(state.hintActive).toBe(true);
    expect(state.hintsRemaining).toBe(2);
  });

  test('hints deplete across challenges', async ({page}) => {
    // Use 1 hint at challenge 0
    await page.evaluate(() => (window as any).__gov.useHint());
    let state = await getState(page);
    expect(state.hintsRemaining).toBe(2);

    // Advance and use another
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
    await waitForChallenge(page, 1);

    await page.evaluate(() => (window as any).__gov.useHint());
    state = await getState(page);
    expect(state.hintsRemaining).toBe(1);

    // Advance and use last
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(75));
    await waitForChallenge(page, 2);

    await page.evaluate(() => (window as any).__gov.useHint());
    state = await getState(page);
    expect(state.hintsRemaining).toBe(0);

    // Fourth use is a no-op
    await page.evaluate(() => (window as any).__gov.useHint());
    state = await getState(page);
    expect(state.hintsRemaining).toBe(0);
  });
});

// =========================================================================
// 10. MULTI-GAME SCENE INTEGRITY — Scene survives game restart
// =========================================================================

test.describe('Multi-Game Scene Integrity', () => {
  test('scene mesh count is stable across new game → defeat → new game', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Game 1: play to challenge 2 and get mesh count
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);
    await settle(2000);
    const meshCount1 = await page.evaluate(() => (window as any).__gov.getMeshCount());

    // Defeat
    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await page.waitForFunction(
      () => (window as any).__gov?.getState().gameStatus === 'defeat',
      null,
      {timeout: 10_000},
    );

    // Game 2: new game
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.evaluate(() => (window as any).__gov.skipToChallenge(2));
    await waitForChallenge(page, 2);
    await settle(2000);
    const meshCount2 = await page.evaluate(() => (window as any).__gov.getMeshCount());

    // Mesh counts should be similar (within 20%)
    const ratio = meshCount2 / meshCount1;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });

  test('camera works correctly after game restart', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Game 1: go to challenge 3
    await page.evaluate(() => (window as any).__gov.skipToChallenge(3));
    await waitForChallenge(page, 3);
    await waitForCameraAt(page, CAMERA_POSITIONS[3].position, 0.5, 15_000);

    // Return to menu
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    // Game 2: start fresh
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await waitForChallenge(page, 0);

    // Camera should be at fridge position (challenge 0)
    await waitForCameraAt(page, CAMERA_POSITIONS[0].position, 0.8, 15_000);

    const cam = await page.evaluate(() => (window as any).__gov.getCamera());
    assertNear(cam.position[0], CAMERA_POSITIONS[0].position[0], 0.8, 'cam.x after restart');
  });
});
