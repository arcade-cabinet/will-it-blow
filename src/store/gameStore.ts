/**
 * @module gameStore
 * Zustand store — single source of truth for all game state.
 * Persists progress and settings to AsyncStorage across sessions.
 *
 * State is split into:
 * - **App lifecycle**: appPhase (menu/loading/playing)
 * - **Progression**: currentChallenge, challengeScores, gameStatus
 * - **Challenge ephemeral**: strikes, progress, pressure, temperature, heat
 * - **Fridge bridge**: shared state between 3D scene and 2D overlay
 * - **Grab system**: physics-based pick-up/carry/drop
 * - **Bowl/sausage**: tracks the mixing bowl and sausage through the pipeline
 * - **Settings**: volume/mute (persisted)
 *
 * All mutations go through actions — no direct state writes outside the store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {Reaction} from '../components/characters/reactions';
import {computeBlendProperties as computeBlend} from '../engine/BlendCalculator';
import type {Ingredient} from '../engine/Ingredients';

/** Top-level application phase controlling which screen is rendered. */
export type AppPhase = 'menu' | 'loading' | 'playing';

/** The type of object the player is currently carrying, or null if hands are empty. */
export type GrabbedObjectType = 'ingredient' | 'bowl' | 'sausage' | 'pan' | null;

/**
 * Tracks the mixing bowl's position in the sausage-making pipeline.
 * The bowl progresses: fridge -> carried -> grinder -> grinder-output -> carried -> stuffer -> done.
 */
export type BowlPosition =
  | 'fridge' // At fridge: receiving ingredients or ready to carry
  | 'grinder' // Placed on grinder: being ground (hidden)
  | 'grinder-output' // Grinding done: ground meat bowl at grinder, grabbable
  | 'stuffer' // Placed on stuffer: being stuffed (hidden)
  | 'done' // Stuffing done: bowl no longer needed, sausage exists
  | 'carried'; // Being carried by GrabSystem

/**
 * Complete game state shape including all fields and action methods.
 * Consumed via `useGameStore()` hook throughout the app.
 */
export interface GameState {
  // ---- App lifecycle ----

  /** Current application phase: menu screen, loading screen, or active gameplay */
  appPhase: AppPhase;

  // ---- Progression ----

  /** Index of the current challenge (0-4). Advances via completeChallenge(). */
  currentChallenge: number;
  /** Scores (0-100) from each completed challenge, in order. */
  challengeScores: number[];
  /** High-level game status. Transitions: menu -> playing -> victory/defeat. */
  gameStatus: 'menu' | 'playing' | 'victory' | 'defeat';

  // ---- Current challenge ephemeral state ----

  /** Number of mistakes in the current challenge. 3 strikes = defeat. */
  strikes: number;
  /** Generic progress value (0-100) used by grinding and stuffing challenges. */
  challengeProgress: number;
  /** Pressure level (0-100) in the stuffing challenge. Exceeding burstThreshold = failure. */
  challengePressure: number;
  /** Whether the player is currently pressing/holding in the stuffing challenge. */
  challengeIsPressing: boolean;
  /** Current temperature in the cooking challenge (starts at 70). */
  challengeTemperature: number;
  /** Player's chosen heat level in the cooking challenge (controls temp change rate). */
  challengeHeatLevel: number;

  // ---- Stuffer twist mechanic ----

  /** Normalized positions (0-1) where the player pinched/twisted during stuffing. */
  twistPoints: number[];
  /** Derived sausage form: 'coil' (0 twists) or 'links' (1+ twists). Null until recorded. */
  chosenForm: 'coil' | 'links' | null;
  /** Number of flair twists (simultaneous crank+twist). */
  flairTwistCount: number;
  /** Cumulative flair bonus points earned during stuffing. */
  flairScore: number;

  // ---- Mr. Sausage ----

  /** Current reaction displayed on the CRT TV. Shared between 2D overlays and 3D scene. */
  mrSausageReaction: Reaction;

  // ---- Hints ----

