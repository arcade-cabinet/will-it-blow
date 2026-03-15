/**
 * @module ecs/hooks
 * React hooks for reading/writing Koota ECS state.
 *
 * These hooks provide the same ergonomic API that components had with Zustand:
 *   const gamePhase = useGamePhase();
 *   const actions = useGameActions();
 *   actions.setGamePhase('CHOPPING');
 *
 * They use useSyncExternalStore to subscribe to Koota ECS entities
 * via the module-level singleton world.
 */
import {useSyncExternalStore} from 'react';
import type {Reaction} from '../characters/reactions';
import {calculateDemandBonus} from '../engine/DemandScoring';
import {ecsWorld, onWorldReset} from './kootaWorld';
import {
  AppTrait,
  DemandTrait,
  MrSausageTrait,
  PhaseTag,
  PlayerTrait,
  parseJsonArray,
  RoundTrait,
  ScoreTrait,
  SelectedIngredientsTrait,
  StationGameplayTrait,
  toJsonArray,
} from './traits';

// ==========================================================================
// Type exports (replaces the ones from gameStore.ts)
// ==========================================================================

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

export type Posture = 'prone' | 'sitting' | 'standing';

// ==========================================================================
// Internal helpers — singleton entity access
// ==========================================================================

function getSingleton<T>(traitDef: T): any {
  const entities = ecsWorld.query(traitDef as any);
  return entities.length > 0 ? entities[0] : undefined;
}

function getTraitValue<T>(traitDef: T): any {
  const entity = getSingleton(traitDef);
  return entity ? entity.get(traitDef) : undefined;
}

// ==========================================================================
// Subscription-based store for React
// ==========================================================================

type Listener = () => void;

/** Global listener set for store subscriptions. */
const listeners = new Set<Listener>();
let version = 0;
let cachedSnapshot: (GameState & GameActions) | null = null;
let cachedVersion = -1;

