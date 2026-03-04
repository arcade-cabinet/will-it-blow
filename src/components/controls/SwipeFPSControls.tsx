import {useEffect, useRef} from 'react';
import {type GestureResponderEvent, PanResponder, StyleSheet, View} from 'react-native';
import {InputManager} from '../../input/InputManager';

// ── Constants ────────────────────────────────────────────────────

/** Max duration (ms) for a tap gesture. */
const TAP_MAX_DURATION = 250;
/** Max travel (px) for a tap gesture. */
const TAP_MAX_DISTANCE = 10;
/** Radius (px) at which left-zone drag reaches full joystick magnitude. */
const MOVE_ZONE_RADIUS = 80;

// ── Props ────────────────────────────────────────────────────────

interface SwipeFPSControlsProps {
  /** Shared ref that FPSController reads for movement input (normalized [-1,1]). */
  joystickRef: React.RefObject<{x: number; y: number}>;
  /** Callback for look drag (deltaX, deltaY in pixels). */
  onLookDrag?: (dx: number, dy: number) => void;
}

// ── Component ────────────────────────────────────────────────────

/**
 * SwipeFPSControls — dual-zone invisible touch surface for mobile FPS navigation.
 *
 * Layout:
 * ┌─────────────┬─────────────┐
 * │  MOVE ZONE  │  LOOK ZONE  │
 * │  (left 50%) │  (right 50%)│
 * └─────────────┴─────────────┘
 *
 * Gesture model:
 * - Left half drag: Move — invisible virtual joystick centered on touch-start
 * - Left half release: Stop moving — zero joystickRef
 * - Right half drag: Look around — continuous delta → onLookDrag(dx, dy)
 * - Tap (either side): Interact — fires setTouchActionPressed('interact', true) pulse
 */
export function SwipeFPSControls({joystickRef, onLookDrag}: SwipeFPSControlsProps) {
  // ── Move zone (left half) state ──
  const moveStartRef = useRef({x: 0, y: 0});
  const moveStartTimeRef = useRef(0);
  const moveTotalDistRef = useRef(0);

  // ── Look zone (right half) state ──
  const lookLastRef = useRef({x: 0, y: 0});
  const lookStartTimeRef = useRef(0);
  const lookStartPosRef = useRef({x: 0, y: 0});
  const lookMaxDistRef = useRef(0);

  // ── Shared tap helper ──
  const pendingInteractRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireTapInteract = () => {
    const input = InputManager.getInstance();
    input.setTouchActionPressed('interact', true);
    pendingInteractRef.current = setTimeout(() => {
      input.setTouchActionPressed('interact', false);
      pendingInteractRef.current = null;
    }, 50);
  };

  // Cleanup on unmount: zero joystick and cancel pending interact reset
  useEffect(() => {
    return () => {
      if (pendingInteractRef.current !== null) {
        clearTimeout(pendingInteractRef.current);
      }
      if (joystickRef.current) {
        joystickRef.current.x = 0;
        joystickRef.current.y = 0;
      }
    };
  }, [joystickRef]);

  // ── Move zone PanResponder (left half) ──
  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        moveStartRef.current.x = touch.pageX;
        moveStartRef.current.y = touch.pageY;
        moveStartTimeRef.current = performance.now();
        moveTotalDistRef.current = 0;
        // Zero joystick on new touch
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        const dx = touch.pageX - moveStartRef.current.x;
        const dy = touch.pageY - moveStartRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        moveTotalDistRef.current = Math.max(moveTotalDistRef.current, dist);

        if (!joystickRef.current) return;

        // Normalize by MOVE_ZONE_RADIUS, clamp to [-1, 1]
        const scale = Math.min(dist, MOVE_ZONE_RADIUS) / MOVE_ZONE_RADIUS;
        if (dist < 1) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        } else {
          const nx = dx / dist; // unit direction
          const ny = dy / dist;
          joystickRef.current.x = nx * scale;
          // Negate Y: screen-down = forward = negative Z in game
          joystickRef.current.y = -(ny * scale);
        }
      },

      onPanResponderRelease: () => {
        // Zero joystick on release
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
        // Check for tap
        const duration = performance.now() - moveStartTimeRef.current;
        if (duration < TAP_MAX_DURATION && moveTotalDistRef.current < TAP_MAX_DISTANCE) {
          fireTapInteract();
        }
      },
    }),
  ).current;

  // ── Look zone PanResponder (right half) ──
  const lookPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        lookLastRef.current.x = touch.pageX;
        lookLastRef.current.y = touch.pageY;
        lookStartTimeRef.current = performance.now();
        lookStartPosRef.current.x = touch.pageX;
        lookStartPosRef.current.y = touch.pageY;
        lookMaxDistRef.current = 0;
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        const dx = touch.pageX - lookLastRef.current.x;
        const dy = touch.pageY - lookLastRef.current.y;
        lookLastRef.current.x = touch.pageX;
        lookLastRef.current.y = touch.pageY;
        // Track max distance from start for robust tap detection
        const fromStartDx = touch.pageX - lookStartPosRef.current.x;
        const fromStartDy = touch.pageY - lookStartPosRef.current.y;
        const fromStartDist = Math.sqrt(fromStartDx * fromStartDx + fromStartDy * fromStartDy);
        lookMaxDistRef.current = Math.max(lookMaxDistRef.current, fromStartDist);
        onLookDrag?.(dx, dy);
      },

      onPanResponderRelease: () => {
        // Check for tap (max distance, not end-to-end, to reject circular gestures)
        const duration = performance.now() - lookStartTimeRef.current;
        if (duration < TAP_MAX_DURATION && lookMaxDistRef.current < TAP_MAX_DISTANCE) {
          fireTapInteract();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.touchSurface}>
      <View style={styles.moveZone} {...movePanResponder.panHandlers} />
      <View style={styles.lookZone} {...lookPanResponder.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  touchSurface: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    flexDirection: 'row',
  },
  moveZone: {
    width: '50%',
    height: '100%',
  },
  lookZone: {
    width: '50%',
    height: '100%',
  },
});

// Exported for testing
export {TAP_MAX_DURATION, TAP_MAX_DISTANCE, MOVE_ZONE_RADIUS};