  /** Whether a hint is currently being displayed to the player. */
  hintActive: boolean;
  /** Number of hint tokens remaining for this game session. Starts at 3. */
  hintsRemaining: number;
  /** Total games played across all sessions (persisted). */
  totalGamesPlayed: number;

  // ---- Variant seed ----

  /** Seed for deterministic challenge variant selection. Set to Date.now() on game start. */
  variantSeed: number;

  // ---- Player / spatial ----

  /** Player's current [x, y, z] position in the kitchen (FPS controller writes this). */
  playerPosition: [number, number, number];
  /** Flipped to `true` when the player enters the current challenge station's trigger radius. */
  challengeTriggered: boolean;

  // ---- Grab system ----

  /** ID of the object the player is currently carrying, or null. */
  grabbedObject: string | null;
  /** Type classification of the grabbed object. */
  grabbedObjectType: GrabbedObjectType;

  // ---- Mixing bowl ----

  /** Ingredient IDs that have been dropped into the mixing bowl. */
  bowlContents: string[];
  /** Current location of the mixing bowl in the sausage-making pipeline. */
  bowlPosition: BowlPosition;

  // ---- Blend properties (derived from bowl contents) ----

  /** Hex color of the blended mixture, used for procedural sausage texture. */
  blendColor: string;
  /** Roughness of the blend (0-1), affects PBR material. */
  blendRoughness: number;
  /** Chunkiness of the blend (0-1), affects procedural bump. */
  blendChunkiness: number;

  // ---- Sausage tracking ----

  /** True once the sausage has been placed on the stove pan for cooking. */
  sausagePlaced: boolean;

  // ---- Fridge challenge bridge (3D <-> 2D communication) ----

  /** The 12 ingredients currently displayed in the fridge. */
  fridgePool: Ingredient[];
  /** Indices into fridgePool that satisfy the current variant's demand. */
  fridgeMatchingIndices: number[];
  /** Indices the player has already selected (correct or not). */
  fridgeSelectedIndices: number[];
  /** Set by 3D FridgeStation on click; consumed by 2D IngredientChallenge overlay. */
  pendingFridgeClick: number | null;
  /** Index of the ingredient the player is hovering over (for highlight). */
  fridgeHoveredIndex: number | null;

  // ---- Settings (persisted) ----

  /** Music volume level 0-1 */
  musicVolume: number;
  /** Sound effects volume level 0-1 */
  sfxVolume: number;
  /** Whether music is muted */
  musicMuted: boolean;
  /** Whether sound effects are muted */
  sfxMuted: boolean;

  // ---- Actions ----

