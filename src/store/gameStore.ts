import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {Reaction} from '../components/characters/reactions';
import type {Ingredient} from '../engine/Ingredients';

export type AppPhase = 'menu' | 'loading' | 'playing';
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

  // Mr. Sausage CRT reaction (shared between UI overlays and 3D scene)
  mrSausageReaction: Reaction;

  // Hints
  hintActive: boolean;
  hintsRemaining: number;
  totalGamesPlayed: number;

  // Variant seed
  variantSeed: number;

  // Player position for FPS movement + proximity triggers
  playerPosition: [number, number, number];
  // Whether the player has reached the current challenge's station
  challengeTriggered: boolean;

  // Fridge challenge — shared state between 3D scene and 2D overlay
  fridgePool: Ingredient[];
  fridgeMatchingIndices: number[];
  fridgeSelectedIndices: number[];
  pendingFridgeClick: number | null;
  fridgeHoveredIndex: number | null;

  // Settings (persist across games)
  musicVolume: number; // 0-1
  sfxVolume: number; // 0-1
  musicMuted: boolean;
  sfxMuted: boolean;

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
  setMrSausageReaction: (reaction: Reaction) => void;
  setHintActive: (active: boolean) => void;
  setFridgePool: (pool: Ingredient[], matching: number[]) => void;
  triggerFridgeClick: (index: number) => void;
  clearFridgeClick: () => void;
  addFridgeSelected: (index: number) => void;
  setFridgeHovered: (index: number | null) => void;
  setPlayerPosition: (pos: [number, number, number]) => void;
  triggerChallenge: () => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicMuted: (muted: boolean) => void;
  setSfxMuted: (muted: boolean) => void;
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
  mrSausageReaction: 'idle' as Reaction,
  hintActive: false,
  hintsRemaining: INITIAL_HINTS,
  totalGamesPlayed: 0,
  variantSeed: 0,
  fridgePool: [] as Ingredient[],
  fridgeMatchingIndices: [] as number[],
  fridgeSelectedIndices: [] as number[],
  pendingFridgeClick: null as number | null,
  fridgeHoveredIndex: null as number | null,
  playerPosition: [0, 1.6, 0] as [number, number, number],
  challengeTriggered: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  musicMuted: false,
  sfxMuted: false,
};

export const useGameStore = create<GameState>()(
  persist(
    set => ({
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
          mrSausageReaction: 'idle' as Reaction,
          hintsRemaining: INITIAL_HINTS,
          totalGamesPlayed: state.totalGamesPlayed + 1,
          variantSeed: Date.now(),
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
          challengeTriggered: false,
        })),

      continueGame: () =>
        set({
          appPhase: 'playing' as AppPhase,
          gameStatus: 'playing',
          strikes: 0,
          challengeProgress: 0,
          challengePressure: 0,
          challengeIsPressing: false,
          challengeTemperature: 70,
          challengeHeatLevel: 0,
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
          challengeTriggered: false,
        }),

      completeChallenge: (score: number) =>
        set(state => {
          const nextChallenge = state.currentChallenge + 1;
          const scores = [...state.challengeScores, Number.isFinite(score) ? score : 0];
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
            hintActive: false,
            challengeTriggered: false,
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
        set(state => {
          if (state.hintsRemaining <= 0) return {};
          return {
            hintsRemaining: state.hintsRemaining - 1,
            hintActive: true,
          };
        }),

      setChallengeProgress: (progress: number) => set({challengeProgress: progress}),

      setChallengePressure: (pressure: number) => set({challengePressure: pressure}),

      setChallengeIsPressing: (pressing: boolean) => set({challengeIsPressing: pressing}),

      setChallengeTemperature: (temperature: number) => set({challengeTemperature: temperature}),

      setChallengeHeatLevel: (heatLevel: number) => set({challengeHeatLevel: heatLevel}),

      setMrSausageReaction: (reaction: Reaction) => set({mrSausageReaction: reaction}),

      setHintActive: (active: boolean) => set({hintActive: active}),

      setFridgePool: (pool: Ingredient[], matching: number[]) =>
        set({
          fridgePool: pool,
          fridgeMatchingIndices: matching,
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
        }),

      triggerFridgeClick: (index: number) => set({pendingFridgeClick: index}),

      clearFridgeClick: () => set({pendingFridgeClick: null}),

      addFridgeSelected: (index: number) =>
        set(state => ({fridgeSelectedIndices: [...state.fridgeSelectedIndices, index]})),

      setFridgeHovered: (index: number | null) => set({fridgeHoveredIndex: index}),

      setPlayerPosition: (pos: [number, number, number]) => set({playerPosition: pos}),
      triggerChallenge: () => set({challengeTriggered: true}),

      setMusicVolume: (volume: number) => set({musicVolume: Math.max(0, Math.min(1, volume))}),
      setSfxVolume: (volume: number) => set({sfxVolume: Math.max(0, Math.min(1, volume))}),
      setMusicMuted: (muted: boolean) => set({musicMuted: muted}),
      setSfxMuted: (muted: boolean) => set({sfxMuted: muted}),

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
          mrSausageReaction: 'idle' as Reaction,
          hintActive: false,
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
        }),
    }),
    {
      name: 'will-it-blow-save',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist progress and settings — not ephemeral game state
      partialize: state => ({
        totalGamesPlayed: state.totalGamesPlayed,
        currentChallenge: state.currentChallenge,
        challengeScores: state.challengeScores,
        hintsRemaining: state.hintsRemaining,
        variantSeed: state.variantSeed,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        musicMuted: state.musicMuted,
        sfxMuted: state.sfxMuted,
      }),
    },
  ),
);
