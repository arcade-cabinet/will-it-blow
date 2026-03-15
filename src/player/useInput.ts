/**
 * useInput -- Keyboard WASD/Arrow movement hook for web FPS controls.
 *
 * Listens for keydown/keyup on window and returns a reactive moveDirection
 * vector ({ x, z }) normalized to the unit circle. This is passed to
 * PlayerCapsule's usePhysicsMovement to drive camera-relative walking.
 *
 * On mobile, movement comes from the SwipeFPSControls joystick zone
 * which writes to the Koota ECS joystick trait. This hook reads that
 * joystick state as well and merges it with keyboard input.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {useGameStore} from '../ecs/hooks';

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Convert a set of pressed key codes to a normalised XZ movement vector.
 * W/ArrowUp = +Z (forward), S/ArrowDown = -Z (backward)
 * D/ArrowRight = +X (right), A/ArrowLeft = -X (left)
 */
function keysToDirection(keys: Set<string>): {x: number; z: number} {
  const right = (keys.has('KeyD') ? 1 : 0) + (keys.has('ArrowRight') ? 1 : 0);
  const left = (keys.has('KeyA') ? 1 : 0) + (keys.has('ArrowLeft') ? 1 : 0);
  const forward = (keys.has('KeyW') ? 1 : 0) + (keys.has('ArrowUp') ? 1 : 0);
  const back = (keys.has('KeyS') ? 1 : 0) + (keys.has('ArrowDown') ? 1 : 0);

  const x = Math.sign(right - left);
  const z = Math.sign(forward - back);

  if (x === 0 && z === 0) return {x: 0, z: 0};

  // Normalise diagonal to unit circle
  const mag = Math.sqrt(x * x + z * z);
  return {x: x / mag, z: z / mag};
}

/**
 * Returns a reactive `moveDirection` vector driven by WASD/Arrow keyboard
 * input and mobile joystick input from the ECS store.
 */
export function useInput(): {moveDirection: {x: number; z: number}} {
  const keysRef = useRef(new Set<string>());
  const [kbDir, setKbDir] = useState<{x: number; z: number}>({x: 0, z: 0});

  // Read mobile joystick from ECS
  const joystick = useGameStore(s => s.joystick);

  const updateMovement = useCallback(() => {
    const dir = keysToDirection(keysRef.current);
    setKbDir(prev => {
      if (prev.x === dir.x && prev.z === dir.z) return prev;
      return dir;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (MOVEMENT_KEYS.has(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
        updateMovement();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (MOVEMENT_KEYS.has(e.code)) {
        keysRef.current.delete(e.code);
        updateMovement();
      }
    };

    const onBlur = () => {
      keysRef.current.clear();
      setKbDir({x: 0, z: 0});
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [updateMovement]);

  // Merge keyboard and joystick: keyboard takes priority if active
  const hasKeyboard = kbDir.x !== 0 || kbDir.z !== 0;
  const moveDirection = hasKeyboard ? kbDir : {x: joystick.x, z: joystick.y};

  return {moveDirection};
}
