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

import {useGameStore} from '../store/gameStore';

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

  /** Skip directly to a specific challenge index (0-4) */
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
        totalGamesPlayed: s.totalGamesPlayed,
        variantSeed: s.variantSeed,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        musicMuted: s.musicMuted,
        sfxMuted: s.sfxMuted,
      };
    },

    startGame() {
      store.getState().setAppPhase('loading');
    },

    startGameDirect() {
      store.getState().startNewGame();
    },

    completeCurrentChallenge(score: number) {
      store.getState().completeChallenge(score);
    },

    skipToChallenge(index: number) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      while (store.getState().currentChallenge < index) {
        store.getState().completeChallenge(75);
      }
    },

    skipToChallengeWithScores(index: number, scores: number[]) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      for (let i = 0; i < index; i++) {
        store.getState().completeChallenge(scores[i] ?? 75);
      }
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
      // Trigger 3 strikes at the target challenge
      store.getState().addStrike();
      store.getState().addStrike();
      store.getState().addStrike();
    },

    triggerVictory(scores: number[]) {
      const state = store.getState();
      if (state.appPhase !== 'playing') {
        state.startNewGame();
      }
      for (let i = 0; i < 5; i++) {
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
  };
}

/** Install the governor on window (dev only) */
export function installGovernor() {
  if (typeof window !== 'undefined' && __DEV__) {
    (window as any).__gov = createGovernor();
    console.log('[GameGovernor] Installed on window.__gov');
  }
}
