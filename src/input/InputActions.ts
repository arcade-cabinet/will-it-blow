// --- Action types ---

export interface GrabAction {
  type: 'grab';
  meshId: string;
}

export interface ReleaseAction {
  type: 'release';
  meshId: string;
}

export interface LookAction {
  type: 'look';
  yaw: number;
  pitch: number;
}

export interface PressAction {
  type: 'press';
  force: number;
}

export interface SwipeAction {
  type: 'swipe';
  direction: 'cw' | 'ccw' | 'up' | 'down' | 'left' | 'right';
  velocity: number;
}

export interface TapAction {
  type: 'tap';
  meshId: string;
}

export type InputAction =
  | GrabAction
  | ReleaseAction
  | LookAction
  | PressAction
  | SwipeAction
  | TapAction;

export const MAX_YAW = 0.52;
export const MAX_PITCH = 0.35;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function createGrab(meshId: string): GrabAction {
  return { type: 'grab', meshId };
}

export function createRelease(meshId: string): ReleaseAction {
  return { type: 'release', meshId };
}

export function createLook(yaw: number, pitch: number): LookAction {
  return {
    type: 'look',
    yaw: clamp(yaw, -MAX_YAW, MAX_YAW),
    pitch: clamp(pitch, -MAX_PITCH, MAX_PITCH),
  };
}

export function createPress(force: number): PressAction {
  return { type: 'press', force: clamp(force, 0, 1) };
}

export function createSwipe(
  direction: SwipeAction['direction'],
  velocity: number,
): SwipeAction {
  return { type: 'swipe', direction, velocity };
}

export function createTap(meshId: string): TapAction {
  return { type: 'tap', meshId };
}
