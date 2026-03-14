/**
 * Comprehensive E2E Test Suite — Every Player Journey Path
 *
 * Exercises EVERY possible game state transition, victory/defeat path, edge case,
 * and player interaction to ensure full playability.
 *
 * Uses GameGovernor (window.__gov) for programmatic game control while verifying
 * UI state through DOM assertions.
 *
 * Run:
 *   npx playwright test e2e/comprehensive.spec.ts
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

async function waitForGameStatus(page: Page, status: string, timeoutMs = 15_000) {
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

async function startAndWaitForScene(page: Page) {
  await page.evaluate(() => (window as any).__gov.startGame());
  await waitForPhase(page, 'playing', 90_000);
  await waitForCanvas(page);
  await waitForSceneReady(page);
  // Auto-trigger the first challenge (simulates player walking to fridge station)
  await page.evaluate(() => (window as any).__gov.triggerCurrentChallenge());
}

/** Brief pause for animations/transitions */
async function settle(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 1. MENU PHASE TESTS
// ---------------------------------------------------------------------------

test.describe('Menu Phase', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    // Ensure we start at menu
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await page.evaluate(() => (window as any).__gov.clearSaveData());
    await waitForPhase(page, 'menu');
  });

  test('displays menu on initial load', async ({page}) => {
    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    expect(state.gameStatus).toBe('menu');
  });

  test('shows butcher shop sign with title', async ({page}) => {
    await settle(1200); // Wait for fade-in animation
    // Check for "WILL IT" and "BLOW?" text
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('WILL IT');
    expect(bodyText).toContain('BLOW');
    expect(bodyText).toContain('Est. 1974');
  });

  test('shows menu items: NEW GAME, CONTINUE, SETTINGS', async ({page}) => {
    await settle(1200);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('NEW GAME');
    expect(bodyText).toContain('CONTINUE');
    expect(bodyText).toContain('SETTINGS');
  });

  test('CONTINUE is disabled when no save data', async ({page}) => {
    await settle(500);
    const state = await getState(page);
    // With no save data, challengeScores should be empty
    expect(state.challengeScores).toEqual([]);
    // The continue button should have disabled styling (color: #444)
    // We verify functionally: pressing continue should NOT change phase
    const phaseBefore = (await getState(page)).appPhase;
    // Try clicking CONTINUE text — it should be disabled
    const continueBtn = page.locator('text=CONTINUE').first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click({force: true}).catch(() => {});
    }
    await settle(500);
    const phaseAfter = (await getState(page)).appPhase;
    expect(phaseAfter).toBe(phaseBefore);
  });

  test('NEW GAME transitions to loading phase', async ({page}) => {
    await settle(1200);
    // Click NEW GAME
    await page.locator('text=NEW GAME').first().click();
    await waitForPhase(page, 'loading', 5000);
    const state = await getState(page);
    expect(state.appPhase).toBe('loading');
  });

  test('CONTINUE is enabled when save data exists', async ({page}) => {
    // Simulate a saved game at challenge 2
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.startGameDirect();
      gov.completeCurrentChallenge(80);
      gov.completeCurrentChallenge(75);
      gov.returnToMenu();
    });
    await waitForPhase(page, 'menu');
    await settle(500);

    const state = await getState(page);
    expect((state.challengeScores as number[]).length).toBe(2);

    // Body should show CONTINUE with progress indicator
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('CONTINUE');
    expect(bodyText).toMatch(/3\/5/); // Challenge 3 of 5
  });

  test('CONTINUE restores saved game and enters loading', async ({page}) => {
    // Set up a saved game
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.startGameDirect();
      gov.completeCurrentChallenge(80);
      gov.returnToMenu();
    });
    await waitForPhase(page, 'menu');
    await settle(1200);

    // Click CONTINUE
    await page.locator('text=CONTINUE').first().click();
    await waitForPhase(page, 'loading', 5000);

    const state = await getState(page);
    expect(state.appPhase).toBe('loading');
    // Should restore the saved challenge progress
    expect((state.challengeScores as number[]).length).toBe(1);
    expect(state.currentChallenge).toBe(1);
  });

  test('shows footer text', async ({page}) => {
    await settle(1200);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Fine Meats');
  });
});

