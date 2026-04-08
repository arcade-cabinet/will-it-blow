/**
 * Self-test for the Yuka GOAP governor — drives the full 13-phase
 * round to DONE without mounting the 3D scene. Validates the
 * perceive → select-goal → execute → settle loop end-to-end.
 *
 * The "happy" run uses the standard `CompleteRoundGoal` and asserts
 * the round reaches DONE in under the tick budget. The "hostile"
 * run flips the cook step to under-cooking and asserts the round
 * still terminates (the AI player doesn't get stuck).
 */
import {expect, test, beforeAll, beforeEach} from 'vitest';
import {initDebugInterface} from '../../../../src/debug/PlaytestGovernor';
import {useGameStore} from '../../../../src/ecs/hooks';
import {GoapGovernor} from '../GoapGovernor';

beforeAll(() => {
  initDebugInterface();
});

beforeEach(() => {
  const s = useGameStore.getState();
  s.setIntroActive(false);
  s.setPosture('standing');
  s.setGamePhase('SELECT_INGREDIENTS');
});

test('GoapGovernor (happy path) reaches DONE in under 30 seconds', async () => {
  const governor = new GoapGovernor();
  const result = await governor.playFullRound();
  expect(result.succeeded, `final phase: ${result.finalPhase}`).toBe(true);
  expect(result.finalPhase).toBe('DONE');
  expect(result.ticks).toBeGreaterThan(0);
  expect(result.totalMs).toBeLessThan(30_000);
});

test('GoapGovernor logs every goal it ran', async () => {
  const governor = new GoapGovernor();
  const result = await governor.playFullRound();
  expect(result.log.length).toBeGreaterThan(0);
  // Sanity-check that we exercised the full pipeline.
  const goalNames = new Set(result.log.map(r => r.goalName));
  expect(goalNames).toContain('SelectIngredientsGoal');
  expect(goalNames).toContain('ChopGoal');
  expect(goalNames).toContain('CookGoal');
});

test('GoapGovernor (hostile) under-cooks but still reaches DONE', async () => {
  const governor = new GoapGovernor({hostile: true});
  const result = await governor.playFullRound();
  expect(result.succeeded).toBe(true);
  // The hostile run should have used UnderCookGoal in place of CookGoal.
  const goalNames = new Set(result.log.map(r => r.goalName));
  expect(goalNames).toContain('UnderCookGoal');
  expect(goalNames).not.toContain('CookGoal');
});

test('GoapGovernor onTick callback fires once per tick', async () => {
  let count = 0;
  const governor = new GoapGovernor({
    onTick: () => {
      count += 1;
    },
  });
  const result = await governor.playFullRound();
  expect(count).toBe(result.log.length);
  expect(count).toBeGreaterThan(0);
});
