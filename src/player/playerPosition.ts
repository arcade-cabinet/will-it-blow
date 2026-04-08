/**
 * playerPosition — Shared mutable Vector3 for per-frame sync between
 * `PlayerCapsule` (producer) and `FPSCamera` (consumer).
 *
 * Why a module-level singleton and not the ECS store / a React ref?
 *
 * - Both the producer and the consumer run inside `useFrame`, which bypasses
 *   React entirely. Routing this through `useGameStore` would require either
 *   subscribing (triggering re-renders every frame) or calling `getState()`
 *   which returns a memoized snapshot that is not refreshed until `notify()`
 *   is called — and `setPlayerPosition` intentionally does not notify.
 * - `useFrame` priority ordering places `PlayerCapsule` before `FPSCamera`
 *   (mount order), so the producer always writes before the consumer reads.
 * - A mutable `Vector3` avoids the per-frame object allocation (GC pressure)
 *   that the previous `window.__playerPos = {x, y, z}` pattern caused.
 * - The previous `window` side-channel with `as any` cast violated the
 *   project's typing discipline; exporting a typed singleton fixes that.
 *
 * The same pattern is already used for camera yaw/pitch state in
 * `useMouseLook.ts`, so this is consistent with the existing codebase.
 *
 * Initialized to the player spawn position so the very first frame (before
 * `PlayerCapsule` has a chance to write) still has a valid value.
 */
import {Vector3} from 'three';
import playerConfig from '../config/player.json';

const [sx, sy, sz] = playerConfig.capsule.spawnPosition as [number, number, number];

/** Live player body position in world space. Mutated every frame by PlayerCapsule. */
export const playerPosition = new Vector3(sx, sy, sz);