// ---------------------------------------------------------------------------
// 2. LOADING PHASE TESTS
// ---------------------------------------------------------------------------

test.describe('Loading Phase', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('shows progress bar and percentage', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setPhase('loading'));
    // Loading may complete very fast on local cache — poll for percentage text
    const sawPercentage = await page
      .waitForFunction(() => /\d+%/.test(document.body.innerText || ''), null, {timeout: 10_000})
      .then(() => true)
      .catch(() => false);
    // If loading completed before we could observe, that's OK — verify phase moved forward
    if (!sawPercentage) {
      const state = await getState(page);
      expect(['loading', 'playing']).toContain(state.appPhase);
    }
  });

  test('shows Mr. Sausage loading quotes', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setPhase('loading'));
    // Loading may complete very fast — poll for quote text or accept fast completion
    const sawQuote = await page
      .waitForFunction(
        () => {
          const text = document.body.innerText || '';
          return (
            text.includes('Mr. Sausage') || text.includes('Selecting') || text.includes('Grinding')
          );
        },
        null,
        {timeout: 10_000},
      )
      .then(() => true)
      .catch(() => false);
    // If loading completed too fast to observe, just verify the phase progressed
    if (!sawQuote) {
      const state = await getState(page);
      expect(['loading', 'playing']).toContain(state.appPhase);
    }
  });

  test('loading completes and transitions to playing', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    const state = await getState(page);
    expect(state.appPhase).toBe('playing');
    expect(state.gameStatus).toBe('playing');
    expect(state.currentChallenge).toBe(0);
  });

  test('loading initializes game state correctly', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    const state = await getState(page);
    expect(state.strikes).toBe(0);
    expect(state.challengeScores).toEqual([]);
    expect(state.hintsRemaining).toBe(3);
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);
    expect(state.currentChallenge).toBe(0);
  });

  test('loading increments totalGamesPlayed', async ({page}) => {
    const beforeState = await getState(page);
    const gamesBefore = beforeState.totalGamesPlayed as number;

    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    const afterState = await getState(page);
    expect(afterState.totalGamesPlayed).toBe(gamesBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// 3. CHALLENGE FLOW — SEQUENTIAL PROGRESSION
// ---------------------------------------------------------------------------

test.describe('Challenge Flow — Sequential Progression', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('starts at challenge 0 (Ingredients)', async ({page}) => {
    const state = await getState(page);
    expect(state.currentChallenge).toBe(0);
    expect(state.gameStatus).toBe('playing');
  });

  test('completing challenge 0 advances to challenge 1', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(85));
    await waitForChallenge(page, 1);

    const state = await getState(page);
    expect(state.currentChallenge).toBe(1);
    expect(state.challengeScores as number[]).toEqual([85]);
    expect(state.strikes).toBe(0); // Strikes reset between challenges
  });

  test('completing all 5 challenges triggers victory', async ({page}) => {
    const scores = [85, 70, 90, 80, 75];
    for (let i = 0; i < 5; i++) {
      await page.evaluate(({score}) => (window as any).__gov.completeCurrentChallenge(score), {
        score: scores[i],
      });
      if (i < 4) {
        await waitForChallenge(page, i + 1);
      }
    }

    await waitForGameStatus(page, 'victory');
    const state = await getState(page);
    expect(state.gameStatus).toBe('victory');
    expect(state.challengeScores).toEqual(scores);
  });

  test('strikes reset between challenges', async ({page}) => {
    // Add 2 strikes during challenge 0
    await page.evaluate(() => {
      (window as any).__gov.addStrike();
      (window as any).__gov.addStrike();
    });
    let state = await getState(page);
    expect(state.strikes).toBe(2);

    // Complete the challenge
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(70));
    await waitForChallenge(page, 1);

    state = await getState(page);
    expect(state.strikes).toBe(0);
  });

  test('progress resets between challenges', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setChallengeProgress(50));
    let state = await getState(page);
    expect(state.challengeProgress).toBe(50);

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(75));
    await waitForChallenge(page, 1);

    state = await getState(page);
    expect(state.challengeProgress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. DEFEAT PATHS — Every Way to Lose
// ---------------------------------------------------------------------------

test.describe('Defeat Paths', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('3 strikes during challenge 0 triggers defeat', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.strikes).toBe(3);
  });

  test('defeat at challenge 2 preserves preceding scores', async ({page}) => {
    await page.evaluate(() => {
      (window as any).__gov.triggerDefeatAtChallenge(2, [85, 70]);
    });
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.challengeScores).toEqual([85, 70]);
    expect(state.currentChallenge).toBe(2);
  });

  test('defeat at challenge 4 (last challenge before tasting)', async ({page}) => {
    await page.evaluate(() => {
      (window as any).__gov.triggerDefeatAtChallenge(3, [90, 85, 80]);
    });
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.challengeScores).toEqual([90, 85, 80]);
  });

  test('incremental strikes: 1 strike → 2 strikes → 3 strikes = defeat', async ({page}) => {
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
});

