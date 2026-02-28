import {create} from 'zustand';

export type AppPhase = 'menu' | 'loading' | 'playing';
export type XrMode = 'none' | 'ar' | 'vr';

export interface GameState {
  // App lifecycle (menu → loading → playing)
  appPhase: AppPhase;

  // Progression
  currentChallenge: number;
  challengeScores: number[];
  gameStatus: 'menu' | 'playing' | 'victory' | 'defeat';

  // Current challenge
  strikes: number;
  challengeProgress: number;
  challengePressure: number;
  challengeIsPressing: boolean;
  challengeTemperature: number;
  challengeHeatLevel: number;

  // Meta
  hintsRemaining: number;
  totalGamesPlayed: number;

  // Variant seed
  variantSeed: number;

  // Input settings (persist across games)
  gyroEnabled: boolean;
  motionControlsEnabled: boolean;
  xrMode: XrMode;

  // Input setting actions
  setGyroEnabled: (enabled: boolean) => void;
  setMotionControlsEnabled: (enabled: boolean) => void;
  setXrMode: (mode: XrMode) => void;

  // Actions
  setAppPhase: (phase: AppPhase) => void;
  startNewGame: () => void;
  continueGame: () => void;
  completeChallenge: (score: number) => void;
  addStrike: () => void;
  useHint: () => void;
  setChallengeProgress: (progress: number) => void;
  setChallengePressure: (pressure: number) => void;
  setChallengeIsPressing: (pressing: boolean) => void;
  setChallengeTemperature: (temperature: number) => void;
  setChallengeHeatLevel: (heatLevel: number) => void;
  returnToMenu: () => void;
}

const TOTAL_CHALLENGES = 5;
const INITIAL_HINTS = 3;
const MAX_STRIKES = 3;

export const INITIAL_GAME_STATE = {
  appPhase: 'menu' as AppPhase,
  currentChallenge: 0,
  challengeScores: [] as number[],
  gameStatus: 'menu' as const,
  strikes: 0,
  challengeProgress: 0,
  challengePressure: 0,
  challengeIsPressing: false,
  challengeTemperature: 70,
  challengeHeatLevel: 0,
  hintsRemaining: INITIAL_HINTS,
  totalGamesPlayed: 0,
  variantSeed: 0,
  gyroEnabled: false,
  motionControlsEnabled: true,
  xrMode: 'none' as XrMode,
};

export const useGameStore = create<GameState>()(set => ({
  ...INITIAL_GAME_STATE,

  setAppPhase: (phase: AppPhase) => set({appPhase: phase}),

  startNewGame: () =>
    set(state => ({
      appPhase: 'playing' as AppPhase,
      currentChallenge: 0,
      challengeScores: [],
      gameStatus: 'playing',
      strikes: 0,
      challengeProgress: 0,
      challengePressure: 0,
      challengeIsPressing: false,
      challengeTemperature: 70,
      challengeHeatLevel: 0,
      hintsRemaining: INITIAL_HINTS,
      totalGamesPlayed: state.totalGamesPlayed + 1,
      variantSeed: Date.now(),
    })),

  continueGame: () =>
    set({
      gameStatus: 'playing',
      strikes: 0,
      challengeProgress: 0,
      challengePressure: 0,
      challengeIsPressing: false,
      challengeTemperature: 70,
      challengeHeatLevel: 0,
    }),

  completeChallenge: (score: number) =>
    set(state => {
      const nextChallenge = state.currentChallenge + 1;
      const scores = [...state.challengeScores, score];
      const isLastChallenge = nextChallenge >= TOTAL_CHALLENGES;

      return {
        challengeScores: scores,
        currentChallenge: nextChallenge,
        strikes: 0,
        challengeProgress: 0,
        challengePressure: 0,
        challengeIsPressing: false,
        challengeTemperature: 70,
        challengeHeatLevel: 0,
        gameStatus: isLastChallenge ? 'victory' : state.gameStatus,
      };
    }),

  addStrike: () =>
    set(state => {
      const newStrikes = state.strikes + 1;
      return {
        strikes: newStrikes,
        gameStatus: newStrikes >= MAX_STRIKES ? 'defeat' : state.gameStatus,
      };
    }),

  useHint: () =>
    set(state => ({
      hintsRemaining: Math.max(0, state.hintsRemaining - 1),
    })),

  setChallengeProgress: (progress: number) => set({challengeProgress: progress}),

  setChallengePressure: (pressure: number) => set({challengePressure: pressure}),

  setChallengeIsPressing: (pressing: boolean) => set({challengeIsPressing: pressing}),

  setChallengeTemperature: (temperature: number) => set({challengeTemperature: temperature}),

  setChallengeHeatLevel: (heatLevel: number) => set({challengeHeatLevel: heatLevel}),

  setGyroEnabled: (enabled: boolean) => set({gyroEnabled: enabled}),
  setMotionControlsEnabled: (enabled: boolean) => set({motionControlsEnabled: enabled}),
  setXrMode: (mode: XrMode) => set({xrMode: mode}),

  returnToMenu: () =>
    set({
      appPhase: 'menu' as AppPhase,
      gameStatus: 'menu',
      strikes: 0,
      challengeProgress: 0,
      challengePressure: 0,
      challengeIsPressing: false,
      challengeTemperature: 70,
      challengeHeatLevel: 0,
    }),
}));
