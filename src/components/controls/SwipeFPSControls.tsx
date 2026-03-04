import {useCallback, useEffect, useRef} from 'react';
import {type GestureResponderEvent, PanResponder, StyleSheet, View} from 'react-native';
import {InputManager} from '../../input/InputManager';

// ── Constants ────────────────────────────────────────────────────

/** Velocity threshold (px/s) to classify a release as a flick/swipe. */
const FLICK_VELOCITY_THRESHOLD = 600;
/** Max duration (ms) for a tap gesture. */
const TAP_MAX_DURATION = 250;
/** Max travel (px) for a tap gesture. */
const TAP_MAX_DISTANCE = 10;
/** Half-life in ms for impulse decay after a flick. */
const IMPULSE_HALF_LIFE = 150;
/** Time (ms) after which impulse is considered zero. */
const IMPULSE_CUTOFF = 500;
/** Sprint multiplier when double-tap + flick. */
const SPRINT_MULTIPLIER = 1.8;
/** Max time (ms) between taps for a double-tap. */
const DOUBLE_TAP_WINDOW = 350;
/** Impulse magnitude for a flick (normalized to [-1, 1] joystick range). */
const FLICK_IMPULSE_MAGNITUDE = 0.85;

// ── Exported helpers (testable) ──────────────────────────────────

/** Classify a swipe direction from dx/dy into a normalized unit vector. */
export function classifySwipeDirection(dx: number, dy: number): {x: number; y: number} {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return {x: 0, y: 0};
  return {x: dx / len, y: dy / len};
}

/** Compute the exponential decay factor for impulse at time `t` ms after release. */
export function computeDecayFactor(t: number): number {
  if (t >= IMPULSE_CUTOFF) return 0;
  if (t <= 0) return 1;
  return 0.5 ** (t / IMPULSE_HALF_LIFE);
}

// ── Props ────────────────────────────────────────────────────────

interface SwipeFPSControlsProps {
  /** Shared ref that FPSController reads for movement input (normalized [-1,1]). */
  joystickRef: React.RefObject<{x: number; y: number}>;
  /** Callback for look drag (deltaX, deltaY in pixels). */
  onLookDrag?: (dx: number, dy: number) => void;
  /** Bottom safe area inset to avoid home indicator overlap. */
  safeAreaBottom?: number;
}

// ── Component ────────────────────────────────────────────────────

/**
 * SwipeFPSControls — invisible fullscreen touch surface for mobile FPS navigation.
 *
 * Gesture model:
 * - Drag (slow): Look around — continuous delta → onLookDrag(dx, dy)
 * - Flick (fast release): Move impulse — writes decaying value to joystickRef
 * - Tap (<250ms, <10px): Interact — fires setTouchActionPressed('interact', true) pulse
 * - Double-tap + flick: Sprint — 1.8x impulse magnitude
 *
 * All touch movement feeds look-drag in real-time. Swipe classification happens
 * only on release based on peak velocity + total distance. No mid-gesture confusion.
 */
