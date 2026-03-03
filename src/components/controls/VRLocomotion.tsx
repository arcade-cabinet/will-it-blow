/**
 * @module VRLocomotion
 * VR movement system using @react-three/xr v6 locomotion hooks.
 *
 * Supports two modes controlled by the `vrLocomotionMode` store setting:
 * - **smooth**: Continuous thumbstick movement + configurable snap/smooth turning
 * - **teleport**: Arc raycast from right controller → floor target → trigger confirms
 *
 * Room bounds are clamped to the same dimensions as FPSController to prevent
 * the player from walking through walls. Seated mode lowers the XR origin.
 *
 * This component should only be rendered when an XR session is active.
 */

import {useFrame, useThree} from '@react-three/fiber';
import {TeleportTarget, useXRControllerLocomotion, XROrigin} from '@react-three/xr';
import {useCallback, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {DEFAULT_ROOM} from '../../engine/FurnitureLayout';
import {INPUT_TUNING} from '../../input/InputManager';
import {useGameStore} from '../../store/gameStore';
import {ComfortVignette} from './ComfortVignette';

const ROOM_HALF_W = DEFAULT_ROOM.w / 2 - INPUT_TUNING.wallMargin;
const ROOM_HALF_D = DEFAULT_ROOM.d / 2 - INPUT_TUNING.wallMargin;
const SEATED_HEIGHT_OFFSET = -0.4; // Lower origin in seated mode

/**
 * Clamp a Vector3 position to the kitchen room bounds (XZ plane).
 * Mutates the vector in place and returns it.
 */
function clampToRoom(pos: THREE.Vector3): THREE.Vector3 {
  pos.x = Math.max(-ROOM_HALF_W, Math.min(ROOM_HALF_W, pos.x));
  pos.z = Math.max(-ROOM_HALF_D, Math.min(ROOM_HALF_D, pos.z));
  return pos;
}

/**
 * SmoothLocomotion — uses useXRControllerLocomotion for thumbstick-based movement.
 *
 * Left thumbstick = translate, right thumbstick = rotate.
 * Snap vs smooth turning is driven by store `snapTurnAngle`:
 *   - 0 → smooth turning (speed 2.0 rad/s)
 *   - 30/45/90 → snap turning at that degree increment
 */
function SmoothLocomotion({originRef}: {originRef: React.RefObject<THREE.Group | null>}) {
  const snapTurnAngle = useGameStore(s => s.snapTurnAngle);
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);
  const syncTimer = useRef(0);
  const {camera} = useThree();

  const rotationOptions =
    snapTurnAngle === 0
      ? {type: 'smooth' as const, speed: 2.0, deadZone: 0.3}
      : {type: 'snap' as const, degrees: snapTurnAngle, deadZone: 0.5};

  useXRControllerLocomotion(originRef, {speed: INPUT_TUNING.walkSpeed}, rotationOptions, 'left');

  // Clamp origin to room bounds + sync position to store
  useFrame((_, delta) => {
    const origin = originRef.current;
    if (!origin) return;

    clampToRoom(origin.position);

    syncTimer.current += Math.min(delta, 0.1);
    if (syncTimer.current > 1 / INPUT_TUNING.positionSyncHz) {
      syncTimer.current = 0;
      const p = camera.position;
      setPlayerPosition([p.x, p.y, p.z]);
    }
  });

  return null;
}

/**
 * TeleportLocomotion — renders TeleportTarget on the floor plane.
 * When the player triggers a teleport, the XR origin is moved to the target point.
 */
function TeleportLocomotion({originRef}: {originRef: React.RefObject<THREE.Group | null>}) {
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);
  const {camera} = useThree();

  const handleTeleport = useCallback(
    (point: THREE.Vector3) => {
      const origin = originRef.current;
      if (!origin) return;

      const target = clampToRoom(point.clone());
      origin.position.set(target.x, 0, target.z);

      const p = camera.position;
      setPlayerPosition([p.x, p.y, p.z]);
    },
    [originRef, setPlayerPosition, camera],
  );

  return (
    <TeleportTarget onTeleport={handleTeleport}>
      {/* Invisible floor plane as teleport target */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[DEFAULT_ROOM.w, DEFAULT_ROOM.d]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </TeleportTarget>
  );
}

/**
 * VRLocomotion — top-level VR movement component.
 *
 * Renders the XROrigin with appropriate height offset for seated mode,
 * and switches between smooth and teleport locomotion based on settings.
 * Also renders the ComfortVignette overlay when smooth movement is active.
 *
 * Must be rendered inside an `<XR>` wrapper.
 */
export function VRLocomotion() {
  const locomotionMode = useGameStore(s => s.vrLocomotionMode);
  const isSeated = useGameStore(s => s.xrSeatedMode);
  const originRef = useRef<THREE.Group>(null);

  const originY = isSeated ? SEATED_HEIGHT_OFFSET : 0;

  return (
    <>
      <XROrigin ref={originRef} position={[0, originY, 0]} />
      {locomotionMode === 'smooth' ? (
        <>
          <SmoothLocomotion originRef={originRef} />
          <ComfortVignette />
        </>
      ) : (
        <TeleportLocomotion originRef={originRef} />
      )}
    </>
  );
}
