/**
 * @module InputActions
 * Engine-agnostic input abstraction layer.
 *
 * Maps keyboard, touch, and controller inputs to a small set of typed game
 * actions. All action constructors validate and clamp their parameters so
 * consumers never receive out-of-range values (e.g., yaw/pitch beyond limits,
 * force outside 0--1).
 *
 * Action types:
 * - **grab / release** -- picking up or letting go of an object by mesh ID
 * - **look** -- pointer-driven head rotation (yaw/pitch, clamped)
 * - **press** -- analog pressure input (stuffing challenge)
 * - **swipe** -- directional gesture with velocity (grinding crank, navigation)
 * - **tap** -- single-click / touch on a mesh (ingredient selection, UI)
 */

/** Pick up / start dragging a 3D object. */
export interface GrabAction {
  type: 'grab';
  meshId: string;
}

/** Release a previously grabbed object. */
export interface ReleaseAction {
  type: 'release';
  meshId: string;
}

/** Pointer-driven camera rotation. Values are clamped to {@link MAX_YAW} / {@link MAX_PITCH}. */
export interface LookAction {
  type: 'look';
  yaw: number;
  pitch: number;
}

/** Analog pressure input, normalized to 0--1. Used by the stuffing challenge. */
export interface PressAction {
  type: 'press';
  force: number;
}

/** Directional swipe gesture. `cw`/`ccw` for rotary (grinder crank), cardinal for navigation. */
export interface SwipeAction {
  type: 'swipe';
  direction: 'cw' | 'ccw' | 'up' | 'down' | 'left' | 'right';
  velocity: number;
}

/** Single click or touch on a mesh (e.g., picking an ingredient in the fridge). */
export interface TapAction {
  type: 'tap';
  meshId: string;
}

/** Discriminated union of all possible input actions. */
export type InputAction =
  | GrabAction
  | ReleaseAction
  | LookAction
  | PressAction
  | SwipeAction
  | TapAction;

/** Maximum horizontal head-turn angle in radians (~30 degrees). */
export const MAX_YAW = 0.52;
/** Maximum vertical head-tilt angle in radians (~20 degrees). */
export const MAX_PITCH = 0.35;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Create a grab action for the given mesh. */
export function createGrab(meshId: string): GrabAction {
  return {type: 'grab', meshId};
}

/** Create a release action for the given mesh. */
export function createRelease(meshId: string): ReleaseAction {
  return {type: 'release', meshId};
}

/** Create a look action with yaw/pitch clamped to safe ranges. */
export function createLook(yaw: number, pitch: number): LookAction {
  return {
    type: 'look',
    yaw: clamp(yaw, -MAX_YAW, MAX_YAW),
    pitch: clamp(pitch, -MAX_PITCH, MAX_PITCH),
  };
}

/** Create a press action with force clamped to 0--1. */
export function createPress(force: number): PressAction {
  return {type: 'press', force: clamp(force, 0, 1)};
}

/** Create a directional swipe action with the given velocity. */
export function createSwipe(direction: SwipeAction['direction'], velocity: number): SwipeAction {
  return {type: 'swipe', direction, velocity};
}

/** Create a tap action targeting the given mesh. */
export function createTap(meshId: string): TapAction {
  return {type: 'tap', meshId};
}
