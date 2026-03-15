/**
 * @module SwipeFPSControls
 * Web-compatible dual-zone touch controls for mobile FPS movement.
 *
 * Left half (0-40% width): movement joystick
 * Right half (60-100% width): camera look
 * Tap anywhere: interact
 *
 * Uses standard web pointer events (no react-native PanResponder).
 */

import {useCallback, useRef} from 'react';
import {useGameStore} from '../../ecs/hooks';

const TAP_MAX_DURATION = 250;
const TAP_MAX_DISTANCE = 10;
const MOVE_ZONE_RADIUS = 80;

interface SwipeFPSControlsProps {
  children?: React.ReactNode;
}

export function SwipeFPSControls({children}: SwipeFPSControlsProps) {
  const addLookDelta = useGameStore(s => s.addLookDelta);
  const setJoystick = useGameStore(s => s.setJoystick);
  const triggerInteract = useGameStore(s => s.triggerInteract);

  // Track active pointers (supports multi-touch: one for move, one for look)
  const pointers = useRef<
    Map<
      number,
      {
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        startTime: number;
        maxDist: number;
        zone: 'move' | 'look';
      }
    >
  >(new Map());

  const getZone = useCallback((clientX: number): 'move' | 'look' => {
    const w = window.innerWidth;
    return clientX < w * 0.4 ? 'move' : 'look';
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const zone = getZone(e.clientX);
      pointers.current.set(e.pointerId, {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        startTime: Date.now(),
        maxDist: 0,
        zone,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getZone],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ptr = pointers.current.get(e.pointerId);
      if (!ptr) return;

      const dx = e.clientX - ptr.lastX;
      const dy = e.clientY - ptr.lastY;

      // Track total distance from start for tap detection
      const fromStartDx = e.clientX - ptr.startX;
      const fromStartDy = e.clientY - ptr.startY;
      const fromStartDist = Math.sqrt(fromStartDx * fromStartDx + fromStartDy * fromStartDy);
      ptr.maxDist = Math.max(ptr.maxDist, fromStartDist);

      if (ptr.zone === 'look') {
        addLookDelta(dx, dy);
      } else {
        // Movement joystick: dx/dy from start position
        const dist = Math.sqrt(fromStartDx * fromStartDx + fromStartDy * fromStartDy);
        const scale = Math.min(dist, MOVE_ZONE_RADIUS) / MOVE_ZONE_RADIUS;
        if (dist < 1) {
          setJoystick(0, 0);
        } else {
          const nx = fromStartDx / dist;
          const ny = fromStartDy / dist;
          setJoystick(nx * scale, -(ny * scale));
        }
      }

      ptr.lastX = e.clientX;
      ptr.lastY = e.clientY;
    },
    [addLookDelta, setJoystick],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ptr = pointers.current.get(e.pointerId);
      if (ptr) {
        // Reset joystick when move zone released
        if (ptr.zone === 'move') {
          setJoystick(0, 0);
        }

        // Detect tap (quick, short distance)
        const elapsed = Date.now() - ptr.startTime;
        if (elapsed < TAP_MAX_DURATION && ptr.maxDist < TAP_MAX_DISTANCE) {
          triggerInteract();
        }

        pointers.current.delete(e.pointerId);
      }
    },
    [setJoystick, triggerInteract],
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 15,
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}

export {MOVE_ZONE_RADIUS, TAP_MAX_DISTANCE, TAP_MAX_DURATION};