/** Notify all subscribers that ECS state has changed. */
function notify() {
  version++;
  cachedSnapshot = null; // Invalidate cache
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Invalidate cache when world is reset (e.g. in tests)
onWorldReset(() => notify());

// ==========================================================================
// State snapshot — the "store"
// ==========================================================================

export interface GameState {
  appPhase: 'title' | 'playing' | 'results';
  introActive: boolean;
  introPhase: number;
  posture: Posture;
  idleTime: number;

  difficulty: string;
  currentRound: number;
  totalRounds: number;
  usedIngredientCombos: string[][];

  gamePhase: GamePhase;
  groundMeatVol: number;
  stuffLevel: number;
  casingTied: boolean;
  cookLevel: number;

  selectedIngredientIds: string[];
  mrSausageReaction: Reaction;
  mrSausageDemands: {
    desiredTags: string[];
    hatedTags: string[];
    cookPreference: 'rare' | 'medium' | 'well-done' | 'charred';
  } | null;
  finalScore: {
    calculated: boolean;
    totalScore: number;
    breakdown: string;
  } | null;

  playerDecisions: {
    flairPoints: {reason: string; points: number}[];
  };

  playerPosition: {x: number; y: number; z: number};
  joystick: {x: number; y: number};
  lookDelta: {x: number; y: number};
  interactPulse: number;
}

export interface GameActions {
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
  recordFlairPoint: (reason: string, points: number) => void;

  returnToMenu: () => void;
  startNewGame: () => void;

  setPlayerPosition: (x: number, y: number, z: number) => void;
  setJoystick: (x: number, y: number) => void;
  addLookDelta: (dx: number, dy: number) => void;
  consumeLookDelta: () => {x: number; y: number};
  triggerInteract: () => void;
}

// ==========================================================================
// Read state snapshot from ECS
// ==========================================================================

function getSnapshot(): GameState & GameActions {
  // Return cached snapshot if version hasn't changed
  if (cachedSnapshot !== null && cachedVersion === version) {
    return cachedSnapshot;
  }

  const app = getTraitValue(AppTrait);
  const player = getTraitValue(PlayerTrait);
  const phase = getTraitValue(PhaseTag);
  const round = getTraitValue(RoundTrait);
  const sg = getTraitValue(StationGameplayTrait);
  const sel = getTraitValue(SelectedIngredientsTrait);
  const mr = getTraitValue(MrSausageTrait);
  const demand = getTraitValue(DemandTrait);
  const score = getTraitValue(ScoreTrait);

  const snapshot: GameState & GameActions = {
    // State
    appPhase: (app?.appPhase ?? 'title') as 'title' | 'playing' | 'results',
    introActive: player?.introActive ?? true,
    introPhase: player?.introPhase ?? 0,
    posture: (player?.posture ?? 'prone') as Posture,
    idleTime: player?.idleTime ?? 0,

    difficulty: round?.difficulty ?? 'medium',
    currentRound: round?.currentRound ?? 1,
    totalRounds: round?.totalRounds ?? 3,
    usedIngredientCombos: parseJsonArray<string[]>(round?.usedCombosJson ?? '[]'),

    gamePhase: (phase?.phase ?? 'SELECT_INGREDIENTS') as GamePhase,
    groundMeatVol: sg?.groundMeatVol ?? 0,
    stuffLevel: sg?.stuffLevel ?? 0,
    casingTied: sg?.casingTied ?? false,
    cookLevel: sg?.cookLevel ?? 0,

    selectedIngredientIds: parseJsonArray<string>(sel?.idsJson ?? '[]'),
    mrSausageReaction: (mr?.reaction ?? 'idle') as Reaction,
    mrSausageDemands: demand
      ? {
          desiredTags: parseJsonArray<string>(demand.desiredTagsJson),
          hatedTags: parseJsonArray<string>(demand.hatedTagsJson),
          cookPreference: demand.cookPreference as 'rare' | 'medium' | 'well-done' | 'charred',
        }
      : null,
    finalScore: score?.calculated
      ? {
          calculated: true,
          totalScore: score.totalScore,
          breakdown: score.breakdown,
        }
      : null,

    playerDecisions: {
      flairPoints: parseJsonArray<{reason: string; points: number}>(score?.flairPointsJson ?? '[]'),
    },

    playerPosition: {x: player?.posX ?? 0, y: player?.posY ?? 0, z: player?.posZ ?? 0},
    joystick: {x: player?.joystickX ?? 0, y: player?.joystickY ?? 0},
    lookDelta: {x: player?.lookDeltaX ?? 0, y: player?.lookDeltaY ?? 0},
    interactPulse: player?.interactPulse ?? 0,

    // Actions
    ...actions,
  };

  cachedSnapshot = snapshot;
  cachedVersion = version;
  return snapshot;
}

// ==========================================================================
// Actions implementation
// ==========================================================================

const actions: GameActions = {
  setAppPhase(phase: 'title' | 'playing' | 'results') {
    const e = getSingleton(AppTrait);
    if (e) {
      e.set(AppTrait, {appPhase: phase});
      notify();
    }
  },

  setDifficulty(diff: string, total: number) {
    const e = getSingleton(RoundTrait);
    if (e) {
      e.set(RoundTrait, {
        difficulty: diff,
        totalRounds: total,
        currentRound: 1,
        usedCombosJson: '[]',
      });
      notify();
    }
  },

  nextRound() {
    const roundE = getSingleton(RoundTrait);
    const selE = getSingleton(SelectedIngredientsTrait);
    const sgE = getSingleton(StationGameplayTrait);
    const phaseE = getSingleton(PhaseTag);
    const scoreE = getSingleton(ScoreTrait);

    if (roundE) {
      const round = roundE.get(RoundTrait);
      const selectedIds = selE
        ? parseJsonArray<string>(selE.get(SelectedIngredientsTrait).idsJson)
        : [];
      const usedCombos = parseJsonArray<string[]>(round.usedCombosJson);

      const newCombos =
        selectedIds.length > 0 ? [...usedCombos, [...selectedIds].sort()] : usedCombos;

      roundE.set(RoundTrait, {
        usedCombosJson: toJsonArray(newCombos),
        currentRound: round.currentRound + 1,
      });
    }

    if (phaseE) phaseE.set(PhaseTag, {phase: 'SELECT_INGREDIENTS'});
    if (sgE) {
      sgE.set(StationGameplayTrait, {
        groundMeatVol: 0,
        stuffLevel: 0,
        casingTied: false,
        cookLevel: 0,
      });
    }
    if (selE) selE.set(SelectedIngredientsTrait, {idsJson: '[]'});
    if (scoreE) {
      scoreE.set(ScoreTrait, {
        calculated: false,
        totalScore: 0,
        breakdown: '',
        tasteScore: 0,
        textureScore: 0,
        tagBonus: 0,
        cookBonus: 0,
        blowBonus: 0,
        rank: '',
        flairPointsJson: '[]',
      });
    }
    notify();
  },

  setIntroActive(active: boolean) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {introActive: active});
      notify();
    }
  },

  setIntroPhase(phase: number) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {introPhase: phase});
      notify();
    }
  },

  setPosture(posture: Posture) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {posture, idleTime: 0});
      notify();
    }
  },

  setIdleTime(time: number) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {idleTime: time});
      notify();
    }
  },

  setGamePhase(phase: GamePhase) {
    const e = getSingleton(PhaseTag);
    if (e) {
      e.set(PhaseTag, {phase});
      notify();
    }
  },

  setGroundMeatVol(vol: number | ((prev: number) => number)) {
    const e = getSingleton(StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof vol === 'function' ? vol(current.groundMeatVol) : vol;
      e.set(StationGameplayTrait, {groundMeatVol: newVal});
      notify();
    }
  },

  setStuffLevel(level: number | ((prev: number) => number)) {
    const e = getSingleton(StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof level === 'function' ? level(current.stuffLevel) : level;
      e.set(StationGameplayTrait, {stuffLevel: newVal});
      notify();
    }
  },

  setCasingTied(tied: boolean) {
    const e = getSingleton(StationGameplayTrait);
    if (e) {
      e.set(StationGameplayTrait, {casingTied: tied});
      notify();
    }
  },

  setCookLevel(level: number | ((prev: number) => number)) {
    const e = getSingleton(StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof level === 'function' ? level(current.cookLevel) : level;
      e.set(StationGameplayTrait, {cookLevel: newVal});
      notify();
    }
  },

  addSelectedIngredientId(id: string) {
    const e = getSingleton(SelectedIngredientsTrait);
    if (e) {
      const current = parseJsonArray<string>(e.get(SelectedIngredientsTrait).idsJson);
      e.set(SelectedIngredientsTrait, {idsJson: toJsonArray([...current, id])});
      notify();
    }
  },

  setMrSausageReaction(reaction: Reaction) {
    const e = getSingleton(MrSausageTrait);
    if (e) {
      e.set(MrSausageTrait, {reaction});
      notify();
    }
  },

  generateDemands() {
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

    let e = getSingleton(DemandTrait);
    if (!e) {
      e = ecsWorld.spawn(DemandTrait);
    }
    e.set(DemandTrait, {
      desiredTagsJson: toJsonArray([shuffled[0], shuffled[1]]),
      hatedTagsJson: toJsonArray([shuffled[2]]),
      cookPreference: cookPrefs[Math.floor(Math.random() * cookPrefs.length)],
    });
    notify();
  },

  calculateFinalScore() {
    const demandE = getSingleton(DemandTrait);
    const selE = getSingleton(SelectedIngredientsTrait);
    const sgE = getSingleton(StationGameplayTrait);
    const scoreE = getSingleton(ScoreTrait);

    if (!demandE || !selE || !scoreE) return;

    const demands = demandE.get(DemandTrait);
    const selectedIds = parseJsonArray<string>(selE.get(SelectedIngredientsTrait).idsJson);
    const cookLevel = sgE ? sgE.get(StationGameplayTrait).cookLevel : 0;

    if (selectedIds.length === 0) return;

    const result = calculateDemandBonus(
      {
        desiredTags: parseJsonArray<string>(demands.desiredTagsJson),
        hatedTags: parseJsonArray<string>(demands.hatedTagsJson),
        cookPreference: demands.cookPreference,
      },
      selectedIds,
      cookLevel,
    );

    scoreE.set(ScoreTrait, {
      calculated: true,
      totalScore: result.totalScore,
      breakdown: result.breakdown,
    });
    notify();
  },

  recordFlairPoint(reason: string, points: number) {
    const e = getSingleton(ScoreTrait);
    if (e) {
      const current = parseJsonArray<{reason: string; points: number}>(
        e.get(ScoreTrait).flairPointsJson,
      );
      e.set(ScoreTrait, {
        flairPointsJson: toJsonArray([...current, {reason, points}]),
      });
      notify();
    }
  },

  returnToMenu() {
    const appE = getSingleton(AppTrait);
    const playerE = getSingleton(PlayerTrait);
    const phaseE = getSingleton(PhaseTag);
    const sgE = getSingleton(StationGameplayTrait);
    const selE = getSingleton(SelectedIngredientsTrait);
    const scoreE = getSingleton(ScoreTrait);
    const roundE = getSingleton(RoundTrait);
    const mrE = getSingleton(MrSausageTrait);

    if (appE) appE.set(AppTrait, {appPhase: 'title'});
    if (playerE) {
      playerE.set(PlayerTrait, {
        introActive: true,
        introPhase: 0,
        posture: 'prone',
        idleTime: 0,
      });
    }
    if (phaseE) phaseE.set(PhaseTag, {phase: 'SELECT_INGREDIENTS'});
    if (sgE) {
      sgE.set(StationGameplayTrait, {
        groundMeatVol: 0,
        stuffLevel: 0,
        casingTied: false,
        cookLevel: 0,
      });
    }
    if (selE) selE.set(SelectedIngredientsTrait, {idsJson: '[]'});
    if (mrE) mrE.set(MrSausageTrait, {reaction: 'idle'});
    if (roundE) {
      roundE.set(RoundTrait, {
        currentRound: 1,
        usedCombosJson: '[]',
      });
    }
    if (scoreE) {
      scoreE.set(ScoreTrait, {
        calculated: false,
        totalScore: 0,
        breakdown: '',
        tasteScore: 0,
        textureScore: 0,
        tagBonus: 0,
        cookBonus: 0,
        blowBonus: 0,
        rank: '',
        flairPointsJson: '[]',
      });
    }
    // Destroy demand entity
    const demandE = getSingleton(DemandTrait);
    if (demandE) demandE.destroy();
    notify();
  },

  startNewGame() {
    const appE = getSingleton(AppTrait);
    const playerE = getSingleton(PlayerTrait);
    const phaseE = getSingleton(PhaseTag);
    const sgE = getSingleton(StationGameplayTrait);
    const selE = getSingleton(SelectedIngredientsTrait);
    const scoreE = getSingleton(ScoreTrait);
    const roundE = getSingleton(RoundTrait);
    const mrE = getSingleton(MrSausageTrait);

    if (appE) appE.set(AppTrait, {appPhase: 'playing'});
    if (playerE) playerE.set(PlayerTrait, {introActive: false, posture: 'standing'});
    if (phaseE) phaseE.set(PhaseTag, {phase: 'SELECT_INGREDIENTS'});
    if (sgE) {
      sgE.set(StationGameplayTrait, {
        groundMeatVol: 0,
        stuffLevel: 0,
        casingTied: false,
        cookLevel: 0,
      });
    }
    if (selE) selE.set(SelectedIngredientsTrait, {idsJson: '[]'});
    if (mrE) mrE.set(MrSausageTrait, {reaction: 'idle'});
    if (roundE) {
      roundE.set(RoundTrait, {
        currentRound: 1,
        usedCombosJson: '[]',
      });
    }
    if (scoreE) {
      scoreE.set(ScoreTrait, {
        calculated: false,
        totalScore: 0,
        breakdown: '',
        tasteScore: 0,
        textureScore: 0,
        tagBonus: 0,
        cookBonus: 0,
        blowBonus: 0,
        rank: '',
        flairPointsJson: '[]',
      });
    }
    // Destroy demand entity
    const demandE = getSingleton(DemandTrait);
    if (demandE) demandE.destroy();
    notify();
  },

  setPlayerPosition(x: number, y: number, z: number) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {posX: x, posY: y, posZ: z});
      // No notify() — this is called every frame from useFrame.
      // FPSCamera reads it directly from the ECS trait, not via React subscription.
    }
  },

  setJoystick(x: number, y: number) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      e.set(PlayerTrait, {joystickX: x, joystickY: y});
      notify();
    }
  },

  addLookDelta(dx: number, dy: number) {
    const e = getSingleton(PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      e.set(PlayerTrait, {
        lookDeltaX: current.lookDeltaX + dx,
        lookDeltaY: current.lookDeltaY + dy,
      });
      notify();
    }
  },

  consumeLookDelta(): {x: number; y: number} {
    const e = getSingleton(PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      const delta = {x: current.lookDeltaX, y: current.lookDeltaY};
      e.set(PlayerTrait, {lookDeltaX: 0, lookDeltaY: 0});
      // Don't notify — this is a read+reset consumed per-frame, not a user-visible change
      return delta;
    }
    return {x: 0, y: 0};
  },

  triggerInteract() {
    const e = getSingleton(PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      e.set(PlayerTrait, {interactPulse: current.interactPulse + 1});
      notify();
    }
  },
};