export function SwipeFPSControls({
  joystickRef,
  onLookDrag,
  safeAreaBottom: _safeAreaBottom = 0,
}: SwipeFPSControlsProps) {
  // Track gesture state
  const startTimeRef = useRef(0);
  const startPosRef = useRef({x: 0, y: 0});
  const lastPosRef = useRef({x: 0, y: 0});
  const lastTimeRef = useRef(0);
  const velocityRef = useRef({x: 0, y: 0});
  const peakSpeedRef = useRef(0);

  // Impulse decay state
  const impulseRef = useRef<{x: number; y: number; startTime: number; magnitude: number} | null>(
    null,
  );
  const frameLoopRef = useRef<number | null>(null);

  // Double-tap detection
  const lastTapTimeRef = useRef(0);

  // Animate impulse decay and write to joystickRef
  const animateImpulse = useCallback(() => {
    const imp = impulseRef.current;
    if (!imp || !joystickRef.current) {
      if (frameLoopRef.current) {
        cancelAnimationFrame(frameLoopRef.current);
        frameLoopRef.current = null;
      }
      return;
    }

    const elapsed = performance.now() - imp.startTime;
    const factor = computeDecayFactor(elapsed);

    if (factor <= 0.04) {
      // Below threshold — zero out
      joystickRef.current.x = 0;
      joystickRef.current.y = 0;
      impulseRef.current = null;
      frameLoopRef.current = null;
      return;
    }

    joystickRef.current.x = imp.x * imp.magnitude * factor;
    joystickRef.current.y = imp.y * imp.magnitude * factor;

    frameLoopRef.current = requestAnimationFrame(animateImpulse);
  }, [joystickRef]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        const now = performance.now();
        startTimeRef.current = now;
        startPosRef.current = {x: touch.pageX, y: touch.pageY};
        lastPosRef.current = {x: touch.pageX, y: touch.pageY};
        lastTimeRef.current = now;
        velocityRef.current = {x: 0, y: 0};
        peakSpeedRef.current = 0;

        // Cancel any active impulse when a new touch starts
        if (frameLoopRef.current) {
          cancelAnimationFrame(frameLoopRef.current);
          frameLoopRef.current = null;
        }
        impulseRef.current = null;
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        const now = performance.now();
        const x = touch.pageX;
        const y = touch.pageY;

        const dx = x - lastPosRef.current.x;
        const dy = y - lastPosRef.current.y;
        const dt = now - lastTimeRef.current;

        // Feed continuous look drag
        if (dt > 0) {
          onLookDrag?.(dx, dy);
          const vx = dx / (dt / 1000);
          const vy = dy / (dt / 1000);
          velocityRef.current = {x: vx, y: vy};
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > peakSpeedRef.current) peakSpeedRef.current = speed;
        }

        lastPosRef.current = {x, y};
        lastTimeRef.current = now;
      },

      onPanResponderRelease: () => {
        const now = performance.now();
        const duration = now - startTimeRef.current;
        const totalDx = lastPosRef.current.x - startPosRef.current.x;
        const totalDy = lastPosRef.current.y - startPosRef.current.y;
        const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

        // Check for tap
        if (duration < TAP_MAX_DURATION && totalDist < TAP_MAX_DISTANCE) {
          // Fire interact action as a pulse
          const input = InputManager.getInstance();
          input.setTouchActionPressed('interact', true);
          // Release after one frame
          requestAnimationFrame(() => {
            input.setTouchActionPressed('interact', false);
          });

          // Track for double-tap
          lastTapTimeRef.current = now;
          return;
        }

        // Check for flick (swipe) — use peak speed during the gesture,
        // not the last sample (finger can slow before release)
        if (peakSpeedRef.current >= FLICK_VELOCITY_THRESHOLD && totalDist > TAP_MAX_DISTANCE) {
          const dir = classifySwipeDirection(totalDx, -totalDy); // Negate Y: screen down = forward

          // Check for double-tap + flick (sprint)
          const timeSinceLastTap = now - lastTapTimeRef.current;
          const isSprint = timeSinceLastTap < DOUBLE_TAP_WINDOW;
          const magnitude = FLICK_IMPULSE_MAGNITUDE * (isSprint ? SPRINT_MULTIPLIER : 1);

          impulseRef.current = {
            x: dir.x,
            y: dir.y,
            startTime: now,
            magnitude,
          };

          frameLoopRef.current = requestAnimationFrame(animateImpulse);
        }
      },
    }),
  ).current;

  // Cancel active RAF loop on unmount to prevent writes after unmount
  useEffect(() => {
    return () => {
      if (frameLoopRef.current != null) {
        cancelAnimationFrame(frameLoopRef.current);
        frameLoopRef.current = null;
      }
      impulseRef.current = null;
      if (joystickRef.current) {
        joystickRef.current.x = 0;
        joystickRef.current.y = 0;
      }
    };
  }, [joystickRef]);

  return <View style={styles.touchSurface} {...panResponder.panHandlers} />;
}

const styles = StyleSheet.create({
  touchSurface: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    // Invisible — no background, border, or visual elements
  },
});

// Exported for testing
export {
  FLICK_VELOCITY_THRESHOLD,
  TAP_MAX_DURATION,
  TAP_MAX_DISTANCE,
  IMPULSE_HALF_LIFE,
  IMPULSE_CUTOFF,
  SPRINT_MULTIPLIER,
  DOUBLE_TAP_WINDOW,
  FLICK_IMPULSE_MAGNITUDE,
};
