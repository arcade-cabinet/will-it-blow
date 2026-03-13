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

  // POC Gameplay State
  gamePhase: GamePhase;
  groundMeatVol: number; // 0.0 to 1.0
  stuffLevel: number; // 0.0 to 1.0
  cookLevel: number; // 0.0 to 1.0

  // Scoring State
  selectedIngredientId: string | null;
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
  setIntroActive: (active: boolean) => void;
  setIntroPhase: (phase: number) => void;
  setPosture: (posture: Posture) => void;
  setIdleTime: (time: number) => void;

  setGamePhase: (phase: GamePhase) => void;
  setGroundMeatVol: (vol: number | ((prev: number) => number)) => void;
  setStuffLevel: (level: number | ((prev: number) => number)) => void;
  setCookLevel: (level: number | ((prev: number) => number)) => void;

  setSelectedIngredientId: (id: string | null) => void;
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

  gamePhase: 'SELECT_INGREDIENTS',
  groundMeatVol: 0,
  stuffLevel: 0,
  cookLevel: 0,

  selectedIngredientId: null,
  mrSausageReaction: 'idle',
  mrSausageDemands: null,
  finalScore: null,

  currentDialogueLine: null,
  dialogueActive: false,

  joystick: {x: 0, y: 0},
  lookDelta: {x: 0, y: 0},
  interactPulse: 0,

  setAppPhase: phase => set({appPhase: phase}),
  setIntroActive: active => set({introActive: active}),
  setIntroPhase: phase => set({introPhase: phase}),
  setPosture: posture => set({posture, idleTime: 0}),
  setIdleTime: time => set({idleTime: time}),

  setGamePhase: phase => set({gamePhase: phase}),
  setGroundMeatVol: vol =>
    set(state => ({groundMeatVol: typeof vol === 'function' ? vol(state.groundMeatVol) : vol})),
  setStuffLevel: level =>
    set(state => ({stuffLevel: typeof level === 'function' ? level(state.stuffLevel) : level})),
  setCookLevel: level =>
    set(state => ({cookLevel: typeof level === 'function' ? level(state.cookLevel) : level})),

  setSelectedIngredientId: id => set({selectedIngredientId: id}),
  setMrSausageReaction: reaction => set({mrSausageReaction: reaction}),

  setCurrentDialogueLine: line => set({currentDialogueLine: line}),
  setDialogueActive: active => set({dialogueActive: active}),

  setJoystick: (x, y) => set({joystick: {x, y}}),
  addLookDelta: (dx, dy) =>
    set(state => ({lookDelta: {x: state.lookDelta.x + dx, y: state.lookDelta.y + dy}})),
  consumeLookDelta: () => {
    const delta = get().lookDelta;
    set({lookDelta: {x: 0, y: 0}});
    return delta;
  },
  triggerInteract: () => set(state => ({interactPulse: state.interactPulse + 1})),

  generateDemands: () => {
    // Generate random demands for this round
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

  calculateFinalScore: () => {
    const state = get();
    if (!state.mrSausageDemands || !state.selectedIngredientId) return;

    const result = calculateDemandBonus(
      state.mrSausageDemands,
      state.selectedIngredientId,
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
