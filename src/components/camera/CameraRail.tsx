import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {type GamePhase, useGameStore} from '../../store/gameStore';

// Defines the target camera positions for each phase
const STATION_CAMERAS: Record<GamePhase, {pos: THREE.Vector3; target: THREE.Vector3}> = {
  SELECT_INGREDIENTS: {
    pos: new THREE.Vector3(-1.5, 1.8, -1.5),
    target: new THREE.Vector3(-1.5, 0.5, -3.2),
  }, // Freezer
  CHOPPING: {pos: new THREE.Vector3(1.5, 1.8, 1.5), target: new THREE.Vector3(1.5, 0.5, 0)}, // Chopping Block
  FILL_GRINDER: {pos: new THREE.Vector3(-1.5, 1.8, -1.0), target: new THREE.Vector3(-2.8, 1.2, -2)}, // Grinder
  GRINDING: {pos: new THREE.Vector3(-1.5, 1.8, -1.0), target: new THREE.Vector3(-2.8, 1.2, -2)}, // Grinder
  MOVE_BOWL: {pos: new THREE.Vector3(-0.5, 1.8, -1.0), target: new THREE.Vector3(0, 1.2, -2)}, // Pan middle
  ATTACH_CASING: {pos: new THREE.Vector3(1.0, 1.8, -1.0), target: new THREE.Vector3(2.0, 1.2, -2)}, // Stuffer
  STUFFING: {pos: new THREE.Vector3(1.0, 1.8, -1.0), target: new THREE.Vector3(2.0, 1.2, -2)}, // Stuffer
  MOVE_SAUSAGE: {pos: new THREE.Vector3(1.5, 1.8, 0.0), target: new THREE.Vector3(2.0, 1.0, 1.5)}, // Moving to stove
  MOVE_PAN: {pos: new THREE.Vector3(2.0, 1.8, 1.0), target: new THREE.Vector3(2.5, 1.0, 2.0)}, // Stove
  COOKING: {pos: new THREE.Vector3(2.0, 1.8, 1.0), target: new THREE.Vector3(2.5, 1.0, 2.0)}, // Stove
  DONE: {pos: new THREE.Vector3(0.0, 1.8, 1.0), target: new THREE.Vector3(-1.5, 1.0, 1.5)}, // Blowout Table
};

export function CameraRail() {
  const {camera} = useThree();
  const gamePhase = useGameStore(state => state.gamePhase);
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);

  const currentPos = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3());

  // Track previous phase to trigger transitions
  const prevPhase = useRef<GamePhase>(gamePhase);

  useEffect(() => {
    if (!introActive && posture === 'standing') {
      // Initialize camera to first station if we just stood up
      const camDef = STATION_CAMERAS[gamePhase];
      if (camDef) {
        currentPos.current.copy(camera.position);

        // Compute current look target
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        currentTarget.current.copy(camera.position).add(dir.multiplyScalar(2));
      }
    }
  }, [introActive, posture, gamePhase, camera]);

  useFrame((state, delta) => {
    if (introActive || posture !== 'standing') return;

    const targetDef = STATION_CAMERAS[gamePhase];
    if (!targetDef) return;

    // Smoothly interpolate position
    currentPos.current.lerp(targetDef.pos, delta * 2.0);
    camera.position.copy(currentPos.current);

    // Smoothly interpolate look target
    currentTarget.current.lerp(targetDef.target, delta * 3.0);
    camera.lookAt(currentTarget.current);
  });

  return null;
}