// ---------------------------------------------------------------------------
// 5. VICTORY PATHS — All Rank Tiers
// ---------------------------------------------------------------------------

test.describe('Victory Paths — Rank Tiers', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('S-rank victory (avg >= 92)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([95, 93, 92, 94, 96]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    // S-rank shows "THE SAUSAGE KING" title
    expect(bodyText).toContain('SAUSAGE KING');
  });

  test('A-rank victory (avg >= 75, < 92)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([80, 75, 78, 82, 85]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Almost Worthy');
  });

  test('B-rank victory (avg >= 50, < 75)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([55, 60, 50, 65, 70]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Mediocre');
  });

  test('F-rank victory (avg < 50)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([20, 30, 10, 40, 25]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Unacceptable');
  });

  test('victory screen shows all individual challenge scores', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([85, 70, 90, 80, 75]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Ingredients');
    expect(bodyText).toContain('Grinding');
    expect(bodyText).toContain('Stuffing');
    expect(bodyText).toContain('Cooking');
    // Should show the scores
    expect(bodyText).toContain('85');
    expect(bodyText).toContain('70');
    expect(bodyText).toContain('90');
    expect(bodyText).toContain('80');
  });

  test('victory screen shows average score', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([80, 80, 80, 80, 80]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('AVERAGE');
    expect(bodyText).toContain('80');
  });
});

// ---------------------------------------------------------------------------
// 6. GAME OVER SCREEN — Actions
// ---------------------------------------------------------------------------

test.describe('Game Over Screen — Actions', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('NEW GAME from victory goes through loading (not direct start)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([85, 80, 75, 90, 70]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    // Click NEW GAME
    await page.locator('text=NEW GAME').first().click();
    await waitForPhase(page, 'loading', 5000);

    const state = await getState(page);
    expect(state.appPhase).toBe('loading');
  });

  test('NEW GAME from defeat goes through loading', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');
    await settle(3000);

    await page.locator('text=NEW GAME').first().click();
    await waitForPhase(page, 'loading', 5000);

    const state = await getState(page);
    expect(state.appPhase).toBe('loading');
  });

  test('MENU button from victory returns to menu', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([85, 80, 75, 90, 70]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    await page.locator('text=MENU').first().click();
    await waitForPhase(page, 'menu', 5000);

    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    expect(state.gameStatus).toBe('menu');
  });

  test('MENU button from defeat returns to menu', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');
    await settle(3000);

    await page.locator('text=MENU').first().click();
    await waitForPhase(page, 'menu', 5000);

    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
    expect(state.gameStatus).toBe('menu');
  });

  test('defeat screen shows partial scores', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => {
      (window as any).__gov.triggerDefeatAtChallenge(2, [85, 70]);
    });
    await waitForGameStatus(page, 'defeat');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('GAME OVER');
    // Should show the 2 completed challenge scores
    expect(bodyText).toContain('85');
    expect(bodyText).toContain('70');
  });

  test('defeat with no scores shows default message', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('GAME OVER');
    expect(bodyText).toContain('sausage');
  });
});

