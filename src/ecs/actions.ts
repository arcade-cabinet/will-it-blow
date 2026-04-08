/**
 * @module ecs/actions
 * Koota ECS actions for Will It Blow?
 * Mutation functions that operate on the ECS world.
 *
 * These replace the Zustand store actions. They read/write singleton
 * entities with traits rather than calling set() on a Zustand store.
 *
 * Determinism note (T0.A): all randomness here routes through
 * `createRunRngOrFallback` so save-scummed reloads regenerate identical
 * demand triples.
 */
import {createActions} from 'koota';
import {calculateDemandBonus} from '../engine/DemandScoring';
import {generateDemand} from '../engine/demandGen';
import {createRunRngOrFallback} from '../engine/RunSeed';
import {
  AppTrait,
  BlowoutTrait,
  ChopperTrait,
  DemandTrait,
  GrinderTrait,
  IngredientTrait,
  MrSausageTrait,
  PhaseTag,
  PlayerTrait,
  parseJsonArray,
  RoundTrait,
  SausageTrait,
  ScoreTrait,
  SelectedIngredientsTrait,
  StationGameplayTrait,
  StationTrait,
  StoveTrait,
  StufferTrait,
  toJsonArray,
} from './traits';

/**
 * Helper: find the first entity matching a trait in the world.
 * Returns undefined if no entity has that trait.
 */
function findSingleton(world: any, traitDef: any) {
  const entities = world.query(traitDef);
  return entities.length > 0 ? entities[0] : undefined;
}

