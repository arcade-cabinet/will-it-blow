/**
 * @module handGestures
 * Gesture vocabulary for the PSX FPS hands. Each entry maps a
 * game-state intent to a baked animation clip in
 * `public/models/psx_fps_arms.glb` + a repeat policy.
 *
 * The GLB ships with 23 clips; we use a curated subset that lines
 * up with the game's interaction verbs (tap / grab / drag / swing /
 * slam / thumbs-up / flip-off) plus the neutral idle.
 *
 * The names here are authoritative — the runtime mapping to Three.js
 * AnimationClip happens once at mount time inside `<PlayerHands>`.
 */

/** Named gestures the game can request. */
export type HandGesture =
  | 'idle' // default — hands at rest in front of the camera
  | 'hover' // hovering over an interactable (subtle inspect)
  | 'tap_left' // quick left-hand punch — clicks, chops
  | 'tap_right' // quick right-hand punch — clicks, chops
  | 'grab_left' // left-hand grab pose — plunger, crank
  | 'grab_right' // right-hand grab pose — knives, pan handle
  | 'swing_left' // full left-arm swing — chopping, tying
  | 'swing_right' // full right-arm swing — chopping, slamming
  | 'recoil_left' // after a left swing
  | 'recoil_right' // after a right swing
  | 'thumbs_up' // score ≥ 75 victory
  | 'flip_off'; // horror strike, score < 50, or death

/** Repeat behaviour for a gesture clip. */
export type HandGesturePlayback =
  | 'loop' // loop forever until superseded
  | 'once' // play once then auto-revert to `idle`
  | 'hold'; // play once then freeze on the last frame until superseded

export interface HandGestureConfig {
  /** Name of the clip inside `psx_fps_arms.glb`. */
  readonly clip: string;
  /** How the clip plays. */
  readonly mode: HandGesturePlayback;
  /** Playback speed multiplier. Default 1. */
  readonly speed?: number;
  /**
   * Optional follow-up gesture to transition into when a `once`
   * clip finishes. Defaults to `idle` for `once` mode.
   */
  readonly followUp?: HandGesture;
}

/**
 * Lookup table — every gesture the game can ask for maps to a clip
 * + playback mode. Keep in sync with the GLB's animation list; the
 * unit test in `src/components/camera/__tests__/handGestures.test.ts`
 * pins the clip names against a hardcoded list so typos surface
 * at unit-test time instead of in the browser.
 */
export const HAND_GESTURES: Readonly<Record<HandGesture, HandGestureConfig>> = {
  idle: {clip: 'Punch_idle', mode: 'loop'},
  hover: {clip: 'Inspect_Hands', mode: 'loop', speed: 0.5},
  tap_left: {clip: 'Punch_L', mode: 'once', speed: 1.4},
  tap_right: {clip: 'Punch_R', mode: 'once', speed: 1.4},
  grab_left: {clip: 'Grab_Item_L_Hand', mode: 'hold'},
  grab_right: {clip: 'Grab_Item_R_Hand', mode: 'hold'},
  swing_left: {
    clip: 'Melee_Swing_L_one_handed',
    mode: 'once',
    speed: 1.2,
    followUp: 'recoil_left',
  },
  swing_right: {
    clip: 'Melee_Swing_R_one_handed',
    mode: 'once',
    speed: 1.2,
    followUp: 'recoil_right',
  },
  recoil_left: {clip: 'Melee_Swing_L_Recoil_one_handed', mode: 'once'},
  recoil_right: {clip: 'Melee_Swing_R_recoil_one_handed', mode: 'once'},
  thumbs_up: {clip: 'Thumbas_Up', mode: 'hold'},
  flip_off: {clip: 'Flip_off', mode: 'hold'},
};

/** All clip names we expect to exist in the GLB. */
export const EXPECTED_HAND_CLIPS = Object.values(HAND_GESTURES).map(g => g.clip);

/**
 * Helper — pick the right tap / swing / grab hand based on the
 * frame parity. Alternates L ↔ R so repeated taps don't look
 * robotic. Used by the game-state → gesture reducer.
 */
export function alternatingTap(parity: number): HandGesture {
  return parity % 2 === 0 ? 'tap_left' : 'tap_right';
}
export function alternatingSwing(parity: number): HandGesture {
  return parity % 2 === 0 ? 'swing_left' : 'swing_right';
}
export function alternatingGrab(parity: number): HandGesture {
  return parity % 2 === 0 ? 'grab_left' : 'grab_right';
}
