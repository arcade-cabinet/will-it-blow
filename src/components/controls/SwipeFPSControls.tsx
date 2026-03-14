import {useEffect, useRef} from 'react';
import {type GestureResponderEvent, PanResponder, StyleSheet, View} from 'react-native';

const TAP_MAX_DURATION = 250;
const TAP_MAX_DISTANCE = 10;
const MOVE_ZONE_RADIUS = 80;

interface SwipeFPSControlsProps {
  joystickRef: React.RefObject<{x: number; y: number}>;
  onLookDrag?: (dx: number, dy: number) => void;
  onInteract?: () => void;
}

export function SwipeFPSControls({joystickRef, onLookDrag, onInteract}: SwipeFPSControlsProps) {
  const moveStartRef = useRef({x: 0, y: 0});
  const moveStartTimeRef = useRef(0);
  const moveTotalDistRef = useRef(0);

  const lookLastRef = useRef({x: 0, y: 0});
  const lookStartTimeRef = useRef(0);
  const lookStartPosRef = useRef({x: 0, y: 0});
  const lookMaxDistRef = useRef(0);

  const onLookDragRef = useRef(onLookDrag);
  useEffect(() => {
    onLookDragRef.current = onLookDrag;
  }, [onLookDrag]);

  const onInteractRef = useRef(onInteract);
  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

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

        const scale = Math.min(dist, MOVE_ZONE_RADIUS) / MOVE_ZONE_RADIUS;
        if (dist < 1) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          joystickRef.current.x = nx * scale;
          joystickRef.current.y = -(ny * scale);
        }
      },

      onPanResponderRelease: () => {
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
        const duration = performance.now() - moveStartTimeRef.current;
        if (duration < TAP_MAX_DURATION && moveTotalDistRef.current < TAP_MAX_DISTANCE) {
          onInteractRef.current?.();
        }
      },

      onPanResponderTerminate: () => {
        if (joystickRef.current) {
          joystickRef.current.x = 0;
          joystickRef.current.y = 0;
        }
      },
    }),
  ).current;

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
        const fromStartDx = touch.pageX - lookStartPosRef.current.x;
        const fromStartDy = touch.pageY - lookStartPosRef.current.y;
        const fromStartDist = Math.sqrt(fromStartDx * fromStartDx + fromStartDy * fromStartDy);
        lookMaxDistRef.current = Math.max(lookMaxDistRef.current, fromStartDist);
        onLookDragRef.current?.(dx, dy);
      },

      onPanResponderRelease: () => {
        const duration = performance.now() - lookStartTimeRef.current;
        if (duration < TAP_MAX_DURATION && lookMaxDistRef.current < TAP_MAX_DISTANCE) {
          onInteractRef.current?.();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.touchSurface} testID="touch-surface">
      <View style={styles.moveZone} testID="move-zone" {...movePanResponder.panHandlers} />
      <View style={styles.lookZone} testID="look-zone" {...lookPanResponder.panHandlers} />
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

export {TAP_MAX_DURATION, TAP_MAX_DISTANCE, MOVE_ZONE_RADIUS};
