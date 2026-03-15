/**
 * @module ecs/kootaWorld
 * Koota ECS world singleton for Will It Blow?
 * Creates and exports a single world instance used across the game.
 *
 * All singleton entities (AppTrait, PlayerTrait, PhaseTag, etc.) are
 * spawned on import so they're available before any component mounts.
 */
import {createWorld} from 'koota';
import {
  AppTrait,
  MrSausageTrait,
  PhaseTag,
  PlayerTrait,
  RoundTrait,
  ScoreTrait,
  SelectedIngredientsTrait,
  StationGameplayTrait,
} from './traits';

/** The singleton Koota ECS world instance. */
export const ecsWorld = createWorld();

/** Spawn all singleton entities. Idempotent — checks before spawning. */
function bootstrapSingletons() {
  if (ecsWorld.query(AppTrait).length === 0) {
    ecsWorld.spawn(AppTrait);
  }
  if (ecsWorld.query(PhaseTag).length === 0) {
    ecsWorld.spawn(PhaseTag);
  }
  if (ecsWorld.query(PlayerTrait).length === 0) {
    ecsWorld.spawn(PlayerTrait);
  }
  if (ecsWorld.query(RoundTrait).length === 0) {
    ecsWorld.spawn(RoundTrait);
  }
  if (ecsWorld.query(ScoreTrait).length === 0) {
    ecsWorld.spawn(ScoreTrait);
  }
  if (ecsWorld.query(SelectedIngredientsTrait).length === 0) {
    ecsWorld.spawn(SelectedIngredientsTrait);
  }
  if (ecsWorld.query(StationGameplayTrait).length === 0) {
    ecsWorld.spawn(StationGameplayTrait);
  }
  if (ecsWorld.query(MrSausageTrait).length === 0) {
    ecsWorld.spawn(MrSausageTrait);
  }
}

// Auto-bootstrap on import
bootstrapSingletons();

/** Callbacks invoked after world reset (used by hooks to invalidate cache). */
const resetCallbacks: Array<() => void> = [];

/** Register a callback to run after world reset. */
export function onWorldReset(cb: () => void): void {
  resetCallbacks.push(cb);
}

/**
 * Resets the world by destroying all entities, then re-bootstraps singletons.
 * Useful for game restarts and testing.
 */
export function resetWorld(): void {
  ecsWorld.reset();
  bootstrapSingletons();
  for (const cb of resetCallbacks) {
    cb();
  }
}