  /** Transition the app to a different phase (menu/loading/playing). */
  setAppPhase: (phase: AppPhase) => void;
  /** Reset all game state and start a fresh game. Increments totalGamesPlayed. */
  startNewGame: () => void;
  /** Resume from current challenge without resetting progression (e.g., after app backgrounding). */
  continueGame: () => void;
  /** Record a challenge score and advance to the next challenge. Sets gameStatus to 'victory' on last challenge. */
  completeChallenge: (score: number) => void;
  /** Add a strike to the current challenge. 3 strikes triggers 'defeat' status. */
  addStrike: () => void;
  /** Consume a hint token (if any remain) and activate the hint display. */
  useHint: () => void;
  /** Update the generic challenge progress value (0-100). */
  setChallengeProgress: (progress: number) => void;
  /** Update the stuffing challenge pressure level. */
  setChallengePressure: (pressure: number) => void;
  /** Set whether the player is actively pressing in the stuffing challenge. */
  setChallengeIsPressing: (pressing: boolean) => void;
  /** Update the cooking challenge temperature. */
  setChallengeTemperature: (temperature: number) => void;
  /** Set the player's chosen heat level in the cooking challenge. */
  setChallengeHeatLevel: (heatLevel: number) => void;
  /** Change Mr. Sausage's reaction on the CRT TV (idle, happy, angry, etc.). */
  setMrSausageReaction: (reaction: Reaction) => void;
  /** Show or hide the hint overlay. */
  setHintActive: (active: boolean) => void;
  /** Populate the fridge with a new ingredient pool and identify which indices match the demand. */
  setFridgePool: (pool: Ingredient[], matching: number[]) => void;
  /** Signal from 3D FridgeStation that the player clicked ingredient at `index`. */
  triggerFridgeClick: (index: number) => void;
  /** Clear the pending fridge click after the 2D overlay has processed it. */
  clearFridgeClick: () => void;
  /** Mark a fridge ingredient as selected by the player. */
  addFridgeSelected: (index: number) => void;
  /** Set which fridge ingredient is being hovered (or null to clear). */
  setFridgeHovered: (index: number | null) => void;
  /** Pick up or drop an object. Pass null to drop. */
  setGrabbedObject: (id: string | null, type?: GrabbedObjectType) => void;
  /** Add an ingredient to the mixing bowl by ID. Auto-updates blend properties. */
  addToBowl: (ingredientId: string) => void;
  /** Empty the mixing bowl and reset blend properties to defaults. */
  clearBowl: () => void;
  /** Move the mixing bowl to a new pipeline position. */
  setBowlPosition: (pos: BowlPosition) => void;
  /** Mark the sausage as placed on the stove pan for cooking. */
  setSausagePlaced: () => void;
  /** Recompute blendColor/blendRoughness/blendChunkiness from current bowlContents. */
  updateBlendProperties: () => void;
  /** Update the player's world-space position (written by FPS controller every frame). */
  setPlayerPosition: (pos: [number, number, number]) => void;
  /** Signal that the player has entered the current challenge station's trigger zone. */
  triggerChallenge: () => void;
  /** Set music volume (clamped to 0-1). */
  setMusicVolume: (volume: number) => void;
  /** Set sound effects volume (clamped to 0-1). */
  setSfxVolume: (volume: number) => void;
  /** Toggle music mute state. */
  setMusicMuted: (muted: boolean) => void;
  /** Toggle sound effects mute state. */
  setSfxMuted: (muted: boolean) => void;
  /** Record a twist/pinch at a normalized position (0-1) along the sausage extrusion. */
  recordTwist: (normalizedPosition: number) => void;
  /** Record a flair twist (simultaneous crank+twist expert move). */
  recordFlairTwist: () => void;
  /** Derive chosenForm from twistPoints: 'coil' if 0 twists, 'links' if 1+. */
  recordFormChoice: () => void;
  /** Add flair bonus points with a reason tag. */
  recordFlairPoint: (reason: string, points: number) => void;
  /** Return to the main menu, resetting all ephemeral game state. */
  returnToMenu: () => void;
}

/** Number of sequential challenges in a full game (ingredients through tasting). */
const TOTAL_CHALLENGES = 5;
/** Hint tokens given at the start of each new game. */
const INITIAL_HINTS = 3;
/** Maximum strikes before the game ends in defeat. */
const MAX_STRIKES = 3;

/**
 * Adapts BlendCalculator output to the flat store shape.
 * Always delegates to the canonical computeBlendProperties from BlendCalculator —
 * no local defaults or divergent logic.
 *
 * @param bowlContents - Array of ingredient IDs currently in the bowl
 * @returns Object with blendColor (hex), blendRoughness (0-1), blendChunkiness (0-1)
 */
function mapBlendToStore(bowlContents: string[]): {
  blendColor: string;
  blendRoughness: number;
  blendChunkiness: number;
} {
  const props = computeBlend(bowlContents);
  return {
    blendColor: props.color,
    blendRoughness: props.roughness,
    blendChunkiness: props.chunkiness,
  };
}

