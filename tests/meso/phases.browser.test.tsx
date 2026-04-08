/**
 * Meso layer — phase machine validation.
 *
 * Drives the Koota store through every phase via the debug bridge,
 * confirming the perception bridge produces the right SurrealText
 * for each one. This is the synthetic baseline; the macro layer's
 * Yuka GOAP playthroughs cover the SAME phases via real pointer
 * clicks.
 *
 * Why no `<App />` mount: spinning up the full game scene with
 * `<Physics>` per viewport is expensive AND triggers a Rapier worker
 * race when 4 browser instances mount + unmount in quick succession
 * ("recursive use of an object" panic from the Rust core). The
 * perception bridge is a pure function over ECS state — testing it
 * directly is faster, more reliable, and still proves the
 * underlying contract that the diegetic UI relies on.
 *
 * Per-phase visual rendering is covered by:
 *   - micro layer (per-station component screenshots)
 *   - macro layer Yuka playthrough (full-scene phase strip)
 */
import {expect, test, beforeAll, beforeEach} from 'vitest';
import {initDebugInterface} from '../../src/debug/PlaytestGovernor';
import type {GamePhase} from '../../src/ecs/hooks';
import {useGameStore} from '../../src/ecs/hooks';

beforeAll(() => {
  initDebugInterface();
});

beforeEach(() => {
  const s = useGameStore.getState();
  s.setIntroActive(false);
  s.setPosture('standing');
  s.setGamePhase('SELECT_INGREDIENTS');
});

const PHASE_TEXT: Record<GamePhase, string> = {
  SELECT_INGREDIENTS: 'PICK 3 INGREDIENTS',
  CHOPPING: 'CHOP IT UP',
  FILL_GRINDER: 'FEED THE GRINDER',
  GRINDING: 'GRIND IT DOWN',
  MOVE_BOWL: 'TAKE IT TO THE STUFFER',
  ATTACH_CASING: 'PREPARE THE CASING',
  STUFFING: 'STUFF THE CASING',
  TIE_CASING: 'TIE IT OFF',
  BLOWOUT: 'WILL IT BLOW?',
  MOVE_SAUSAGE: 'TO THE STOVE',
  MOVE_PAN: 'TIME TO COOK',
  COOKING: "DON'T LET IT BURN",
  DONE: 'THE VERDICT AWAITS',
};

const ALL_PHASES = Object.keys(PHASE_TEXT) as GamePhase[];

test('every phase produces its expected SurrealText', () => {
  for (const phase of ALL_PHASES) {
    useGameStore.getState().setGamePhase(phase);
    expect(window.__WIB_DEBUG__?.getCurrentSurrealText(), `phase ${phase}`).toBe(
      PHASE_TEXT[phase],
    );
  }
});

test('every phase exposes its active station(s) via the perception bridge', () => {
  const expectedStations: Partial<Record<GamePhase, string[]>> = {
    SELECT_INGREDIENTS: ['PhysicsFreezerChest'],
    CHOPPING: ['ChoppingBlock'],
    FILL_GRINDER: ['Grinder'],
    GRINDING: ['Grinder'],
    MOVE_BOWL: ['Stuffer'],
    ATTACH_CASING: ['Stuffer'],
    STUFFING: ['Stuffer'],
    TIE_CASING: ['Stuffer'],
    BLOWOUT: ['BlowoutStation'],
    MOVE_SAUSAGE: ['TV'],
    MOVE_PAN: ['Stove'],
    COOKING: ['Stove'],
  };

  for (const [phase, stations] of Object.entries(expectedStations) as Array<
    [GamePhase, string[]]
  >) {
    useGameStore.getState().setGamePhase(phase);
    const snapshot = window.__WIB_DEBUG__?.getPerception();
    expect(snapshot?.activeStations, `phase ${phase}`).toEqual(stations);
  }
});

test('advancePhase walks the state machine to DONE in 12 steps', () => {
  expect(useGameStore.getState().gamePhase).toBe('SELECT_INGREDIENTS');
  for (let i = 0; i < 12; i += 1) {
    window.__WIB_DEBUG__?.actions.advancePhase();
  }
  expect(useGameStore.getState().gamePhase).toBe('DONE');
});

test('advancePhase past DONE is a no-op (no off-by-one crash)', () => {
  useGameStore.getState().setGamePhase('DONE');
  window.__WIB_DEBUG__?.actions.advancePhase();
  window.__WIB_DEBUG__?.actions.advancePhase();
  expect(useGameStore.getState().gamePhase).toBe('DONE');
});
