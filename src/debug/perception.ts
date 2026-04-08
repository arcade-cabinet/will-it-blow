/**
 * Read-only perception API exposed via `window.__WIB_DEBUG__` for the
 * deep-validation test suite. Every snapshot returned here is
 * `Object.freeze`'d so callers can't accidentally mutate game state.
 *
 * The Yuka GOAP governor in `tests/harness/goap/` reads exclusively
 * through this API — it never touches `useGameStore.setState`,
 * `__WIB_DEBUG__.actions`, or any other writable surface. That keeps
 * the AI player honest: it has to perceive the same way a real human
 * would (visible state on the wall + visible station positions in
 * world space), and it has to act through the WIBActuator's real
 * mouse events.
 *
 * Station bounds are intentionally hardcoded here rather than read
 * dynamically from the live scene graph, because:
 *   1. They're stable design constants that match `App.tsx`.
 *   2. The Yuka planner needs them BEFORE the scene mounts so the
 *      first plan is ready as soon as the player can move.
 *   3. Reading them from the scene graph would require traversing
 *      THREE.Object3D bounding boxes every tick — expensive and
 *      brittle when components mount asynchronously.
 *
 * Keep this file in sync with the world coordinates in `App.tsx`.
 */
import type {GamePhase, GameState, Posture} from '../ecs/hooks';
import {computePhaseText} from './phaseText';

// ── Station bounds — world coordinates from App.tsx ─────────────────

export interface StationBounds {
  /** Centre point in world space `(x, y, z)`. */
  center: readonly [number, number, number];
  /** Half-extents in world space `(hx, hy, hz)`. */
  halfExtents: readonly [number, number, number];
  /** The game phase(s) where this station is active. */
  activePhases: readonly GamePhase[];
}

export type StationName =
  | 'Grinder'
  | 'Stuffer'
  | 'Stove'
  | 'BlowoutStation'
  | 'Sink'
  | 'ChoppingBlock'
  | 'PhysicsFreezerChest'
  | 'TV';

/** Hardcoded design positions — keep in sync with `src/App.tsx`. */
const STATION_BOUNDS: Record<StationName, StationBounds> = {
  Grinder: {
    center: [-2.5, 1.0, -1.0],
    halfExtents: [0.4, 0.8, 0.4],
    activePhases: ['FILL_GRINDER', 'GRINDING'],
  },
  Stuffer: {
    center: [0, 1.0, -3.5],
    halfExtents: [0.5, 0.8, 0.4],
    activePhases: ['MOVE_BOWL', 'ATTACH_CASING', 'STUFFING', 'TIE_CASING'],
  },
  Stove: {
    center: [2.5, 0.9, -2.5],
    halfExtents: [0.5, 0.4, 0.5],
    activePhases: ['MOVE_PAN', 'COOKING'],
  },
  BlowoutStation: {
    center: [2.5, 1.0, 1.0],
    halfExtents: [0.5, 0.8, 0.4],
    activePhases: ['BLOWOUT'],
  },
  Sink: {
    center: [-2.5, 0.9, 2.0],
    halfExtents: [0.5, 0.4, 0.5],
    activePhases: [],
  },
  ChoppingBlock: {
    center: [2.5, 0.9, -0.5],
    halfExtents: [0.6, 0.2, 0.4],
    activePhases: ['CHOPPING'],
  },
  PhysicsFreezerChest: {
    center: [-2.5, 0.5, -3.0],
    halfExtents: [0.6, 0.4, 0.5],
    activePhases: ['SELECT_INGREDIENTS'],
  },
  TV: {
    center: [-2.8, 1.8, 0],
    halfExtents: [0.5, 0.4, 0.5],
    activePhases: ['MOVE_SAUSAGE'],
  },
};

// ── Perception snapshot type ────────────────────────────────────────

export interface PerceptionSnapshot {
  readonly tick: number;
  readonly appPhase: GameState['appPhase'];
  readonly gamePhase: GamePhase;
  readonly introActive: boolean;
  readonly posture: Posture;
  readonly idleTime: number;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly groundMeatVol: number;
  readonly stuffLevel: number;
  readonly casingTied: boolean;
  readonly cookLevel: number;
  readonly selectedIngredientIds: readonly string[];
  readonly mrSausageReaction: GameState['mrSausageReaction'];
  readonly playerPosition: Readonly<{x: number; y: number; z: number}>;
  /** What the wall says right now — the player's primary feedback channel. */
  readonly surrealText: string;
  /** Final score state if the round has ended, otherwise null. */
  readonly finalScore: GameState['finalScore'];
  /** All station bounds, keyed by name. */
  readonly stations: Readonly<Record<StationName, StationBounds>>;
  /** The station(s) currently relevant to the active phase. */
  readonly activeStations: readonly StationName[];
}

// ── Public reader functions ─────────────────────────────────────────

let perceptionTick = 0;

/**
 * Build a frozen perception snapshot from the live game state.
 *
 * Pure with respect to the game — never mutates `useGameStore`.
 * Cheap to call: a few dozen field reads + an `Object.freeze`.
 */
export function readPerception(state: GameState): PerceptionSnapshot {
  perceptionTick += 1;

  const surrealText = computePhaseText({
    introActive: state.introActive,
    posture: state.posture,
    idleTime: state.idleTime,
    gamePhase: state.gamePhase,
    finalScore: state.finalScore,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
  });

  const activeStations = Object.entries(STATION_BOUNDS)
    .filter(([, b]) => b.activePhases.includes(state.gamePhase))
    .map(([name]) => name as StationName);

  const snapshot: PerceptionSnapshot = {
    tick: perceptionTick,
    appPhase: state.appPhase,
    gamePhase: state.gamePhase,
    introActive: state.introActive,
    posture: state.posture,
    idleTime: state.idleTime,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    groundMeatVol: state.groundMeatVol,
    stuffLevel: state.stuffLevel,
    casingTied: state.casingTied,
    cookLevel: state.cookLevel,
    selectedIngredientIds: Object.freeze([...state.selectedIngredientIds]),
    mrSausageReaction: state.mrSausageReaction,
    playerPosition: Object.freeze({...state.playerPosition}),
    surrealText,
    finalScore: state.finalScore ? Object.freeze({...state.finalScore}) : null,
    stations: Object.freeze(
      Object.fromEntries(
        Object.entries(STATION_BOUNDS).map(([k, v]) => [k, Object.freeze({...v})]),
      ),
    ) as Readonly<Record<StationName, StationBounds>>,
    activeStations: Object.freeze(activeStations),
  };
  return Object.freeze(snapshot);
}

/** Get the design bounds for a single station by name (frozen copy). */
export function readStationBounds(name: StationName): Readonly<StationBounds> {
  return Object.freeze({...STATION_BOUNDS[name]});
}

/** Reset the internal tick counter — used by tests for determinism. */
export function resetPerceptionTick(): void {
  perceptionTick = 0;
}
