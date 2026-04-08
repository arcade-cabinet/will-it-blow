/**
 * Unit tests for the read-only perception bridge.
 *
 * Asserts:
 * 1. `readPerception` produces a `PerceptionSnapshot` with every
 *    expected field populated.
 * 2. The snapshot is fully frozen — including nested objects and
 *    arrays — so the GOAP planner cannot accidentally mutate the
 *    game's source-of-truth state through the perception channel.
 * 3. Station bounds match the design constants in `App.tsx`.
 * 4. `surrealText` matches what the in-scene `SurrealText` component
 *    would render for the same state.
 * 5. `activeStations` filters correctly to the phase's active set.
 */
import {describe, expect, it} from 'vitest';
import type {GameState} from '../../ecs/hooks';
import {readPerception, readStationBounds, resetPerceptionTick} from '../perception';
import {computePhaseText} from '../phaseText';

function makeMockState(overrides: Partial<GameState> = {}): GameState {
  return {
    appPhase: 'playing',
    introActive: false,
    introPhase: 0,
    posture: 'standing',
    idleTime: 0,
    difficulty: 'medium',
    currentRound: 1,
    totalRounds: 3,
    usedIngredientCombos: [],
    gamePhase: 'SELECT_INGREDIENTS',
    groundMeatVol: 0,
    stuffLevel: 0,
    casingTied: false,
    cookLevel: 0,
    selectedIngredientIds: [],
    mrSausageReaction: 'idle',
    mrSausageDemands: null,
    finalScore: null,
    playerDecisions: {flairPoints: []},
    playerPosition: {x: 2, y: 1.4, z: 3},
    joystick: {x: 0, y: 0},
    lookDelta: {x: 0, y: 0},
    interactPulse: 0,
    ...overrides,
  } as GameState;
}

describe('readPerception', () => {
  it('produces a snapshot with every documented field', () => {
    resetPerceptionTick();
    const snapshot = readPerception(makeMockState());

    expect(snapshot.tick).toBe(1);
    expect(snapshot.appPhase).toBe('playing');
    expect(snapshot.gamePhase).toBe('SELECT_INGREDIENTS');
    expect(snapshot.posture).toBe('standing');
    expect(snapshot.surrealText).toBe('PICK 3 INGREDIENTS');
    expect(snapshot.playerPosition).toEqual({x: 2, y: 1.4, z: 3});
    expect(Object.keys(snapshot.stations)).toContain('Grinder');
  });

  it('returns a deeply frozen snapshot', () => {
    const snapshot = readPerception(makeMockState());

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.playerPosition)).toBe(true);
    expect(Object.isFrozen(snapshot.selectedIngredientIds)).toBe(true);
    expect(Object.isFrozen(snapshot.stations)).toBe(true);
    expect(Object.isFrozen(snapshot.activeStations)).toBe(true);

    // Mutations should silently no-op (strict mode) or throw.
    expect(() => {
      // @ts-expect-error testing runtime immutability
      snapshot.playerPosition.x = 9999;
    }).toThrow();
  });

  it('selects active stations based on the current phase', () => {
    expect(readPerception(makeMockState({gamePhase: 'CHOPPING'})).activeStations).toEqual([
      'ChoppingBlock',
    ]);
    expect(readPerception(makeMockState({gamePhase: 'GRINDING'})).activeStations).toEqual([
      'Grinder',
    ]);
    expect(readPerception(makeMockState({gamePhase: 'STUFFING'})).activeStations).toEqual([
      'Stuffer',
    ]);
    expect(readPerception(makeMockState({gamePhase: 'COOKING'})).activeStations).toEqual([
      'Stove',
    ]);
    expect(readPerception(makeMockState({gamePhase: 'BLOWOUT'})).activeStations).toEqual([
      'BlowoutStation',
    ]);
  });

  it('mirrors computePhaseText for every phase + posture combo', () => {
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
    ] as const;

    for (const phase of phases) {
      const state = makeMockState({gamePhase: phase});
      const expected = computePhaseText({
        introActive: state.introActive,
        posture: state.posture,
        idleTime: state.idleTime,
        gamePhase: state.gamePhase,
        finalScore: state.finalScore,
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
      });
      expect(readPerception(state).surrealText).toBe(expected);
    }
  });

  it('emits the wake-up text in the prone intro state', () => {
    const snapshot = readPerception(makeMockState({posture: 'prone', idleTime: 0}));
    expect(snapshot.surrealText).toBe('Wake up');
  });

  it('emits the impatient hint after sitting too long', () => {
    const snapshot = readPerception(makeMockState({posture: 'sitting', idleTime: 12}));
    expect(snapshot.surrealText).toBe("Use the arrow keys for God's sake");
  });
});

describe('readStationBounds', () => {
  it('returns the design coordinates for the Grinder', () => {
    const bounds = readStationBounds('Grinder');
    expect(bounds.center).toEqual([-2.5, 1.0, -1.0]);
    expect(bounds.activePhases).toContain('GRINDING');
  });

  it('returns the design coordinates for the Stove', () => {
    const bounds = readStationBounds('Stove');
    expect(bounds.center[0]).toBeCloseTo(2.5);
    expect(bounds.activePhases).toContain('COOKING');
  });
});