export const gameActions = createActions(world => ({
  // ==========================================================================
  // Initialization — spawn all singleton entities for a fresh game
  // ==========================================================================

  /** Bootstrap the world with all singleton entities. Idempotent. */
  initWorld() {
    if (!findSingleton(world, AppTrait)) {
      world.spawn(AppTrait);
    }
    if (!findSingleton(world, PhaseTag)) {
      world.spawn(PhaseTag);
    }
    if (!findSingleton(world, PlayerTrait)) {
      world.spawn(PlayerTrait);
    }
    if (!findSingleton(world, RoundTrait)) {
      world.spawn(RoundTrait);
    }
    if (!findSingleton(world, ScoreTrait)) {
      world.spawn(ScoreTrait);
    }
    if (!findSingleton(world, SelectedIngredientsTrait)) {
      world.spawn(SelectedIngredientsTrait);
    }
    if (!findSingleton(world, StationGameplayTrait)) {
      world.spawn(StationGameplayTrait);
    }
    if (!findSingleton(world, MrSausageTrait)) {
      world.spawn(MrSausageTrait);
    }
  },

  // ==========================================================================
  // App Phase
  // ==========================================================================

  setAppPhase(phase: string) {
    const e = findSingleton(world, AppTrait);
    if (e) e.set(AppTrait, {appPhase: phase});
  },

  // ==========================================================================
  // Game Phase
  // ==========================================================================

  setGamePhase(phase: string) {
    const e = findSingleton(world, PhaseTag);
    if (e) e.set(PhaseTag, {phase});
  },

  // ==========================================================================
  // Player state
  // ==========================================================================

  setIntroActive(active: boolean) {
    const e = findSingleton(world, PlayerTrait);
    if (e) e.set(PlayerTrait, {introActive: active});
  },

  setIntroPhase(phase: number) {
    const e = findSingleton(world, PlayerTrait);
    if (e) e.set(PlayerTrait, {introPhase: phase});
  },

  setPosture(posture: string) {
    const e = findSingleton(world, PlayerTrait);
    if (e) e.set(PlayerTrait, {posture, idleTime: 0});
  },

  setIdleTime(time: number) {
    const e = findSingleton(world, PlayerTrait);
    if (e) e.set(PlayerTrait, {idleTime: time});
  },

  // ==========================================================================
  // Input state
  // ==========================================================================

  setJoystick(x: number, y: number) {
    const e = findSingleton(world, PlayerTrait);
    if (e) e.set(PlayerTrait, {joystickX: x, joystickY: y});
  },

  addLookDelta(dx: number, dy: number) {
    const e = findSingleton(world, PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      e.set(PlayerTrait, {
        lookDeltaX: current.lookDeltaX + dx,
        lookDeltaY: current.lookDeltaY + dy,
      });
    }
  },

  consumeLookDelta(): {x: number; y: number} {
    const e = findSingleton(world, PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      const delta = {x: current.lookDeltaX, y: current.lookDeltaY};
      e.set(PlayerTrait, {lookDeltaX: 0, lookDeltaY: 0});
      return delta;
    }
    return {x: 0, y: 0};
  },

  triggerInteract() {
    const e = findSingleton(world, PlayerTrait);
    if (e) {
      const current = e.get(PlayerTrait);
      e.set(PlayerTrait, {interactPulse: current.interactPulse + 1});
    }
  },

  // ==========================================================================
  // Difficulty and Round management
  // ==========================================================================

  setDifficulty(diff: string, total: number) {
    const e = findSingleton(world, RoundTrait);
    if (e) {
      e.set(RoundTrait, {
        difficulty: diff,
        totalRounds: total,
        currentRound: 1,
        usedCombosJson: '[]',
      });
    }
  },

  nextRound() {
    const roundE = findSingleton(world, RoundTrait);
    const selE = findSingleton(world, SelectedIngredientsTrait);
    const sgE = findSingleton(world, StationGameplayTrait);
    const phaseE = findSingleton(world, PhaseTag);
    const scoreE = findSingleton(world, ScoreTrait);

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

    // Reset per-round state
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
  },

  // ==========================================================================
  // Station gameplay
  // ==========================================================================

  setGroundMeatVol(vol: number | ((prev: number) => number)) {
    const e = findSingleton(world, StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof vol === 'function' ? vol(current.groundMeatVol) : vol;
      e.set(StationGameplayTrait, {groundMeatVol: newVal});
    }
  },

  setStuffLevel(level: number | ((prev: number) => number)) {
    const e = findSingleton(world, StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof level === 'function' ? level(current.stuffLevel) : level;
      e.set(StationGameplayTrait, {stuffLevel: newVal});
    }
  },

  setCasingTied(tied: boolean) {
    const e = findSingleton(world, StationGameplayTrait);
    if (e) e.set(StationGameplayTrait, {casingTied: tied});
  },

  setCookLevel(level: number | ((prev: number) => number)) {
    const e = findSingleton(world, StationGameplayTrait);
    if (e) {
      const current = e.get(StationGameplayTrait);
      const newVal = typeof level === 'function' ? level(current.cookLevel) : level;
      e.set(StationGameplayTrait, {cookLevel: newVal});
    }
  },

  // ==========================================================================
  // Ingredients
  // ==========================================================================

  addSelectedIngredientId(id: string) {
    const e = findSingleton(world, SelectedIngredientsTrait);
    if (e) {
      const current = parseJsonArray<string>(e.get(SelectedIngredientsTrait).idsJson);
      e.set(SelectedIngredientsTrait, {idsJson: toJsonArray([...current, id])});
    }
  },

  // ==========================================================================
  // Mr. Sausage
  // ==========================================================================

  setMrSausageReaction(reaction: string) {
    const e = findSingleton(world, MrSausageTrait);
    if (e) e.set(MrSausageTrait, {reaction});
  },

  generateDemands() {
    // Seeded so save-scummed reloads regenerate identical demands.
    const rng = createRunRngOrFallback('demands');
    const demand = generateDemand(rng);

    let e = findSingleton(world, DemandTrait);
    if (!e) {
      e = world.spawn(DemandTrait);
    }
    e.set(DemandTrait, {
      desiredTagsJson: toJsonArray([...demand.desiredTags]),
      hatedTagsJson: toJsonArray([...demand.hatedTags]),
      cookPreference: demand.cookPreference,
    });
  },

  // ==========================================================================
  // Scoring
  // ==========================================================================

  calculateFinalScore() {
    const demandE = findSingleton(world, DemandTrait);
    const selE = findSingleton(world, SelectedIngredientsTrait);
    const sgE = findSingleton(world, StationGameplayTrait);
    const scoreE = findSingleton(world, ScoreTrait);

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
  },

  recordFlairPoint(reason: string, points: number) {
    const e = findSingleton(world, ScoreTrait);
    if (e) {
      const current = parseJsonArray<{reason: string; points: number}>(
        e.get(ScoreTrait).flairPointsJson,
      );
      e.set(ScoreTrait, {
        flairPointsJson: toJsonArray([...current, {reason, points}]),
      });
    }
  },

  // ==========================================================================
  // Game lifecycle
  // ==========================================================================

  /** Reset everything and go back to title screen. */
  returnToMenu() {
    const appE = findSingleton(world, AppTrait);
    const playerE = findSingleton(world, PlayerTrait);
    const phaseE = findSingleton(world, PhaseTag);
    const sgE = findSingleton(world, StationGameplayTrait);
    const selE = findSingleton(world, SelectedIngredientsTrait);
    const scoreE = findSingleton(world, ScoreTrait);
    const roundE = findSingleton(world, RoundTrait);
    const mrE = findSingleton(world, MrSausageTrait);

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

    // Clear demands
    const demandE = findSingleton(world, DemandTrait);
    if (demandE) {
      demandE.destroy();
    }
  },

  /** Start a new game (reset round state, keep difficulty). */
  startNewGame() {
    const appE = findSingleton(world, AppTrait);
    const playerE = findSingleton(world, PlayerTrait);
    const phaseE = findSingleton(world, PhaseTag);
    const sgE = findSingleton(world, StationGameplayTrait);
    const selE = findSingleton(world, SelectedIngredientsTrait);
    const scoreE = findSingleton(world, ScoreTrait);
    const roundE = findSingleton(world, RoundTrait);
    const mrE = findSingleton(world, MrSausageTrait);

    if (appE) appE.set(AppTrait, {appPhase: 'playing'});
    if (playerE) playerE.set(PlayerTrait, {introActive: false});
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

    // Clear demands
    const demandE = findSingleton(world, DemandTrait);
    if (demandE) {
      demandE.destroy();
    }
  },

  // ==========================================================================
  // Entity spawning (from original actions.ts)
  // ==========================================================================

  /** Spawn a station entity with the given name and position. */
  spawnStation(name: string, position: [number, number, number]) {
    return world.spawn(
      StationTrait({name, active: false, posX: position[0], posY: position[1], posZ: position[2]}),
    );
  },

  /** Spawn the sausage entity that tracks the assembly pipeline. */
  spawnSausage() {
    return world.spawn(SausageTrait);
  },

  /** Spawn a grinder entity. */
  spawnGrinder() {
    return world.spawn(GrinderTrait);
  },

  /** Spawn a stuffer entity. */
  spawnStuffer() {
    return world.spawn(StufferTrait);
  },

  /** Spawn a stove entity. */
  spawnStove() {
    return world.spawn(StoveTrait);
  },

  /** Spawn a chopper entity. */
  spawnChopper(requiredChops: number = 5) {
    return world.spawn(ChopperTrait({requiredChops, chopCount: 0, active: false}));
  },

  /** Spawn a blowout entity. */
  spawnBlowout() {
    return world.spawn(BlowoutTrait);
  },

  /** Spawn an ingredient entity. */
  spawnIngredient(data: {
    id: string;
    name: string;
    category: string;
    tasteMod: number;
    textureMod: number;
    blowPower: number;
    tags: string[];
  }) {
    return world.spawn(
      IngredientTrait({
        id: data.id,
        name: data.name,
        category: data.category,
        tasteMod: data.tasteMod,
        textureMod: data.textureMod,
        blowPower: data.blowPower,
        tagsJson: toJsonArray(data.tags),
        selected: false,
      }),
    );
  },

  /** Spawn the demand singleton (Mr. Sausage's hidden desires). */
  spawnDemand(desiredTags: string[], hatedTags: string[], cookPreference: string) {
    return world.spawn(
      DemandTrait({
        desiredTagsJson: toJsonArray(desiredTags),
        hatedTagsJson: toJsonArray(hatedTags),
        cookPreference,
      }),
    );
  },

  /** Spawn the score tracking singleton. */
  spawnScore() {
    return world.spawn(ScoreTrait);
  },

  /** Spawn the round tracking singleton. */
  spawnRound(totalRounds: number = 3) {
    return world.spawn(
      RoundTrait({
        currentRound: 1,
        totalRounds,
        difficulty: 'medium',
        roundScoresJson: '[]',
        usedCombosJson: '[]',
      }),
    );
  },

  /** Spawn the player singleton. */
  spawnPlayer(_difficulty: string = 'medium', maxStrikes: number = 3) {
    return world.spawn(PlayerTrait({maxStrikes, strikes: 0}));
  },

  /** Spawn the phase tag singleton. */
  spawnPhase(phase: string = 'SELECT_INGREDIENTS') {
    return world.spawn(PhaseTag({phase}));
  },

  /** Set the grind level on a grinder entity. */
  setGrindLevel(entity: ReturnType<typeof world.spawn>, progress: number) {
    entity.set(GrinderTrait, {grindProgress: Math.max(0, Math.min(1, progress))});
  },

  /** Set the stuff level on a stuffer entity. */
  setStuffLevelEntity(entity: ReturnType<typeof world.spawn>, level: number) {
    entity.set(StufferTrait, {fillLevel: Math.max(0, Math.min(1, level))});
  },

  /** Set the cook level on a stove entity. */
  setCookLevelEntity(entity: ReturnType<typeof world.spawn>, level: number) {
    entity.set(StoveTrait, {cookProgress: Math.max(0, Math.min(1, level))});
  },

  /** Add a chop to the chopper entity. */
  addChop(entity: ReturnType<typeof world.spawn>) {
    const current = entity.get(ChopperTrait);
    if (current) {
      entity.set(ChopperTrait, {chopCount: current.chopCount + 1});
    }
  },

  /** Set the blowout hold duration. */
  setBlowHold(entity: ReturnType<typeof world.spawn>, duration: number) {
    entity.set(BlowoutTrait, {holdDuration: duration});
  },

  /** Mark an ingredient as selected. */
  selectIngredient(entity: ReturnType<typeof world.spawn>) {
    entity.set(IngredientTrait, {selected: true});
  },

  /** Update the game phase (entity-level). */
  setPhase(entity: ReturnType<typeof world.spawn>, phase: string) {
    entity.set(PhaseTag, {phase});
  },
}));
