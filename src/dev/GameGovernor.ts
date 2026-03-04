/**
 * GameGovernor — Dev-only harness that exposes Zustand store actions on `window.__gov`
 * so Playwright e2e tests can drive the game programmatically without clicking through
 * every dialogue and UI element.
 *
 * Usage from Playwright:
 *   await page.evaluate(() => window.__gov.skipToChallenge(2));
 *   await page.evaluate(() => window.__gov.completeCurrentChallenge(85));
 *   await page.evaluate(() => window.__gov.getState());
 */

import {config} from '../config';
import {DEFAULT_ROOM} from '../engine/FurnitureLayout';
import {mergeLayoutConfigs, resolveLayout} from '../engine/layout';
import {useGameStore} from '../store/gameStore';

const KITCHEN_LAYOUT = mergeLayoutConfigs(
  config.layout.room,
  config.layout.rails,
  config.layout.placements,
);
const TARGETS = resolveLayout(KITCHEN_LAYOUT, DEFAULT_ROOM).targets;
const CHALLENGE_STATIONS = config.scene.challengeSequence.stations;

/**
 * Compute a player standing position in front of a station for E2E screenshots.
 * Moves from the station toward the room center by a minimum of MIN_STANDOFF metres,
 * so the camera clears the station's furniture mesh and counter depth.
 *
 * MIN_STANDOFF (2.0m) accounts for:
 * - counter depth (~0.6m from wall)
 * - machine depth (~0.5m)
 * - personal-space clearance (~0.9m)
 */
const MIN_STANDOFF = 2.0;
function playerStandPos(stationName: string): {pos: [number, number, number]; yaw: number} {
  const target = TARGETS[stationName];
  if (!target) return {pos: [0, 1.6, 0], yaw: Math.PI};
  const [sx, , sz] = target.position;
  // Direction from station toward room center (XZ plane only)
  const dx = 0 - sx;
  const dz = 0 - sz;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const dist = Math.max(MIN_STANDOFF, target.triggerRadius * 0.75);
  const standX = sx + (dx / len) * dist;
  const standZ = sz + (dz / len) * dist;
  // Yaw to face the station from the stand position.
  // Three.js YXZ Euler: camera looks in direction (-sin θ, 0, -cos θ).
  // To look toward (stationX - standX, stationZ - standZ) we need atan2(-dx, -dz).
  const faceDx = sx - standX;
  const faceDz = sz - standZ;
  const yaw = Math.atan2(-faceDx, -faceDz);
  return {
    pos: [standX, 1.6, standZ],
    yaw,
  };
}

export interface GameGov {
  /** True once the 3D scene + GLB meshes are fully loaded and rendered */
  sceneReady: boolean;

  /** Get current store state snapshot */
  getState: () => Record<string, unknown>;

  /** Start a new game via loading screen (menu → loading → playing) */
  startGame: () => void;

  /** Start a new game immediately, bypassing the loading screen */
  startGameDirect: () => void;

  /** Complete the current challenge with a given score and advance */
  completeCurrentChallenge: (score: number) => void;

  /** Skip directly to a specific challenge index (0-5) */
  skipToChallenge: (index: number) => void;

  /** Skip to a specific challenge with custom scores for preceding challenges */
  skipToChallengeWithScores: (index: number, scores: number[]) => void;

  /** Set appPhase directly */
  setPhase: (phase: 'menu' | 'loading' | 'playing') => void;

  /** Trigger defeat */
  triggerDefeat: () => void;

  /** Trigger defeat at a specific challenge with partial scores */
  triggerDefeatAtChallenge: (challengeIndex: number, precedingScores: number[]) => void;

  /** Trigger victory with given scores */
  triggerVictory: (scores: number[]) => void;

  /** Add a single strike (for testing incremental strike behavior) */
  addStrike: () => void;

  /** Use a hint (for testing hint system) */
  useHint: () => void;

  /** Return to menu (for testing menu return flow) */
  returnToMenu: () => void;

  /** Simulate the CONTINUE flow (restore saved state → loading) */
  simulateContinue: () => void;

  /** Clear all persisted state (for clean test starts) */
  clearSaveData: () => void;

  /** Set challenge ephemeral state */
  setChallengeProgress: (v: number) => void;
  setChallengePressure: (v: number) => void;
  setChallengeTemperature: (v: number) => void;
  setChallengeHeatLevel: (v: number) => void;

  /** Set fridge-specific state for ingredient challenge testing */
  triggerFridgeClick: (index: number) => void;

  /** Get fridge state snapshot */
  getFridgeState: () => Record<string, unknown>;

  /** Set audio volume/mute for testing persistence */
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicMuted: (v: boolean) => void;
  setSfxMuted: (v: boolean) => void;

  /** Teleport the player to an arbitrary world position */
  movePlayerTo: (x: number, y: number, z: number) => void;