// ==========================================================================
// useGameStore — Zustand-compatible hook backed by Koota ECS
// ==========================================================================

/**
 * Zustand-compatible hook that reads game state from Koota ECS.
 *
 * Usage:
 *   const gamePhase = useGameStore(s => s.gamePhase);
 *   const setGamePhase = useGameStore(s => s.setGamePhase);
 *
 * Also supports direct state access:
 *   useGameStore.getState().gamePhase
 *   useGameStore.setState({ gamePhase: 'CHOPPING' })
 */
export function useGameStore<T>(selector: (state: GameState & GameActions) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snapshot);
}

/** Direct access to current state (no React subscription). */
useGameStore.getState = (): GameState & GameActions => getSnapshot();

/** Partial state update — maps fields to ECS trait mutations. */
useGameStore.setState = (partial: Partial<GameState>) => {
  if (partial.appPhase !== undefined) actions.setAppPhase(partial.appPhase);
  if (partial.introActive !== undefined) actions.setIntroActive(partial.introActive);
  if (partial.introPhase !== undefined) actions.setIntroPhase(partial.introPhase);
  if (partial.posture !== undefined) actions.setPosture(partial.posture);
  if (partial.idleTime !== undefined) actions.setIdleTime(partial.idleTime);
  if (partial.gamePhase !== undefined) actions.setGamePhase(partial.gamePhase);
  if (partial.groundMeatVol !== undefined) actions.setGroundMeatVol(partial.groundMeatVol);
  if (partial.stuffLevel !== undefined) actions.setStuffLevel(partial.stuffLevel);
  if (partial.casingTied !== undefined) actions.setCasingTied(partial.casingTied);
  if (partial.cookLevel !== undefined) actions.setCookLevel(partial.cookLevel);
  if (partial.playerPosition !== undefined) {
    actions.setPlayerPosition(
      partial.playerPosition.x,
      partial.playerPosition.y,
      partial.playerPosition.z,
    );
  }
  if (partial.mrSausageReaction !== undefined) {
    actions.setMrSausageReaction(partial.mrSausageReaction);
  }
};
