/**
 * Macro layer — synthetic playthrough.
 *
 * Drives the GOAP governor end-to-end on the running Koota store
 * (no `<App />` mount) to validate that the AI player can navigate
 * the entire 13-phase round logic. This is the regression baseline
 * for the GOAP machinery itself; the heavier "real Yuka clicks"
 * macros mount the full `<App />` and run the same governor against
 * a live `<Canvas>`.
 *
 * Why split: mounting the full `<App />` triggers Rapier under
 * Vitest browser mode and was crashing the test runner under the
 * 4-viewport matrix (see `tests/meso/phases.browser.test.tsx`
 * comment). The synthetic macro confirms the governor logic; the
 * full-app macros confirm rendering/integration in dedicated
 * single-viewport runs.
 */
import {beforeAll, beforeEach, expect, test} from 'vitest';
import {initDebugInterface} from '../../src/debug/PlaytestGovernor';
import {useGameStore} from '../../src/ecs/hooks';
import {GoapGovernor} from '../harness/goap/GoapGovernor';

beforeAll(() => {
  initDebugInterface();
});

beforeEach(() => {
  const s = useGameStore.getState();
  s.setIntroActive(false);
  s.setPosture('standing');
  s.setGamePhase('SELECT_INGREDIENTS');
});

test('macro:synthetic — happy round reaches DONE in under 30s', async () => {
  const governor = new GoapGovernor();
  const result = await governor.playFullRound();
  expect(result.succeeded).toBe(true);
  expect(result.finalPhase).toBe('DONE');
});

test('macro:synthetic — hostile round (under-cook) still completes', async () => {
  const governor = new GoapGovernor({hostile: true});
  const result = await governor.playFullRound();
  expect(result.succeeded).toBe(true);
});

test('macro:synthetic — governor logs all 13 phase transitions', async () => {
  const seen = new Set<string>();
  const governor = new GoapGovernor({
    onTick: r => seen.add(r.phase),
  });
  await governor.playFullRound();

  // All 13 phases (minus DONE which is the terminal state) should
  // have been observed at least once during the playthrough.
  for (const phase of [
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
  ]) {
    expect(seen, `phase ${phase} should appear in tick log`).toContain(phase);
  }
});

test('macro:synthetic — multiple back-to-back rounds work without state bleed', async () => {
  // Round 1
  const r1 = await new GoapGovernor().playFullRound();
  expect(r1.finalPhase).toBe('DONE');

  // Reset to a fresh round for the next playthrough.
  const s = useGameStore.getState();
  s.startNewGame();
  s.setIntroActive(false);
  s.setPosture('standing');

  // Round 2
  const r2 = await new GoapGovernor().playFullRound();
  expect(r2.finalPhase).toBe('DONE');

  // Both runs should have completed cleanly.
  expect(r1.ticks).toBeGreaterThan(0);
  expect(r2.ticks).toBeGreaterThan(0);
});