  /** Teleport + set camera yaw. Used by E2E visual sweep scripts. */
  setCamera: (pos: [number, number, number], yaw: number) => void;

  /** Manually trigger the current challenge (simulates player arriving at station) */
  triggerCurrentChallenge: () => void;

  // --- Scene introspection (injected by SceneIntrospector in GameWorld) ---

  /** Query camera position and fov */
  getCamera?: () => {position: number[]; fov: number};

  /** List top-level scene children with names, positions, child counts */
  getSceneChildren?: () => {name: string; type: string; position: number[]; childCount: number}[];

  /** Find a named object in the scene graph (recursive), return world position */
  findObject?: (name: string) => {
    name: string;
    type: string;
    worldPosition: number[];
    visible: boolean;
    childCount: number;
  } | null;

  /** Count total Mesh objects in scene */
  getMeshCount?: () => number;

  /** Find all groups matching a regex pattern */
  findGroups?: (pattern: string) => {
    name: string;
    worldPosition: number[];
    visible: boolean;
    childCount: number;
  }[];

  /** Debug: dump all meshes with world bounding boxes */
  debugMeshes?: () => {
    name: string;
    parent: string;
    wx: number;
    wy: number;
    wz: number;
    visible: boolean;
    worldBBMin?: number[];
    worldBBMax?: number[];
    worldBBSize?: number[];
    color?: string;
    side?: number;
  }[];

  /** Debug: set scene background color */
  setSceneBg?: (r: number, g: number, b: number) => void;

  /** Manual proximity check — mirrors ManualProximityTrigger distance math.
   *  Returns true if trigger fired. Used when Rapier sensors don't fire in E2E. */
  checkProximityTrigger: () => boolean;

  /** Get resolved station target for a challenge index (position + triggerRadius) */
  getStationTarget: (
    index: number,
  ) => {position: [number, number, number]; triggerRadius: number; stationName: string} | null;

  /** Start a new game without auto-triggering the first challenge (for real playthrough tests) */
  startGameNoTrigger: () => void;

  /** Complete the current challenge without auto-triggering the next one */
  completeCurrentChallengeNoTrigger: (score: number) => void;
}

