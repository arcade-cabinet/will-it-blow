/**
 * @module ecs/actions
 * Koota ECS actions for Will It Blow?
 * Mutation functions that operate on the ECS world.
 */
import {createActions} from 'koota';
import {
  BlowoutTrait,
  ChopperTrait,
  DemandTrait,
  GrinderTrait,
  IngredientTrait,
  PhaseTag,
  PlayerTrait,
  RoundTrait,
  SausageTrait,
  ScoreTrait,
  StationTrait,
  StoveTrait,
  StufferTrait,
  toJsonArray,
} from './traits';

export const gameActions = createActions(world => ({
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
        roundScoresJson: '[]',
        usedCombosJson: '[]',
      }),
    );
  },

  /** Spawn the player singleton. */
  spawnPlayer(difficulty: string = 'medium', maxStrikes: number = 3) {
    return world.spawn(PlayerTrait({difficulty, maxStrikes, strikes: 0}));
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
  setStuffLevel(entity: ReturnType<typeof world.spawn>, level: number) {
    entity.set(StufferTrait, {fillLevel: Math.max(0, Math.min(1, level))});
  },

  /** Set the cook level on a stove entity. */
  setCookLevel(entity: ReturnType<typeof world.spawn>, level: number) {
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

  /** Update the game phase. */
  setPhase(entity: ReturnType<typeof world.spawn>, phase: string) {
    entity.set(PhaseTag, {phase});
  },
}));
