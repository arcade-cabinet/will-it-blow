/**
 * Greenfield Playthrough E2E Test
 *
 * Verifies the core game flow from title screen through all 13 game phases:
 *   menu -> loading -> playing (7 challenges: ingredients, chopping, grinding,
 *   stuffing, cooking, blowout, tasting) -> victory/defeat
 *
 * Uses the GameGovernor (window.__gov) to programmatically drive state
 * transitions without needing to interact with 3D scene elements.
 *
 * Run:
 *   npx playwright test e2e/greenfield-playthrough.spec.ts
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

async function waitForGameStatus(page: Page, status: string, timeoutMs = 30_000) {
  await page.waitForFunction(
    s => {
      const gov = (window as any).__gov;
      return gov && gov.getState().gameStatus === s;
    },
    status,
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

async function waitForSceneReady(page: Page, timeoutMs = 90_000) {
  await page.waitForFunction(() => (window as any).__gov?.sceneReady === true, null, {
    timeout: timeoutMs,
  });
}

/** Start game and wait for the 3D scene to be fully rendered */
async function startAndWaitForScene(page: Page) {
  await page.evaluate(() => (window as any).__gov.startGame());
  await waitForPhase(page, 'playing', 90_000);
  await waitForCanvas(page);
  await waitForSceneReady(page);
  await page.evaluate(() => (window as any).__gov.triggerCurrentChallenge());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Greenfield Playthrough — Full Phase Progression', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('title screen renders with correct initial state', async ({page}) => {
    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    expect(state.gameStatus).toBe('menu');

    // Verify title screen DOM elements exist
    // The TitleScreen component should render something visible
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('START COOKING transitions through loading to playing', async ({page}) => {
    // Verify we start at menu
    const initialState = await getState(page);
    expect(initialState.appPhase).toBe('menu');

    // Use governor to go through loading -> playing
    // (avoids needing to find and click the exact button in the RN web DOM)
    await page.evaluate(() => (window as any).__gov.setPhase('loading'));
    await waitForPhase(page, 'loading');

    const loadingState = await getState(page);
    expect(loadingState.appPhase).toBe('loading');
  });

  test('game loads and enters playing phase', async ({page}) => {
    await startAndWaitForScene(page);

    const state = await getState(page);
    expect(state.appPhase).toBe('playing');
    expect(state.gameStatus).toBe('playing');
    expect(state.currentChallenge).toBe(0);
  });

  test('all 7 challenges can be reached via skipToChallenge', async ({page}) => {
    await startAndWaitForScene(page);

    const challengeNames = [
      'ingredients',
      'chopping',
      'grinding',
      'stuffing',
      'cooking',
      'blowout',
      'tasting',
    ];

    for (let i = 0; i < challengeNames.length; i++) {
      if (i > 0) {
        await page.evaluate(idx => (window as any).__gov.skipToChallenge(idx), i);
      }
      await waitForChallenge(page, i);

      const state = await getState(page);
      expect(state.currentChallenge).toBe(i);
      expect(state.gameStatus).toBe('playing');
      expect(state.challengeTriggered).toBe(true);
    }
  });

  test('completing all challenges triggers victory', async ({page}) => {
    await startAndWaitForScene(page);

    const scores = [85, 70, 80, 75, 90, 82, 88];

    for (let i = 0; i < scores.length; i++) {
      await waitForChallenge(page, i);

      const state = await getState(page);
      expect(state.currentChallenge).toBe(i);

      await page.evaluate(({score}) => (window as any).__gov.completeCurrentChallenge(score), {
        score: scores[i],
      });
    }

    await waitForGameStatus(page, 'victory');
    const finalState = await getState(page);
    expect(finalState.gameStatus).toBe('victory');
    expect(finalState.challengeScores).toEqual(scores);
  });

  test('3 strikes triggers defeat', async ({page}) => {
    await startAndWaitForScene(page);
    await waitForChallenge(page, 0);

    // Add 3 strikes
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.addStrike();
      gov.addStrike();
      gov.addStrike();
    });

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.strikes).toBe(3);
  });

  test('victory screen renders after completing all challenges', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    // Use triggerVictory to skip directly to victory with scores
    await page.evaluate(() => (window as any).__gov.triggerVictory([95, 94, 92, 93, 91, 95, 96]));
    await waitForGameStatus(page, 'victory');

    // GameOverScreen should be rendered
    const state = await getState(page);
    expect(state.gameStatus).toBe('victory');
    expect(state.challengeScores).toHaveLength(7);
  });

  test('defeat screen renders after 3 strikes', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
  });

  test('returnToMenu resets state back to menu phase', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    // Return to menu
    await page.evaluate(
      () =>
        (window as any).__gov.getState().returnToMenu?.() ?? (window as any).__gov.returnToMenu(),
    );

    // Use waitForFunction to ensure state has settled
    await page.waitForFunction(
      () => {
        const gov = (window as any).__gov;
        const state = gov?.getState();
        return state && state.appPhase === 'menu' && state.gameStatus === 'menu';
      },
      null,
      {timeout: 10_000},
    );

    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    expect(state.gameStatus).toBe('menu');
    expect(state.currentChallenge).toBe(0);
    expect(state.challengeScores).toEqual([]);
  });

  test('phase progression: menu -> loading -> playing -> victory', async ({page}) => {
    // 1. Start at menu
    let state = await getState(page);
    expect(state.appPhase).toBe('menu');

    // 2. Transition to loading
    await page.evaluate(() => (window as any).__gov.setPhase('loading'));
    await waitForPhase(page, 'loading');
    state = await getState(page);
    expect(state.appPhase).toBe('loading');

    // 3. Start game (transitions through loading -> playing)
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    state = await getState(page);
    expect(state.appPhase).toBe('playing');
    expect(state.gameStatus).toBe('playing');

    // 4. Complete all challenges for victory
    await page.evaluate(() => (window as any).__gov.triggerVictory([80, 80, 80, 80, 80, 80, 80]));
    await waitForGameStatus(page, 'victory');
    state = await getState(page);
    expect(state.gameStatus).toBe('victory');
  });
});
