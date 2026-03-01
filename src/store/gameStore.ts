import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {Reaction} from '../components/characters/reactions';
import {INGREDIENTS, type Ingredient} from '../engine/Ingredients';

export type AppPhase = 'menu' | 'loading' | 'playing';
export type GrabbedObjectType = 'ingredient' | 'bowl' | 'sausage' | 'pan' | null;
export type BowlPosition = 'fridge' | 'grinder' | 'stuffer' | 'carried';

export interface GameState {
  // App lifecycle (menu -> loading -> playing)
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

  // Grab system state (physics grab/carry/drop)
  grabbedObject: string | null;
  grabbedObjectType: GrabbedObjectType;

  // Mixing bowl
  bowlContents: string[]; // ingredient IDs that have been dropped in the bowl
  bowlPosition: BowlPosition;

  // Blend properties (computed from bowl contents, used for procedural texture)
  blendColor: string;
  blendRoughness: number;
  blendChunkiness: number;

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
  setGrabbedObject: (id: string | null, type?: GrabbedObjectType) => void;
  addToBowl: (ingredientId: string) => void;
  clearBowl: () => void;
  setBowlPosition: (pos: BowlPosition) => void;
  updateBlendProperties: () => void;
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

/** Parse a hex color string (#RRGGBB) into [r, g, b] (0-255). */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.substring(0, 2), 16),
    Number.parseInt(h.substring(2, 4), 16),
    Number.parseInt(h.substring(4, 6), 16),
  ];
}

/** Convert [r, g, b] (0-255) back to #RRGGBB hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Compute blend properties from bowl contents using ingredient data. */
function computeBlendProperties(bowlContents: string[]): {
  blendColor: string;
  blendRoughness: number;
  blendChunkiness: number;
} {
  if (bowlContents.length === 0) {
    return {blendColor: '#888888', blendRoughness: 0.5, blendChunkiness: 0.5};
  }

  const ingredients = bowlContents
    .map(id => INGREDIENTS.find(ing => ing.name === id))
    .filter((ing): ing is Ingredient => ing != null);

  if (ingredients.length === 0) {
    return {blendColor: '#888888', blendRoughness: 0.5, blendChunkiness: 0.5};
  }

  // Average color
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  for (const ing of ingredients) {
    const [r, g, b] = hexToRgb(ing.color);
    totalR += r;
    totalG += g;
    totalB += b;
  }
  const n = ingredients.length;
  const blendColor = rgbToHex(totalR / n, totalG / n, totalB / n);

  // Roughness: 1 - (avgTextureMod / 5)
  const avgTextureMod = ingredients.reduce((sum, ing) => sum + ing.textureMod, 0) / n;
  const blendRoughness = 1 - avgTextureMod / 5;

  // Chunkiness: based on variance of textureMod values
  const variance =
    ingredients.reduce((sum, ing) => sum + (ing.textureMod - avgTextureMod) ** 2, 0) / n;
  // Normalize variance to 0-1 range (max possible variance with textureMod 0-5 is 6.25)
  const blendChunkiness = Math.min(1, variance / 6.25);

  return {blendColor, blendRoughness, blendChunkiness};
}

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
  grabbedObject: null as string | null,
  grabbedObjectType: null as GrabbedObjectType,
  bowlContents: [] as string[],
  bowlPosition: 'fridge' as BowlPosition,
  blendColor: '#888888',
  blendRoughness: 0.5,
  blendChunkiness: 0.5,
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
    (set, get) => ({
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
          grabbedObject: null,
          grabbedObjectType: null,
          bowlContents: [],
          bowlPosition: 'fridge' as BowlPosition,
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
          playerPosition: [0, 1.6, 0] as [number, number, number],
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
          grabbedObject: null,
          grabbedObjectType: null,
          bowlContents: [],
          bowlPosition: 'fridge' as BowlPosition,
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
          playerPosition: [0, 1.6, 0] as [number, number, number],
          challengeTriggered: false,
        }),

      completeChallenge: (score: number) =>
        set(state => {
          const nextChallenge = state.currentChallenge + 1;
          if (!Number.isFinite(score)) {
            throw new Error(`completeChallenge called with invalid score: ${score}`);
          }
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

      setGrabbedObject: (id: string | null, type?: GrabbedObjectType) =>
        set({
          grabbedObject: id,
          grabbedObjectType: id == null ? null : (type ?? null),
        }),

      addToBowl: (ingredientId: string) => {
        set(state => ({bowlContents: [...state.bowlContents, ingredientId]}));
        get().updateBlendProperties();
      },

      clearBowl: () =>
        set({
          bowlContents: [],
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
        }),

      setBowlPosition: (pos: BowlPosition) => set({bowlPosition: pos}),

      updateBlendProperties: () => set(state => computeBlendProperties(state.bowlContents)),

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
          grabbedObject: null,
          grabbedObjectType: null,
          bowlContents: [],
          bowlPosition: 'fridge' as BowlPosition,
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
          fridgePool: [],
          fridgeMatchingIndices: [],
          fridgeSelectedIndices: [],
          pendingFridgeClick: null,
          fridgeHoveredIndex: null,
          playerPosition: [0, 1.6, 0] as [number, number, number],
          challengeTriggered: false,
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
