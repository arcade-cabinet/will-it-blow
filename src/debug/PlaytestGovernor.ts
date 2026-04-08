/**
 * @module debug/PlaytestGovernor
 * Debug interface exposed on `window.__WIB_DEBUG__` for automated playtesting.
 *
 * In dev mode, exposes game state + action methods that Playwright can call
 * via `page.evaluate()`. This bypasses the need to interact with 3D objects
 * directly (which Playwright can't do reliably in headless WebGL).
 *
 * In production builds, `initDebugInterface()` is a no-op.
 */
import type {GamePhase, GameState} from '../ecs/hooks';
import {useGameStore} from '../ecs/hooks';
import {getCurrentPitch, getCurrentYaw, setPitch, setYaw} from '../player/useMouseLook';

const PHASES: GamePhase[] = [
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

/** Ordered list of game phases exposed for E2E tests that iterate the full flow. */
export const ALL_GAME_PHASES: readonly GamePhase[] = PHASES;

/**
 * Shape of `window.__WIB_DEBUG__`. Kept as a single interface so tests can
 * import it and augment `Window` without duplicating field lists.
 */
export interface PlaytestDebugInterface {
  getState: () => GameState;
  actions: {
    selectIngredient: (id: string) => void;
    doChop: () => void;
    advancePhase: () => void;
    fillGrinder: () => void;
    fillStuffer: () => void;
    tieCasing: () => void;
    setCookLevel: (level: number) => void;
    triggerBlowout: () => void;
    startNewGame: () => void;
    returnToMenu: () => void;
  };
  getGamePhase: () => GamePhase;
  getAppPhase: () => GameState['appPhase'];
  getRound: () => number;
  getScore: () => GameState['finalScore'];
  getCameraPitch: () => number;
  getCameraYaw: () => number;
  setCameraYaw: (radians: number) => void;
  setCameraPitch: (radians: number) => void;
  readonly PHASES: readonly GamePhase[];
}

export function initDebugInterface() {
  if (import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  // Security note: This debug interface is intentionally dev-only (gated above).
  // This is a single-player game with local-only scores — "cheating" via the
  // debug console is not a security concern.

  const debug: PlaytestDebugInterface = {
    getState: () => useGameStore.getState(),

    // Actions that simulate player interactions
    actions: {
      selectIngredient: (id: string) => useGameStore.getState().addSelectedIngredientId(id),

      doChop: () => {
        const s = useGameStore.getState();
        s.setGroundMeatVol((v: number) => Math.min(1, v + 0.2));
      },

      advancePhase: () => {
        const current = useGameStore.getState().gamePhase;
        const idx = PHASES.indexOf(current);
        if (idx >= 0 && idx < PHASES.length - 1) {
          useGameStore.getState().setGamePhase(PHASES[idx + 1]);
        }
      },

      fillGrinder: () => useGameStore.getState().setGroundMeatVol(1),
      fillStuffer: () => useGameStore.getState().setStuffLevel(1),
      tieCasing: () => useGameStore.getState().setCasingTied(true),
      setCookLevel: (level: number) => useGameStore.getState().setCookLevel(level),

      triggerBlowout: () => {
        useGameStore.getState().recordFlairPoint('Clean Burst', 10);
        useGameStore.getState().setMrSausageReaction('nod');
      },

      startNewGame: () => useGameStore.getState().startNewGame(),
      returnToMenu: () => useGameStore.getState().returnToMenu(),
    },

    // Phase queries
    getGamePhase: () => useGameStore.getState().gamePhase,
    getAppPhase: () => useGameStore.getState().appPhase,
    getRound: () => useGameStore.getState().currentRound,
    getScore: () => useGameStore.getState().finalScore,

    // Camera queries (drive the "camera pitch is level" check in E2E)
    getCameraPitch: () => getCurrentPitch(),
    getCameraYaw: () => getCurrentYaw(),
    // Camera mutators (used by the Mr. Sausage TV playtest + any spec that
    // needs to aim the FPS camera without entering pointer-lock mode).
    setCameraYaw: (radians: number) => setYaw(radians),
    setCameraPitch: (radians: number) => setPitch(radians),

    PHASES,
  };

  window.__WIB_DEBUG__ = debug;
}
