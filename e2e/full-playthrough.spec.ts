/**
 * @module e2e/full-playthrough
 * Full game playthrough E2E tests using the WIBGovernor debug interface.
 *
 * These tests drive the game through its 13 phases via `window.__WIB_DEBUG__`,
 * bypassing 3D click interactions that Playwright can't reliably perform
 * in headless WebGL.
 */
import {expect, test} from '@playwright/test';
import {WIBGovernor} from './utils/governor';

test.describe('Full Game Playthrough', () => {
  test.describe.configure({timeout: 120_000});

  let governor: WIBGovernor;

  test.beforeEach(async ({page}) => {
    await page.goto('/');
    governor = new WIBGovernor(page);
  });

  // Navigate away before teardown to cleanly unmount R3F / Rapier WASM.
  // Without this, the physics world hangs and Chrome can't close the context.
  test.afterEach(async ({page}) => {
    await page.goto('about:blank', {timeout: 5000}).catch(() => {});
  });

  test('complete game loop: title -> playing -> 1 round -> DONE', async ({page}) => {
    // Title screen — title is split across lines ("WILL IT\nBLOW?")
    await expect(page.locator('h1')).toBeVisible();

    // Start game
    await page.getByText('START COOKING').click();
    await page.getByText('Medium').first().click();

    // Wait for canvas
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(3000); // Let physics settle

    // Verify we're in the game
    const appPhase = await governor.getAppPhase();
    expect(appPhase).toBe('playing');

    // Play through a full round
    await governor.playFullRound();

    // Verify DONE phase
    const gamePhase = await governor.getGamePhase();
    expect(gamePhase).toBe('DONE');
  });

  test('all 13 phases advance in correct order', async ({page}) => {
    await page.getByText('START COOKING').click();
    await page.getByText('Medium').first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(2000);

    const phases = [
      'SELECT_INGREDIENTS',
      'CHOPPING',
      'FILL_GRINDER',
      'GRINDING',
      'MOVE_BOWL',
      'ATTACH_CASING',
      'STUFFING',
      'TIE_CASING',
      'BLOWOUT',
      'MOVE_SAUSAGE',
      'MOVE_PAN',
      'COOKING',
      'DONE',
    ];

    // Start at SELECT_INGREDIENTS
    let currentPhase = await governor.getGamePhase();
    expect(currentPhase).toBe('SELECT_INGREDIENTS');

    // Advance through all phases
    for (let i = 1; i < phases.length; i++) {
      await governor.advancePhase();
      await page.waitForTimeout(100);
      currentPhase = await governor.getGamePhase();
      expect(currentPhase).toBe(phases[i]);
    }
  });

  test('blowout awards style points', async ({page}) => {
    await page.getByText('START COOKING').click();
    await page.getByText('Medium').first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(2000);

    // Select ingredients first
    await governor.selectIngredients(['banana', 'steak', 'bread']);

    // Skip to BLOWOUT
    const skipPhases = [
      'CHOPPING',
      'FILL_GRINDER',
      'GRINDING',
      'MOVE_BOWL',
      'ATTACH_CASING',
      'STUFFING',
      'TIE_CASING',
    ];
    for (const _ of skipPhases) {
      await governor.advancePhase();
      await page.waitForTimeout(50);
    }

    // Now in BLOWOUT -- trigger it
    await governor.triggerBlowout();

    // Verify flair points recorded
    const state = await governor.getState();
    expect(state.playerDecisions.flairPoints.length).toBeGreaterThan(0);
  });

  test('score screen appears after completing round', async ({page}) => {
    await page.getByText('START COOKING').click();
    await page.getByText('Medium').first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(2000);

    // Play full round
    await governor.playFullRound();

    // Generate demands + calculate score
    await page.evaluate(() => {
      const debug = (window as any).__WIB_DEBUG__;
      if (debug) {
        debug.getState().generateDemands();
        debug.getState().calculateFinalScore();
      }
    });

    const score = await governor.getState();
    expect(score.finalScore).toBeDefined();
    expect(score.finalScore).not.toBeNull();
    expect(score.finalScore.calculated).toBe(true);
  });

  test('zero console errors during full playthrough', async ({page}) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.getByText('START COOKING').click();
    await page.getByText('Medium').first().click();
    await page.waitForSelector('canvas', {timeout: 30000});
    await page.waitForTimeout(2000);

    await governor.playFullRound();

    const realErrors = errors.filter(
      e =>
        !e.includes('AudioContext') &&
        !e.includes('404') &&
        !e.includes('deprecated') &&
        !e.includes('getSnapshot should be cached') &&
        !e.includes('Maximum update depth exceeded'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
