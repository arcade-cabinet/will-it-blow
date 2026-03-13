import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';
import {type Posture, useGameStore} from '../../store/gameStore';

export function FirstPersonControls() {
  const {camera, gl} = useThree();

  const posture = useGameStore(state => state.posture);
  const setPosture = useGameStore(state => state.setPosture);
  const setIdleTime = useGameStore(state => state.setIdleTime);

  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const lookState = useRef({yaw: 0, pitch: 0, roll: 0});

  // Track idle time internally to avoid hammering the store every frame
  const internalIdleTime = useRef(0);

  // Desired Y positions per posture
  const heights: Record<Posture, number> = {
    prone: 0.5,
    sitting: 1.0,
    standing: 1.9,
  };

  useEffect(() => {
    // Initialize rotation from intro sequence
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    lookState.current.yaw = euler.y;
    lookState.current.pitch = euler.x;
  }, [camera]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let keyCooldown = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      internalIdleTime.current = 0;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.current.forward = true;
          if (!keyCooldown) {
            if (posture === 'prone') setPosture('sitting');
            else if (posture === 'sitting') setPosture('standing');
            keyCooldown = true;
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveState.current.backward = true;
          if (!keyCooldown) {
            if (posture === 'standing') setPosture('sitting');
            else if (posture === 'sitting') setPosture('prone');
            keyCooldown = true;
          }
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveState.current.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveState.current.right = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.current.forward = false;
          keyCooldown = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveState.current.backward = false;
          keyCooldown = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveState.current.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveState.current.right = false;
          break;
      }
    };

    let isDragging = false;

    const handleMouseDown = () => {
      audioEngine.initialize().then(() => audioEngine.setAmbientDrone(true));
      isDragging = true;
      internalIdleTime.current = 0;
    };
    const handleMouseUp = () => {
      isDragging = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      internalIdleTime.current = 0;
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      lookState.current.yaw -= movementX * 0.005;
      lookState.current.pitch -= movementY * 0.005;

      lookState.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, lookState.current.pitch),
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const domElement = gl.domElement as unknown as HTMLElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, posture, setPosture]);

  useFrame((_, delta) => {
    // 1. Update Idle Time
    internalIdleTime.current += delta;
    if (internalIdleTime.current > 1.0) {
      // Sync to store every second instead of every frame
      setIdleTime(Math.floor(internalIdleTime.current));
    }

    // 2. Smoothly transition height based on posture
    const targetY = heights[posture];

    // Add Head Bobbing if standing and moving
    let bobOffset = 0;
    if (
      posture === 'standing' &&
      (moveState.current.forward ||
        moveState.current.backward ||
        moveState.current.left ||
        moveState.current.right)
    ) {
      const t = _.clock.elapsedTime;
      // Simple sine wave bobbing based on time while moving
      bobOffset = Math.sin(t * 8) * 0.05;
    }

    camera.position.y += (targetY + bobOffset - camera.position.y) * delta * 5.0;

    // 3. Handle posture-specific rotations and movement
    const speed = 4.0 * delta;
    let targetRoll = 0;

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    frontVector.y = 0;
    frontVector.normalize();

    const sideVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    sideVector.y = 0;
    sideVector.normalize();

    if (posture === 'prone') {
      // Prone: left/right rolls the camera, no X/Z movement
      if (moveState.current.left) targetRoll = Math.PI / 4;
      if (moveState.current.right) targetRoll = -Math.PI / 4;

      // Look at ceiling
      lookState.current.pitch += (Math.PI / 2 - 0.1 - lookState.current.pitch) * delta * 2.0;
    } else if (posture === 'sitting') {
      // Sitting: left/right spins you around on your butt, no X/Z movement
      if (moveState.current.left) lookState.current.yaw += delta * 2.0;
      if (moveState.current.right) lookState.current.yaw -= delta * 2.0;

      // Look forward
      lookState.current.pitch += (0 - lookState.current.pitch) * delta * 2.0;
    } else if (posture === 'standing') {
      // Standing: full movement
      if (moveState.current.forward) direction.add(frontVector);
      if (moveState.current.backward) direction.sub(frontVector);
      if (moveState.current.left) direction.sub(sideVector);
      if (moveState.current.right) direction.add(sideVector);
    }

    // Apply Roll smoothing
    lookState.current.roll += (targetRoll - lookState.current.roll) * delta * 5.0;

    // 4. Update Rotation
    camera.quaternion.setFromEuler(
      new THREE.Euler(
        lookState.current.pitch,
        lookState.current.yaw,
        lookState.current.roll,
        'YXZ',
      ),
    );

    // 5. Update Position (only if standing)
    if (direction.lengthSq() > 0) {
      direction.normalize();
      camera.position.addScaledVector(direction, speed);

      // Bounds checking
      camera.position.x = Math.max(-2.8, Math.min(2.8, camera.position.x));
      camera.position.z = Math.max(-3.8, Math.min(3.8, camera.position.z));
    }
  });

  return null;
}
