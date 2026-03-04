import {useFrame, useThree} from '@react-three/fiber';
import {useXR} from '@react-three/xr';
import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {DEFAULT_ROOM} from '../../engine/FurnitureLayout';
import {INPUT_TUNING, InputManager} from '../../input/InputManager';
import {useGameStore} from '../../store/gameStore';

const PITCH_LIMIT = (INPUT_TUNING.pitchLimit * Math.PI) / 180;
const ROOM_HALF_W = DEFAULT_ROOM.w / 2 - INPUT_TUNING.wallMargin;
const ROOM_HALF_D = DEFAULT_ROOM.d / 2 - INPUT_TUNING.wallMargin;

/**
 * FPSController — first-person camera controls driven by InputManager.
 *
 * All platform input (keyboard, mouse, gamepad, touch joystick) is
 * read from the singleton InputManager which normalizes everything
 * to movement vectors and look deltas. No raw event handling here.
 *
 * When an XR session is active (immersive-vr or immersive-ar), the
 * controller skips all manual camera manipulation — the XR runtime
 * owns the camera transform via head tracking. Teleport still works
 * in XR by updating the XROrigin position (handled externally).
 * Position sync and audio listener sync continue in XR mode so that
 * spatial audio and proximity triggers stay accurate.
 *
 * Touch refs are wired from MobileJoystick via setTouchRefs() on mount.
 */
export function FPSController({
  joystickRef,
  lookDeltaRef,
}: {
  joystickRef?: React.RefObject<{x: number; y: number}>;
  lookDeltaRef?: React.RefObject<{dx: number; dy: number}>;
}) {
  const {camera, gl} = useThree();
  const xrMode = useXR(xr => xr.mode);
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);
  const clearTeleport = useGameStore(s => s.clearTeleport);
  // getState() gives the freshest value without re-rendering on every change
  const getStore = useGameStore.getState;

  const yawRef = useRef(0); // Start facing -Z (toward CRT TV at z=-6.2)
  const pitchRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(0, INPUT_TUNING.eyeHeight, 0));
  const syncTimer = useRef(0);

  // Initialize InputManager with canvas
  useEffect(() => {
    camera.position.set(0, INPUT_TUNING.eyeHeight, 0);
    posRef.current.set(0, INPUT_TUNING.eyeHeight, 0);

    // Skip desktop pointer-lock setup on touch-primary devices
    const isTouchPrimary =
      Platform.OS !== 'web' || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

    const input = InputManager.getInstance();

    if (Platform.OS === 'web' && !isTouchPrimary) {
      input.init(gl.domElement as HTMLCanvasElement);
    }

    // Wire touch refs if provided
    if (joystickRef?.current && lookDeltaRef?.current) {
      input.setTouchRefs(joystickRef.current, lookDeltaRef.current);
    }

    return () => {
      input.dispose();
    };
  }, [camera, gl, joystickRef, lookDeltaRef]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const isXRActive = xrMode === 'immersive-vr' || xrMode === 'immersive-ar';

    // In XR mode, the runtime controls the camera — skip manual yaw/pitch/position.
    // We still sync position to store and update the audio listener.
    if (isXRActive) {
      syncTimer.current += dt;
      if (syncTimer.current > 1 / INPUT_TUNING.positionSyncHz) {
        syncTimer.current = 0;
        const p = camera.position;
        setPlayerPosition([p.x, p.y, p.z]);

        // Sync audio listener to XR camera position and orientation
        audioEngine.setListenerPosition(p.x, p.y, p.z);
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        audioEngine.setListenerOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
      }
      return;
    }

    const input = InputManager.getInstance();

    // --- Teleport (one-shot, set by GameGovernor / E2E tests) ---
    const teleport = getStore().pendingTeleport;
    if (teleport !== null) {
      posRef.current.set(teleport.pos[0], INPUT_TUNING.eyeHeight, teleport.pos[2]);
      camera.position.copy(posRef.current);
      if (teleport.yaw !== undefined) {
        yawRef.current = teleport.yaw;
      }
      clearTeleport();
    }

    // --- Look ---
    const look = input.getLookDelta();
    // Gamepad look is rate-based (needs dt), mouse/touch are already absolute deltas
    yawRef.current += look.yaw;
    pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current + look.pitch));

    // --- Movement ---
    const move = input.getMovement();
    const len = Math.sqrt(move.x * move.x + move.z * move.z);

    if (len > 0.01) {
      const speed = INPUT_TUNING.walkSpeed * dt;
      const sinY = Math.sin(yawRef.current);
      const cosY = Math.cos(yawRef.current);

      posRef.current.x += (move.x * cosY + move.z * sinY) * speed;
      posRef.current.z += (move.x * -sinY + move.z * cosY) * speed;
    }

    // --- Clamp to room bounds ---
    posRef.current.x = Math.max(-ROOM_HALF_W, Math.min(ROOM_HALF_W, posRef.current.x));
    posRef.current.z = Math.max(-ROOM_HALF_D, Math.min(ROOM_HALF_D, posRef.current.z));
    posRef.current.y = INPUT_TUNING.eyeHeight;

    // --- Apply to camera ---
    camera.position.copy(posRef.current);
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // --- Sync position to store + audio listener (throttled) ---
    syncTimer.current += dt;
    if (syncTimer.current > 1 / INPUT_TUNING.positionSyncHz) {
      syncTimer.current = 0;
      setPlayerPosition([posRef.current.x, posRef.current.y, posRef.current.z]);

      // Sync audio listener to camera position and orientation
      audioEngine.setListenerPosition(posRef.current.x, posRef.current.y, posRef.current.z);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      audioEngine.setListenerOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  });

  return null;
}