function createGovernor(): GameGov {
  const store = useGameStore;

  return {
    sceneReady: false,

    getState() {
      const s = store.getState();
      return {
        appPhase: s.appPhase,
        gameStatus: s.gameStatus,
        currentChallenge: s.currentChallenge,
        challengeTriggered: s.challengeTriggered,
        challengeScores: s.challengeScores,
        strikes: s.strikes,
        hintsRemaining: s.hintsRemaining,
        hintActive: s.hintActive,
        challengeProgress: s.challengeProgress,
        challengePressure: s.challengePressure,
        challengeIsPressing: s.challengeIsPressing,
        challengeTemperature: s.challengeTemperature,
        challengeHeatLevel: s.challengeHeatLevel,
        mrSausageReaction: s.mrSausageReaction,
        playerPosition: s.playerPosition,
        totalGamesPlayed: s.totalGamesPlayed,
        variantSeed: s.variantSeed,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        musicMuted: s.musicMuted,
        sfxMuted: s.sfxMuted,
        bowlPosition: s.bowlPosition,
        sausagePlaced: s.sausagePlaced,
        blendColor: s.blendColor,
      };
    },

    startGame() {
      store.getState().setAppPhase('loading');
    },

    startGameDirect() {
      store.getState().startNewGame();
      // Teleport to the first station so the camera faces it
      const firstStation = CHALLENGE_STATIONS[0];
      if (firstStation) {
        const stand = playerStandPos(firstStation.stationName);
        store.getState().requestTeleport(stand.pos, stand.yaw);
      }
      store.getState().triggerChallenge();
    },

    completeCurrentChallenge(score = 0) {
      store.getState().completeChallenge(score);
      // Auto-trigger the next challenge (simulates player walking to next station)
      if (store.getState().gameStatus === 'playing') {
        const nextIdx = store.getState().currentChallenge;
        const nextStation = CHALLENGE_STATIONS[nextIdx];
        if (nextStation) {
          const stand = playerStandPos(nextStation.stationName);
          store.getState().requestTeleport(stand.pos, stand.yaw);
        }
        store.getState().triggerChallenge();
      }
    },

    skipToChallenge(index: number) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      while (store.getState().currentChallenge < index) {
        store.getState().completeChallenge(75);
      }
      const station = CHALLENGE_STATIONS[index];
      if (station) {
        const stand = playerStandPos(station.stationName);
        store.getState().requestTeleport(stand.pos, stand.yaw);
      }
      store.getState().triggerChallenge();
    },

    skipToChallengeWithScores(index: number, scores: number[]) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      for (let i = 0; i < index; i++) {
        store.getState().completeChallenge(scores[i] ?? 75);
      }
      const station = CHALLENGE_STATIONS[index];
      if (station) {
        const stand = playerStandPos(station.stationName);
        store.getState().requestTeleport(stand.pos, stand.yaw);
      }
      store.getState().triggerChallenge();
    },

    setPhase(phase) {
      store.getState().setAppPhase(phase);
    },

    triggerDefeat() {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      store.getState().addStrike();
      store.getState().addStrike();
      store.getState().addStrike();
    },

    triggerDefeatAtChallenge(challengeIndex: number, precedingScores: number[]) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      // Complete preceding challenges with given scores
      for (let i = 0; i < challengeIndex; i++) {
        store.getState().completeChallenge(precedingScores[i] ?? 75);
      }
      // Trigger the target challenge, then add 3 strikes for defeat
      store.getState().triggerChallenge();
      store.getState().addStrike();
      store.getState().addStrike();
      store.getState().addStrike();
    },

    triggerVictory(scores: number[]) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      const totalChallenges = CHALLENGE_STATIONS.length;
      for (let i = 0; i < totalChallenges; i++) {
        store.getState().completeChallenge(scores[i] ?? 75);
      }
    },

    addStrike() {
      store.getState().addStrike();
    },

    useHint() {
      store.getState().useHint();
    },

    returnToMenu() {
      store.getState().returnToMenu();
    },

    simulateContinue() {
      store.getState().setAppPhase('loading');
      store.getState().continueGame();
    },

    clearSaveData() {
      store.setState({
        currentChallenge: 0,
        challengeScores: [],
        totalGamesPlayed: 0,
        hintsRemaining: 3,
        variantSeed: 0,
      });
    },

    setChallengeProgress(v) {
      store.getState().setChallengeProgress(v);
    },
    setChallengePressure(v) {
      store.getState().setChallengePressure(v);
    },
    setChallengeTemperature(v) {
      store.getState().setChallengeTemperature(v);
    },
    setChallengeHeatLevel(v) {
      store.getState().setChallengeHeatLevel(v);
    },

    triggerFridgeClick(index: number) {
      store.getState().triggerFridgeClick(index);
    },

    getFridgeState() {
      const s = store.getState();
      return {
        fridgePool: s.fridgePool.map(ing => ({name: ing.name, category: ing.category})),
        fridgeMatchingIndices: s.fridgeMatchingIndices,
        fridgeSelectedIndices: s.fridgeSelectedIndices,
        pendingFridgeClick: s.pendingFridgeClick,
        fridgeHoveredIndex: s.fridgeHoveredIndex,
      };
    },

    movePlayerTo(x: number, y: number, z: number) {
      // requestTeleport is consumed by FPSController on the next frame, moving both
      // posRef and camera. setPlayerPosition alone only updates the store, not the camera.
      store.getState().requestTeleport([x, y, z]);
    },

    /** Teleport + set camera yaw. Used by E2E visual sweep scripts. */
    setCamera(pos: [number, number, number], yaw: number) {
      store.getState().requestTeleport(pos, yaw);
    },

    triggerCurrentChallenge() {
      store.getState().triggerChallenge();
    },

    setMusicVolume(v) {
      store.getState().setMusicVolume(v);
    },
    setSfxVolume(v) {
      store.getState().setSfxVolume(v);
    },
    setMusicMuted(v) {
      store.getState().setMusicMuted(v);
    },
    setSfxMuted(v) {
      store.getState().setSfxMuted(v);
    },

    /** Check if player is within trigger radius of current station and fire trigger.
     *  Mirrors ManualProximityTrigger logic — same distance check, same store conditions.
     *  Used by E2E tests when Rapier WASM sensors don't fire reliably in headless Chrome. */
    checkProximityTrigger() {
      const state = store.getState();
      if (state.gameStatus !== 'playing' || state.challengeTriggered) return false;
      const station = CHALLENGE_STATIONS[state.currentChallenge];
      if (!station) return false;
      const target = TARGETS[station.stationName];
      if (!target) return false;
      const [px, , pz] = state.playerPosition;
      const dx = px - target.position[0];
      const dz = pz - target.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < target.triggerRadius) {
        state.triggerChallenge();
        return true;
      }
      return false;
    },

    getStationTarget(index: number) {
      const station = CHALLENGE_STATIONS[index];
      if (!station) return null;
      const target = TARGETS[station.stationName];
      if (!target) return null;
      return {
        position: target.position as [number, number, number],
        triggerRadius: target.triggerRadius,
        stationName: station.stationName,
      };
    },

    startGameNoTrigger() {
      store.getState().startNewGame();
    },

    completeCurrentChallengeNoTrigger(score = 0) {
      store.getState().completeChallenge(score);
    },
  };
}

/** Install the governor on window (dev only) */
export function installGovernor() {
  if (typeof window !== 'undefined' && __DEV__) {
    (window as any).__gov = createGovernor();
    console.log('[GameGovernor] Installed on window.__gov');
  }
}