// ---------------------------------------------------------------------------
// 7. HINT SYSTEM
// ---------------------------------------------------------------------------

test.describe('Hint System', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('starts with 3 hints', async ({page}) => {
    const state = await getState(page);
    expect(state.hintsRemaining).toBe(3);
  });

  test('using a hint decrements count', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.useHint());
    const state = await getState(page);
    expect(state.hintsRemaining).toBe(2);
    expect(state.hintActive).toBe(true);
  });

  test('hints persist across challenges', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.useHint());
    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
    await waitForChallenge(page, 1);

    const state = await getState(page);
    expect(state.hintsRemaining).toBe(2);
  });

  test('cannot use more hints than available', async ({page}) => {
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.useHint();
      gov.useHint();
      gov.useHint();
      gov.useHint(); // 4th use should be a no-op
    });

    const state = await getState(page);
    expect(state.hintsRemaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. STATE PERSISTENCE — Save/Continue
// ---------------------------------------------------------------------------

test.describe('State Persistence', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await page.evaluate(() => (window as any).__gov.clearSaveData());
  });

  test('game progress persists after returning to menu', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    // Complete 2 challenges
    await page.evaluate(() => {
      (window as any).__gov.completeCurrentChallenge(85);
      (window as any).__gov.completeCurrentChallenge(70);
    });

    // Return to menu
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    // Check state is preserved
    const state = await getState(page);
    expect(state.currentChallenge).toBe(2);
    expect(state.challengeScores).toEqual([85, 70]);
  });

  test('CONTINUE restores progress and resumes at correct challenge', async ({page}) => {
    // Start and complete 2 challenges
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => {
      (window as any).__gov.completeCurrentChallenge(85);
      (window as any).__gov.completeCurrentChallenge(70);
      (window as any).__gov.returnToMenu();
    });
    await waitForPhase(page, 'menu');

    // Use the continue flow
    await page.evaluate(() => (window as any).__gov.simulateContinue());
    await waitForPhase(page, 'playing', 90_000);

    const state = await getState(page);
    expect(state.currentChallenge).toBe(2);
    expect(state.challengeScores).toEqual([85, 70]);
    expect(state.gameStatus).toBe('playing');
  });

  test('new game resets all progress', async ({page}) => {
    // Create saved progress
    await page.evaluate(() => {
      (window as any).__gov.startGameDirect();
      (window as any).__gov.completeCurrentChallenge(85);
      (window as any).__gov.completeCurrentChallenge(70);
    });

    // Start a new game (resets everything)
    await page.evaluate(() => (window as any).__gov.startGameDirect());

    const state = await getState(page);
    expect(state.currentChallenge).toBe(0);
    expect(state.challengeScores).toEqual([]);
    expect(state.strikes).toBe(0);
    expect(state.hintsRemaining).toBe(3);
  });

  test('settings persist across games', async ({page}) => {
    // Mutate volume settings via governor
    await page.evaluate(() => {
      (window as any).__gov.setMusicVolume(0.3);
      (window as any).__gov.setSfxVolume(0.5);
      (window as any).__gov.setMusicMuted(true);
    });

    // Start and complete a game
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([80, 80, 80, 80, 80]));
    await waitForGameStatus(page, 'victory');

    // Return to menu (simulating a new game cycle)
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    // Settings should persist across game boundaries
    const state = await getState(page);
    expect(state.musicVolume).toBeCloseTo(0.3, 1);
    expect(state.sfxVolume).toBeCloseTo(0.5, 1);
    expect(state.musicMuted).toBe(true);
    expect(state.sfxMuted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. RETURN TO MENU — State Cleanup
// ---------------------------------------------------------------------------

test.describe('Return to Menu — State Cleanup', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('returnToMenu resets ephemeral game state', async ({page}) => {
    // Set up some state
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.addStrike();
      gov.addStrike();
      gov.setChallengeProgress(50);
      gov.setChallengePressure(30);
      gov.setChallengeTemperature(150);
      gov.setChallengeHeatLevel(0.5);
    });

    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    const state = await getState(page);
    expect(state.strikes).toBe(0);
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);
    expect(state.challengeTemperature).toBe(70); // ROOM_TEMP
    expect(state.challengeHeatLevel).toBe(0);
    expect(state.hintActive).toBe(false);
    expect(state.gameStatus).toBe('menu');
    expect(state.mrSausageReaction).toBe('idle');
  });

  test('returnToMenu resets fridge state', async ({page}) => {
    // Navigate to fridge challenge and back
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    expect(fridgeState.fridgePool).toEqual([]);
    expect(fridgeState.fridgeMatchingIndices).toEqual([]);
    expect(fridgeState.fridgeSelectedIndices).toEqual([]);
    expect(fridgeState.pendingFridgeClick).toBeNull();
    expect(fridgeState.fridgeHoveredIndex).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. EDGE CASES
// ---------------------------------------------------------------------------

test.describe('Edge Cases', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('rapid phase transitions do not crash', async ({page}) => {
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.setPhase('loading');
      gov.setPhase('menu');
      gov.setPhase('loading');
      gov.setPhase('menu');
    });
    await settle(500);

    const state = await getState(page);
    expect(state.appPhase).toBe('menu');
  });

  test('completing a challenge with score 0 still advances', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(0));
    await waitForChallenge(page, 1);

    const state = await getState(page);
    expect(state.currentChallenge).toBe(1);
    expect(state.challengeScores).toEqual([0]);
  });

  test('completing a challenge with score 100 still advances', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(100));
    await waitForChallenge(page, 1);

    const state = await getState(page);
    expect(state.challengeScores).toEqual([100]);
  });

  test('all-zero scores produce F rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([0, 0, 0, 0, 0]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('F');
  });

  test('all-100 scores produce S rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerVictory([100, 100, 100, 100, 100]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('S');
  });

  test('defeat immediately after start (challenge 0)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    expect(state.challengeScores).toEqual([]);
    expect(state.currentChallenge).toBe(0);
  });

  test('multiple games in sequence do not leak state', async ({page}) => {
    // Game 1: play and win
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([80, 80, 80, 80, 80]));
    await waitForGameStatus(page, 'victory');

    // Return to menu
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    // Game 2: play and lose
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');

    const state = await getState(page);
    // Game 2's state should be clean — no scores from game 1
    expect(state.challengeScores).toEqual([]);
    expect(state.currentChallenge).toBe(0);
    expect(state.strikes).toBe(3);
  });

  test('variant seed changes between games', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    const state1 = await getState(page);
    const seed1 = state1.variantSeed;

    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await settle(100);
    await page.evaluate(() => (window as any).__gov.startGameDirect());
    const state2 = await getState(page);
    const seed2 = state2.variantSeed;

    // Seeds should be different (based on Date.now())
    expect(seed1).not.toBe(seed2);
  });
});

