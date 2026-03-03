import {useMemo, useRef} from 'react';
import {type GestureResponderEvent, PanResponder, StyleSheet, View} from 'react-native';
import {useOrientation} from '../../hooks/useOrientation';

/** Minimum joystick size on very small screens */
const MIN_JOYSTICK = 90;
/** Maximum joystick size on large tablets */
const MAX_JOYSTICK = 180;
/** Tablet breakpoint (shortest dimension) */
const TABLET_BREAKPOINT = 768;

/**
 * Compute responsive joystick size.
 * On phones: ~13% of the shorter dimension (clamped).
 * On tablets (min dimension >= 768): ~15% — slightly larger for bigger fingers.
 */
function computeJoystickSize(width: number, height: number): number {
  const shortest = Math.min(width, height);
  const isTablet = shortest >= TABLET_BREAKPOINT;
  const ratio = isTablet ? 0.15 : 0.13;
  const raw = shortest * ratio;
  return Math.round(Math.max(MIN_JOYSTICK, Math.min(MAX_JOYSTICK, raw)));
}

interface MobileJoystickProps {
  /** Shared ref that FPSController reads for movement input */
  joystickRef: React.RefObject<{x: number; y: number}>;
  /** Callback for right-side look drag (deltaX, deltaY in pixels) */
  onLookDrag?: (dx: number, dy: number) => void;
  /** Bottom safe area inset to avoid home indicator overlap */
  safeAreaBottom?: number;
}

/**
 * MobileJoystick — left-side virtual joystick for movement + right-side drag for look.
 *
 * Rendered as a React Native overlay (same layer as challenge UI).
 * The joystick writes normalized [-1,1] values to joystickRef.current.
 *
 * Responsive sizing: scales with screen dimensions, larger on tablets.
 * Repositions for landscape vs portrait to stay accessible.
 */
export function MobileJoystick({joystickRef, onLookDrag, safeAreaBottom = 0}: MobileJoystickProps) {
  const {width, height, isLandscape} = useOrientation();

  const joystickSize = useMemo(() => computeJoystickSize(width, height), [width, height]);
  const thumbSize = Math.round(joystickSize * 0.4);
  const maxDistance = (joystickSize - thumbSize) / 2;

  // In landscape, pull joystick higher to keep it reachable
  const bottomInset = Math.max(safeAreaBottom, 8) + (isLandscape ? 16 : 32);
  const leftInset = isLandscape ? 32 : 24;

  const thumbOffset = useRef({x: 0, y: 0});
  const thumbViewRef = useRef<View>(null);
  const centerRef = useRef({x: 0, y: 0});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touch = evt.nativeEvent;
        centerRef.current = {x: touch.locationX, y: touch.locationY};
      },

      onPanResponderMove: (_evt, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDistance) {
          dx = (dx / dist) * maxDistance;
          dy = (dy / dist) * maxDistance;
        }

        thumbOffset.current = {x: dx, y: dy};

        if (thumbViewRef.current) {
          thumbViewRef.current.setNativeProps({
            style: {
              transform: [{translateX: dx}, {translateY: dy}],
            },
          });
        }

        if (joystickRef.current) {
          joystickRef.current.x = dx / maxDistance;
          joystickRef.current.y = -dy / maxDistance;
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
      <View
        style={[
          styles.joystickContainer,
          {left: leftInset, bottom: bottomInset, width: joystickSize, height: joystickSize},
        ]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.joystickBase,
            {width: joystickSize, height: joystickSize, borderRadius: joystickSize / 2},
          ]}
        >
          <View
            ref={thumbViewRef}
            style={[
              styles.joystickThumb,
              {width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2},
            ]}
          />
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  joystickBase: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joystickThumb: {
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

// Exported for testing
export {computeJoystickSize, TABLET_BREAKPOINT, MIN_JOYSTICK, MAX_JOYSTICK};
