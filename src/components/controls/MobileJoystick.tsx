import {useRef} from 'react';
import {type GestureResponderEvent, PanResponder, StyleSheet, View} from 'react-native';

const JOYSTICK_SIZE = 120;
const THUMB_SIZE = 48;
const MAX_DISTANCE = (JOYSTICK_SIZE - THUMB_SIZE) / 2;

interface MobileJoystickProps {
  /** Shared ref that FPSController reads for movement input */
  joystickRef: React.RefObject<{x: number; y: number}>;
  /** Callback for right-side look drag (deltaX, deltaY in pixels) */
  onLookDrag?: (dx: number, dy: number) => void;
}

/**
 * MobileJoystick — left-side virtual joystick for movement + right-side drag for look.
 *
 * Rendered as a React Native overlay (same layer as challenge UI).
 * The joystick writes normalized [-1,1] values to joystickRef.current.
 */
export function MobileJoystick({joystickRef, onLookDrag}: MobileJoystickProps) {
  const thumbOffset = useRef({x: 0, y: 0});
  const thumbViewRef = useRef<View>(null);
  const centerRef = useRef({x: 0, y: 0});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // Record center of the touch area
        const touch = evt.nativeEvent;
        centerRef.current = {x: touch.locationX, y: touch.locationY};
      },

      onPanResponderMove: (_evt, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;

        // Clamp to max distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DISTANCE) {
          dx = (dx / dist) * MAX_DISTANCE;
          dy = (dy / dist) * MAX_DISTANCE;
        }

        thumbOffset.current = {x: dx, y: dy};

        // Update thumb visual
        if (thumbViewRef.current) {
          thumbViewRef.current.setNativeProps({
            style: {
              transform: [{translateX: dx}, {translateY: dy}],
            },
          });
        }

        // Write normalized values to shared ref
        if (joystickRef.current) {
          joystickRef.current.x = dx / MAX_DISTANCE;
          joystickRef.current.y = -dy / MAX_DISTANCE; // Invert Y: drag up = positive (forward)
        }
      },

      onPanResponderRelease: () => {
        thumbOffset.current = {x: 0, y: 0};
        if (thumbViewRef.current) {
          thumbViewRef.current.setNativeProps({
            style: {transform: [{translateX: 0}, {translateY: 0}]},
          });
        }
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
      },
    }),
  ).current;

  // Right-side look drag
  const lookLastRef = useRef({x: 0, y: 0});
  const lookPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        lookLastRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.pageX;
        const y = evt.nativeEvent.pageY;
        const dx = x - lookLastRef.current.x;
        const dy = y - lookLastRef.current.y;
        lookLastRef.current = {x, y};
        onLookDrag?.(dx, dy);
      },
    }),
  ).current;

  return (
    <>
      {/* Left joystick */}
      <View style={styles.joystickContainer} {...panResponder.panHandlers}>
        <View style={styles.joystickBase}>
          <View ref={thumbViewRef} style={styles.joystickThumb} />
        </View>
      </View>

      {/* Right look area */}
      <View style={styles.lookArea} {...lookPanResponder.panHandlers} />
    </>
  );
}

const styles = StyleSheet.create({
  joystickContainer: {
    position: 'absolute',
    left: 24,
    bottom: 48,
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  joystickBase: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joystickThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  lookArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '50%',
    height: '100%',
    zIndex: 14,
  },
});
