/**
 * Meso layer — DONE phase verdict text validation.
 *
 * The DONE phase produces three different SurrealText variants
 * depending on the round/score state:
 *
 *   1. Last round + final score → "...YOU ESCAPED."
 *   2. Score < 50 (any round) → "...YOU ARE MEAT NOW."
 *   3. Score ≥ 50 (intermediate round) → just the score breakdown
 *   4. Final score not yet calculated → "THE VERDICT AWAITS"
 *
 * This test pins each branch via the perception bridge.
 */
import {expect, test, beforeAll, beforeEach} from 'vitest';
import {initDebugInterface} from '../../src/debug/PlaytestGovernor';
import {useGameStore} from '../../src/ecs/hooks';
import {AppTrait, ScoreTrait} from '../../src/ecs/traits';
import {ecsWorld} from '../../src/ecs/kootaWorld';

beforeAll(() => {
  initDebugInterface();
});

beforeEach(() => {
  const s = useGameStore.getState();
  s.setIntroActive(false);
  s.setPosture('standing');
  s.setGamePhase('DONE');
});

function setFinalScore(totalScore: number, breakdown: string) {
  // Find the singleton ScoreTrait entity (always exactly one) and
  // mutate it directly. Goes through the Koota world, not the
  // perception bridge — perception is read-only.
  const ents = ecsWorld.query(ScoreTrait);
  const e = ents[0];
  if (!e) throw new Error('verdict test: no ScoreTrait entity in world');
  e.set(ScoreTrait, {calculated: true, totalScore, breakdown});
}

function ensurePlaying() {
  const ents = ecsWorld.query(AppTrait);
  ents[0]?.set(AppTrait, {appPhase: 'playing'});
}

test('verdict — final round + escape (score ≥ 50)', () => {
  ensurePlaying();
  // Round 3 of 3.
  const s = useGameStore.getState();
  s.setDifficulty('rare', 3);
  s.nextRound(); // 1 → 2
  s.nextRound(); // 2 → 3
  s.setGamePhase('DONE');
  setFinalScore(75, 'Tasty.');

  expect(window.__WIB_DEBUG__?.getCurrentSurrealText()).toContain('YOU ESCAPED.');
});

test('verdict — meat now (score < 50)', () => {
  ensurePlaying();
  const s = useGameStore.getState();
  s.setDifficulty('rare', 3);
  s.setGamePhase('DONE');
  setFinalScore(25, 'Inedible.');

  expect(window.__WIB_DEBUG__?.getCurrentSurrealText()).toContain('YOU ARE MEAT NOW.');
});

test('verdict — intermediate round + decent score (no extra suffix)', () => {
  ensurePlaying();
  const s = useGameStore.getState();
  s.setDifficulty('rare', 3); // round 1 of 3
  s.setGamePhase('DONE');
  setFinalScore(60, 'Edible.');

  const text = window.__WIB_DEBUG__?.getCurrentSurrealText() ?? '';
  expect(text).toContain('SCORE: 60%');
  expect(text).toContain('Edible.');
  expect(text).not.toContain('YOU ARE MEAT NOW');
  expect(text).not.toContain('YOU ESCAPED');
});

test('verdict — uncalculated → "THE VERDICT AWAITS"', () => {
  ensurePlaying();
  // Make sure score.calculated is false. The store reset between
  // tests via `beforeEach` should already do this, but assert
  // explicitly.
  const ents = ecsWorld.query(ScoreTrait);
  ents[0]?.set(ScoreTrait, {calculated: false, totalScore: 0, breakdown: ''});

  expect(window.__WIB_DEBUG__?.getCurrentSurrealText()).toBe('THE VERDICT AWAITS');
});
