/**
 * @module ecs/kootaWorld
 * Koota ECS world singleton for Will It Blow?
 * Creates and exports a single world instance used across the game.
 *
 * Named kootaWorld to avoid conflict with the legacy miniplex world.ts.
 * Once the miniplex migration is complete, this can be renamed to world.ts.
 */
import {createWorld} from 'koota';

/** The singleton Koota ECS world instance. */
export const ecsWorld = createWorld();

/**
 * Resets the world by destroying all entities.
 * Useful for game restarts and testing.
 */
export function resetWorld(): void {
  ecsWorld.reset();
}
