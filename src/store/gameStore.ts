/**
 * @module gameStore
 * Single Zustand store containing all game state and actions.
 * No React Context -- components subscribe via selectors (e.g. `useGameStore(s => s.gamePhase)`).
 */
import {create} from 'zustand';
import type {Reaction} from '../components/characters/reactions';
import {calculateDemandBonus} from '../engine/DemandScoring';

export type Posture = 'prone' | 'sitting' | 'standing';
export type GamePhase =
  | 'SELECT_INGREDIENTS'
  | 'CHOPPING'
  | 'FILL_GRINDER'
  | 'GRINDING'
  | 'MOVE_BOWL'
  | 'ATTACH_CASING'
  | 'STUFFING'
  | 'TIE_CASING'
  | 'BLOWOUT'
  | 'MOVE_SAUSAGE'
  | 'MOVE_PAN'
  | 'COOKING'
  | 'DONE';

interface GameState {
  appPhase: 'title' | 'playing' | 'results';
  introActive: boolean;
  introPhase: number;
  posture: Posture;
  idleTime: number;

  // Progression & Difficulty
  difficulty: string;
  currentRound: number;
  totalRounds: number;
  usedIngredientCombos: string[][];

  // POC Gameplay State
  gamePhase: GamePhase;
  groundMeatVol: number; // 0.0 to 1.0
  stuffLevel: number; // 0.0 to 1.0
  casingTied: boolean;
  cookLevel: number; // 0.0 to 1.0

  // Scoring State
  selectedIngredientIds: string[];
  mrSausageReaction: Reaction;
  mrSausageDemands: {
    desiredTags: string[];
    hatedTags: string[];
    cookPreference: 'rare' | 'medium' | 'well-done' | 'charred';
  } | null;
  finalScore: any | null;

  // Dialogue State
  currentDialogueLine: any | null;
  dialogueActive: boolean;

  // Input State (for mobile controls bridging to 3D)
  joystick: {x: number; y: number};
  lookDelta: {x: number; y: number};
  interactPulse: number;

  setAppPhase: (phase: 'title' | 'playing' | 'results') => void;
  setDifficulty: (diff: string, total: number) => void;
  nextRound: () => void;

  setIntroActive: (active: boolean) => void;
  setIntroPhase: (phase: number) => void;
  setPosture: (posture: Posture) => void;
  setIdleTime: (time: number) => void;

  setGamePhase: (phase: GamePhase) => void;
  setGroundMeatVol: (vol: number | ((prev: number) => number)) => void;
  setStuffLevel: (level: number | ((prev: number) => number)) => void;
  setCasingTied: (tied: boolean) => void;
  setCookLevel: (level: number | ((prev: number) => number)) => void;

  addSelectedIngredientId: (id: string) => void;
  setMrSausageReaction: (reaction: Reaction) => void;
  generateDemands: () => void;
  calculateFinalScore: () => void;

  setCurrentDialogueLine: (line: any | null) => void;
  setDialogueActive: (active: boolean) => void;

  setJoystick: (x: number, y: number) => void;
  addLookDelta: (dx: number, dy: number) => void;
  consumeLookDelta: () => {x: number; y: number};
  triggerInteract: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  appPhase: 'title',
  introActive: true,
  introPhase: 0,
  posture: 'prone',
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

  currentDialogueLine: null,
  dialogueActive: false,

  joystick: {x: 0, y: 0},
  lookDelta: {x: 0, y: 0},
  interactPulse: 0,

  /** Transition between title, playing, and results screens. */
  setAppPhase: phase => set({appPhase: phase}),

  /**
   * Set difficulty and reset round tracking for a new game session.
   * @param diff - Difficulty ID string.
   * @param total - Total rounds for this difficulty.
   */
  setDifficulty: (diff, total) =>
    set({difficulty: diff, totalRounds: total, currentRound: 1, usedIngredientCombos: []}),

  /**
   * Advance to the next round: archives current ingredient combo,
   * resets all per-round state (cook level, stuff level, etc.).
   */
  nextRound: () =>
    set(state => {
      if (state.selectedIngredientIds.length > 0) {
        state.usedIngredientCombos.push([...state.selectedIngredientIds].sort());
      }
      return {
        currentRound: state.currentRound + 1,
        gamePhase: 'SELECT_INGREDIENTS',
        groundMeatVol: 0,
        stuffLevel: 0,
        casingTied: false,
        cookLevel: 0,
        selectedIngredientIds: [],
        finalScore: null,
      };
    }),

  setIntroActive: active => set({introActive: active}),
  setIntroPhase: phase => set({introPhase: phase}),
  setPosture: posture => set({posture, idleTime: 0}),
  setIdleTime: time => set({idleTime: time}),

  setGamePhase: phase => set({gamePhase: phase}),
  setGroundMeatVol: vol =>
    set(state => ({groundMeatVol: typeof vol === 'function' ? vol(state.groundMeatVol) : vol})),
  setStuffLevel: level =>
    set(state => ({stuffLevel: typeof level === 'function' ? level(state.stuffLevel) : level})),
  setCasingTied: tied => set({casingTied: tied}),
  setCookLevel: level =>
    set(state => ({cookLevel: typeof level === 'function' ? level(state.cookLevel) : level})),

  addSelectedIngredientId: id =>
    set(state => ({selectedIngredientIds: [...state.selectedIngredientIds, id]})),
  setMrSausageReaction: reaction => set({mrSausageReaction: reaction}),

  setCurrentDialogueLine: line => set({currentDialogueLine: line}),
  setDialogueActive: active => set({dialogueActive: active}),

  /** Update virtual joystick position from mobile touch controls. */
  setJoystick: (x, y) => set({joystick: {x, y}}),

  /** Accumulate look deltas from touch/swipe; consumed by the camera controller each frame. */
  addLookDelta: (dx, dy) =>
    set(state => ({lookDelta: {x: state.lookDelta.x + dx, y: state.lookDelta.y + dy}})),

  /** Read and reset accumulated look delta (one-shot consumption pattern). */
  consumeLookDelta: () => {
    const delta = get().lookDelta;
    set({lookDelta: {x: 0, y: 0}});
    return delta;
  },
  triggerInteract: () => set(state => ({interactPulse: state.interactPulse + 1})),

  /** Randomly generate Mr. Sausage's hidden demands (desired/hated tags + cook preference) for this round. */
  generateDemands: () => {
    const possibleTags = [
      'sweet',
      'savory',
      'meat',
      'spicy',
      'comfort',
      'absurd',
      'fast-food',
      'chunky',
      'smooth',
    ];
    const shuffled = [...possibleTags].sort(() => Math.random() - 0.5);
    const cookPrefs = ['rare', 'medium', 'well-done', 'charred'] as const;

    set({
      mrSausageDemands: {
        desiredTags: [shuffled[0], shuffled[1]],
        hatedTags: [shuffled[2]],
        cookPreference: cookPrefs[Math.floor(Math.random() * cookPrefs.length)],
      },
    });
  },

  /** Calculate the final demand bonus score using current ingredients, cook level, and demands. */
  calculateFinalScore: () => {
    const state = get();
    if (!state.mrSausageDemands || state.selectedIngredientIds.length === 0) return;

    const result = calculateDemandBonus(
      state.mrSausageDemands,
      state.selectedIngredientIds,
      state.cookLevel,
    );

    set({
      finalScore: {
        calculated: true,
        totalScore: result.totalScore,
        breakdown: result.breakdown,
      },
    });
  },
}));