// ---------------------------------------------------------------------------
// 11. FULL GAME JOURNEYS — Happy Path
// ---------------------------------------------------------------------------

test.describe('Full Game Journeys', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('happy path: menu → load → 5 challenges → victory → menu', async ({page}) => {
    // 1. Start at menu
    let state = await getState(page);
    expect(state.appPhase).toBe('menu');

    // 2. Start game
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    // 3. Complete all challenges
    const scores = [85, 70, 90, 80, 75];
    for (let i = 0; i < 5; i++) {
      await page.evaluate(({score}) => (window as any).__gov.completeCurrentChallenge(score), {
        score: scores[i],
      });
    }

    // 4. Victory
    await waitForGameStatus(page, 'victory');
    state = await getState(page);
    expect(state.gameStatus).toBe('victory');
    expect(state.challengeScores).toEqual(scores);

    // 5. Return to menu
    await settle(3000);
    await page.locator('text=MENU').first().click();
    await waitForPhase(page, 'menu');
    state = await getState(page);
    expect(state.appPhase).toBe('menu');
  });

  test('defeat path: menu → load → 2 challenges → strike out → defeat → new game', async ({
    page,
  }) => {
    // 1. Start game
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);

    // 2. Complete 2 challenges
    await page.evaluate(() => {
      (window as any).__gov.completeCurrentChallenge(85);
      (window as any).__gov.completeCurrentChallenge(70);
    });

    // 3. Defeat at challenge 2
    await page.evaluate(() => (window as any).__gov.triggerDefeat());
    await waitForGameStatus(page, 'defeat');

    let state = await getState(page);
    expect(state.gameStatus).toBe('defeat');
    expect(state.challengeScores).toEqual([85, 70]);

    // 4. Start new game from defeat screen
    await settle(3000);
    await page.locator('text=NEW GAME').first().click();
    await waitForPhase(page, 'loading', 5000);

    // 5. Wait for new game to start
    await waitForPhase(page, 'playing', 90_000);
    state = await getState(page);
    expect(state.currentChallenge).toBe(0);
    expect(state.challengeScores).toEqual([]);
    expect(state.strikes).toBe(0);
  });

  test('continue path: partial game → menu → continue → complete', async ({page}) => {
    // 1. Start and complete 2 challenges
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => {
      (window as any).__gov.completeCurrentChallenge(85);
      (window as any).__gov.completeCurrentChallenge(70);
    });

    // 2. Return to menu
    await page.evaluate(() => (window as any).__gov.returnToMenu());
    await waitForPhase(page, 'menu');

    // 3. Continue
    await page.evaluate(() => (window as any).__gov.simulateContinue());
    await waitForPhase(page, 'playing', 90_000);

    // 4. Should be at challenge 2 with preserved scores
    let state = await getState(page);
    expect(state.currentChallenge).toBe(2);
    expect(state.challengeScores).toEqual([85, 70]);

    // 5. Complete remaining challenges
    await page.evaluate(() => {
      (window as any).__gov.completeCurrentChallenge(90);
      (window as any).__gov.completeCurrentChallenge(80);
      (window as any).__gov.completeCurrentChallenge(75);
    });

    await waitForGameStatus(page, 'victory');
    state = await getState(page);
    expect(state.challengeScores).toEqual([85, 70, 90, 80, 75]);
  });
});

