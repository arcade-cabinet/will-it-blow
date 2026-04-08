/**
 * @module handGestureStore
 * Tiny module-level event bus for the PSX hand animator.
 *
 * Why not Koota: the hand gesture is a per-frame animation signal,
 * not game state. Components request a gesture (e.g. "the player
 * just tapped the chopping block → play `swing_right`") and the
 * `<PlayerHands>` component picks it up on its next `useFrame`.
 *
 * Putting this in the Koota store would invalidate every subscribed
 * component on every tap and burn re-renders for no gameplay gain.
 * A ref-like module singleton is the right tool — same pattern as
 * `src/player/playerPosition.ts` and the `_pendingYaw` / `_pendingPitch`
 * in `src/player/useMouseLook.ts`.
 */
import type {HandGesture} from './handGestures';

interface HandGestureRequest {
  gesture: HandGesture;
  /** Monotonic counter so the animator knows a NEW request landed. */
  token: number;
}

let currentRequest: HandGestureRequest = {gesture: 'idle', token: 0};
let tokenCounter = 0;

/**
 * Request a gesture for the PSX hands. The next `useFrame` inside
 * `<PlayerHands>` will pick it up and switch the animation.
 *
 * Looped gestures (`idle`, `hover`) persist until replaced.
 * One-shot gestures (`tap_*`, `swing_*`) auto-revert to `idle` when
 * their clip finishes.
 */
export function requestHandGesture(gesture: HandGesture): void {
  tokenCounter += 1;
  currentRequest = {gesture, token: tokenCounter};
}

/** Read the latest request. The animator calls this each frame. */
export function readHandGesture(): HandGestureRequest {
  return currentRequest;
}

/** Force the gesture back to idle — used by test cleanup + posture guards. */
export function resetHandGesture(): void {
  tokenCounter += 1;
  currentRequest = {gesture: 'idle', token: tokenCounter};
}