/**
 * Default values for all game state fields. Used for initial store creation
 * and as the reset target for startNewGame/returnToMenu/continueGame.
 */
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
  twistPoints: [] as number[],
  chosenForm: null as 'coil' | 'links' | null,
  flairTwistCount: 0,
  flairScore: 0,
  mrSausageReaction: 'idle' as Reaction,
  hintActive: false,
  hintsRemaining: INITIAL_HINTS,
  totalGamesPlayed: 0,
  variantSeed: 0,
  grabbedObject: null as string | null,
  grabbedObjectType: null as GrabbedObjectType,
  bowlContents: [] as string[],
  bowlPosition: 'fridge' as BowlPosition,
  blendColor: '#808080',
  blendRoughness: 0.7,
  blendChunkiness: 0,
  sausagePlaced: false,
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

/**
 * The Zustand store hook. Use `useGameStore(selector)` in components to
 * subscribe to specific slices of state. Persists progress and settings
 * to AsyncStorage under the key 'will-it-blow-save'.
 */
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
          twistPoints: [],
          chosenForm: null,
          flairTwistCount: 0,
          flairScore: 0,
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
          sausagePlaced: false,
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
          twistPoints: [],
          chosenForm: null,
          flairTwistCount: 0,
          flairScore: 0,
          grabbedObject: null,
          grabbedObjectType: null,
          bowlContents: [],
          bowlPosition: 'fridge' as BowlPosition,
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
          sausagePlaced: false,
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

          // Bowl/sausage transitions per challenge completion:
          // Challenge 0 (ingredients) → bowl stays at fridge, player carries to grinder
          // Challenge 1 (grinding) → ground meat bowl appears at grinder output
          // Challenge 2 (stuffing) → bowl done, sausage spawns at stuffer output
          let bowlPosition = state.bowlPosition;
          let sausagePlaced = state.sausagePlaced;
          if (state.currentChallenge === 1) {
            bowlPosition = 'grinder-output';
          } else if (state.currentChallenge === 2) {
            bowlPosition = 'done';
            sausagePlaced = false;
          }

          return {
            challengeScores: scores,
            currentChallenge: nextChallenge,
            strikes: 0,
            challengeProgress: 0,
            challengePressure: 0,
            challengeIsPressing: false,
            challengeTemperature: 70,
            challengeHeatLevel: 0,
            twistPoints: [],
            chosenForm: null,
            flairTwistCount: 0,
            flairScore: 0,
            hintActive: false,
            challengeTriggered: false,
            gameStatus: isLastChallenge ? 'victory' : state.gameStatus,
            bowlPosition,
            sausagePlaced,
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

      setSausagePlaced: () => set({sausagePlaced: true}),

      updateBlendProperties: () => set(state => mapBlendToStore(state.bowlContents)),

      setPlayerPosition: (pos: [number, number, number]) => set({playerPosition: pos}),
      triggerChallenge: () => set({challengeTriggered: true}),

      setMusicVolume: (volume: number) => set({musicVolume: Math.max(0, Math.min(1, volume))}),
      setSfxVolume: (volume: number) => set({sfxVolume: Math.max(0, Math.min(1, volume))}),
      setMusicMuted: (muted: boolean) => set({musicMuted: muted}),
      setSfxMuted: (muted: boolean) => set({sfxMuted: muted}),

      recordTwist: (normalizedPosition: number) =>
        set(state => ({twistPoints: [...state.twistPoints, normalizedPosition]})),

      recordFlairTwist: () => set(state => ({flairTwistCount: state.flairTwistCount + 1})),

      recordFormChoice: () =>
        set(state => ({
          chosenForm: state.twistPoints.length > 0 ? 'links' : 'coil',
        })),

      recordFlairPoint: (_reason: string, points: number) =>
        set(state => ({flairScore: state.flairScore + points})),

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
          twistPoints: [],
          chosenForm: null,
          flairTwistCount: 0,
          flairScore: 0,
          mrSausageReaction: 'idle' as Reaction,
          hintActive: false,
          grabbedObject: null,
          grabbedObjectType: null,
          bowlContents: [],
          bowlPosition: 'fridge' as BowlPosition,
          blendColor: '#888888',
          blendRoughness: 0.5,
          blendChunkiness: 0.5,
          sausagePlaced: false,
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