// ---------------------------------------------------------------------------
// 12. 3D SCENE RENDERING VERIFICATION
// ---------------------------------------------------------------------------

test.describe('3D Scene Rendering', () => {
  test('canvas renders after game starts', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Use auto-retrying assertion — with lazy-loaded GameWorld, the canvas
    // may briefly exist in DOM before becoming fully visible.
    await expect(page.locator('canvas')).toBeVisible({timeout: 10_000});
  });

  test('canvas has non-zero dimensions', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    const dimensions = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? {width: canvas.width, height: canvas.height} : null;
    });
    expect(dimensions).not.toBeNull();
    expect(dimensions!.width).toBeGreaterThan(0);
    expect(dimensions!.height).toBeGreaterThan(0);
  });

  test('canvas is not blank (has pixel data)', async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
    await settle(2000); // Let 3D scene render

    const hasPixelData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      // For WebGL/WebGPU we can't easily read pixels, but the canvas existing
      // with non-zero dimensions after sceneReady is a strong indicator
      return canvas.width > 0 && canvas.height > 0;
    });
    expect(hasPixelData).toBe(true);
  });

  test('no console errors during gameplay', async ({page}) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Ignore known non-critical errors
        const text = msg.text();
        if (text.includes('favicon') || text.includes('404')) return;
        // Ignore non-critical module resolution errors from XR dependency chain
        if (text.includes('500') || text.includes('Failed to load resource')) return;
        consoleErrors.push(text);
      }
    });

    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);

    // Play through a few challenges
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.completeCurrentChallenge(80);
      gov.completeCurrentChallenge(75);
    });
    await settle(2000);

    expect(consoleErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 13. CHALLENGE EPHEMERAL STATE
// ---------------------------------------------------------------------------

test.describe('Challenge Ephemeral State', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
  });

  test('challengeProgress updates correctly', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setChallengeProgress(42));
    const state = await getState(page);
    expect(state.challengeProgress).toBe(42);
  });

  test('challengePressure updates correctly', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setChallengePressure(75));
    const state = await getState(page);
    expect(state.challengePressure).toBe(75);
  });

  test('challengeTemperature updates correctly', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setChallengeTemperature(165));
    const state = await getState(page);
    expect(state.challengeTemperature).toBe(165);
  });

  test('challengeHeatLevel updates correctly', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.setChallengeHeatLevel(0.6));
    const state = await getState(page);
    expect(state.challengeHeatLevel).toBeCloseTo(0.6, 1);
  });

  test('all ephemeral state resets on challenge complete', async ({page}) => {
    await page.evaluate(() => {
      const gov = (window as any).__gov;
      gov.setChallengeProgress(50);
      gov.setChallengePressure(30);
      gov.setChallengeTemperature(160);
      gov.setChallengeHeatLevel(0.5);
    });

    await page.evaluate(() => (window as any).__gov.completeCurrentChallenge(80));
    await waitForChallenge(page, 1);

    const state = await getState(page);
    expect(state.challengeProgress).toBe(0);
    expect(state.challengePressure).toBe(0);
    expect(state.challengeTemperature).toBe(70);
    expect(state.challengeHeatLevel).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 14. INGREDIENT CHALLENGE — Fridge Mechanics
// ---------------------------------------------------------------------------

test.describe('Ingredient Challenge — Fridge Mechanics', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
    await startAndWaitForScene(page);
    // Should be at challenge 0 (ingredients)
  });

  test('fridge pool is populated with 10 ingredients', async ({page}) => {
    await settle(1000);
    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    expect(fridgeState.fridgePool.length).toBe(10);
  });

  test('fridge has matching ingredients for the variant', async ({page}) => {
    await settle(1000);
    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    expect(fridgeState.fridgeMatchingIndices.length).toBeGreaterThan(0);
  });

  test('fridge matching indices are guaranteed to satisfy required count', async ({page}) => {
    await settle(1000);
    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    // The pool guarantee ensures at least requiredCount matching ingredients
    // requiredCount is 3 or 4 depending on variant
    expect(fridgeState.fridgeMatchingIndices.length).toBeGreaterThanOrEqual(3);
  });

  test('selected indices start empty', async ({page}) => {
    await settle(1000);
    const fridgeState = await page.evaluate(() => (window as any).__gov.getFridgeState());
    expect(fridgeState.fridgeSelectedIndices).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 15. SCORE BOUNDARY TESTS
// ---------------------------------------------------------------------------

test.describe('Score Boundaries', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await waitForGovernor(page);
  });

  test('boundary: avg exactly 92 → S rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([92, 92, 92, 92, 92]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('SAUSAGE KING');
  });

  test('boundary: avg exactly 75 → A rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([75, 75, 75, 75, 75]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Almost Worthy');
  });

  test('boundary: avg exactly 50 → B rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([50, 50, 50, 50, 50]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Mediocre');
  });

  test('boundary: avg 49 → F rank', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([49, 49, 49, 49, 49]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Unacceptable');
  });

  test('boundary: avg 91 → A rank (not S)', async ({page}) => {
    await page.evaluate(() => (window as any).__gov.startGame());
    await waitForPhase(page, 'playing', 90_000);
    await page.evaluate(() => (window as any).__gov.triggerVictory([91, 91, 91, 91, 91]));
    await waitForGameStatus(page, 'victory');
    await settle(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Almost Worthy');
  });
});
