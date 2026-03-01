import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';

/** Movement speed in units/sec */
const WALK_SPEED = 3.0;
/** Mouse sensitivity in radians per pixel of pointer-lock movement */
const MOUSE_SENSITIVITY = 0.002;
/** Touch-drag sensitivity for mobile look (radians per pixel) */
const TOUCH_SENSITIVITY = 0.004;
/** Pitch clamp in radians (~80°) */
const PITCH_LIMIT = (80 * Math.PI) / 180;
/** Camera eye height */
const EYE_HEIGHT = 1.6;
/** Room AABB bounds for collision clamping (slightly inside 13×13 room) */
const ROOM_MIN_X = -6.0;
const ROOM_MAX_X = 6.0;
const ROOM_MIN_Z = -6.0;
const ROOM_MAX_Z = 6.0;

/**
 * FPSController — first-person camera controls.
 *
 * Desktop: click canvas → pointer lock, mouse look + WASD movement.
 * Mobile: reads joystick input from a shared ref (MobileJoystick writes to it).
 * Camera Y is fixed at EYE_HEIGHT. Position clamped to room AABB.
 */
export function FPSController({
  joystickRef,
  lookDeltaRef,
}: {
  joystickRef?: React.RefObject<{x: number; y: number}>;
  lookDeltaRef?: React.RefObject<{dx: number; dy: number}>;
}) {
  const {camera, gl} = useThree();
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);

  // Camera euler: yaw (around Y) and pitch (around X)
  const yawRef = useRef(Math.PI); // Start facing -Z (toward CRT TV at z=-5.5)
  const pitchRef = useRef(0);

  // Keyboard state
  const keysRef = useRef<Set<string>>(new Set());

  // Position (mutated directly for performance, synced to store periodically)
  const posRef = useRef(new THREE.Vector3(0, EYE_HEIGHT, 0));
  const syncTimer = useRef(0);

  // Set initial camera position
  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 0);
    posRef.current.set(0, EYE_HEIGHT, 0);
  }, [camera]);

  // Desktop: pointer lock + keyboard
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const canvas = gl.domElement;

    const onClick = () => {
      canvas.requestPointerLock?.();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      pitchRef.current = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitchRef.current - e.movementY * MOUSE_SENSITIVITY),
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // --- Mobile look: drain accumulated touch-drag deltas ---
    if (lookDeltaRef?.current) {
      const ld = lookDeltaRef.current;
      if (Math.abs(ld.dx) > 0.01 || Math.abs(ld.dy) > 0.01) {
        yawRef.current -= ld.dx * TOUCH_SENSITIVITY;
        pitchRef.current = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, pitchRef.current - ld.dy * TOUCH_SENSITIVITY),
        );
        ld.dx = 0;
        ld.dy = 0;
      }
    }

    // --- Build movement vector from keyboard or joystick ---
    let moveX = 0;
    let moveZ = 0;

    const keys = keysRef.current;
    if (keys.has('w') || keys.has('arrowup')) moveZ -= 1;
    if (keys.has('s') || keys.has('arrowdown')) moveZ += 1;
    if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
    if (keys.has('d') || keys.has('arrowright')) moveX += 1;

    // Mobile joystick input (overrides keyboard if present)
    if (joystickRef?.current) {
      const j = joystickRef.current;
      if (Math.abs(j.x) > 0.1 || Math.abs(j.y) > 0.1) {
        moveX = j.x;
        moveZ = -j.y; // Joystick Y-up = forward = -Z
      }
    }

    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    // --- Apply movement relative to camera yaw ---
    if (len > 0.01) {
      const speed = WALK_SPEED * dt;
      const sinY = Math.sin(yawRef.current);
      const cosY = Math.cos(yawRef.current);

      // Forward is -Z in camera local space
      posRef.current.x += (moveX * cosY + moveZ * sinY) * speed;
      posRef.current.z += (moveX * -sinY + moveZ * cosY) * speed;
    }

    // --- Clamp to room bounds ---
    posRef.current.x = Math.max(ROOM_MIN_X, Math.min(ROOM_MAX_X, posRef.current.x));
    posRef.current.z = Math.max(ROOM_MIN_Z, Math.min(ROOM_MAX_Z, posRef.current.z));
    posRef.current.y = EYE_HEIGHT;

    // --- Apply to camera ---
    camera.position.copy(posRef.current);

    // Build rotation from yaw + pitch
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // --- Sync position to store (throttled to ~10Hz) ---
    syncTimer.current += dt;
    if (syncTimer.current > 0.1) {
      syncTimer.current = 0;
      setPlayerPosition([posRef.current.x, posRef.current.y, posRef.current.z]);
    }
  });

  return null;
}
