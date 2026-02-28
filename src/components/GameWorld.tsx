import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {WebGPURenderer} from 'three/webgpu';
import {useGameStore} from '../store/gameStore';
import {CrtTelevision} from './kitchen/CrtTelevision';
import {FridgeStation} from './kitchen/FridgeStation';
import {GrinderStation} from './kitchen/GrinderStation';
import {KitchenEnvironment} from './kitchen/KitchenEnvironment';
import {StoveStation} from './kitchen/StoveStation';
import {StufferStation} from './kitchen/StufferStation';

/** Menu camera: center of room, facing the kitchen */
const MENU_CAMERA = {
  position: [0, 1.6, 2] as [number, number, number],
  lookAt: [-2, 1.6, -2] as [number, number, number],
};

/**
 * Camera positions for each challenge station.
 * Mapped to the kitchen.glb layout (Blender coords, Y-up):
 * - Fridge: back-left corner (~x=-5, z=-5)
 * - Counter/sink: right side (~x=2-4, z=0-2)
 * - Stove burners: right side (~x=2.4, z=1.2)
 * - Table: center-back (~x=0, z=-3)
 */
const STATION_CAMERAS: {position: [number, number, number]; lookAt: [number, number, number]}[] = [
  // 0: Fridge — stand close, looking into the open fridge at [-5.16, 1.79, -5.02]
  {position: [-3.5, 1.6, -3.5], lookAt: [-5.16, 1.6, -5.02]},
  // 1: Grinder — step to left side, face the counter/shelf on left wall
  {position: [-1, 1.6, 0], lookAt: [-4, 1.4, 0]},
  // 2: Stuffer — stand back from counter, look toward the island on right side
  {position: [-1, 1.6, 0], lookAt: [3, 1.3, 1.5]},
  // 3: Stove — step back from burners, look down at counter height
  {position: [-0.5, 1.6, -0.5], lookAt: [2.5, 1.2, 1.5]},
  // 4: Tasting — walk to table, face the CRT TV on back wall
  {position: [-1, 1.6, -1], lookAt: [0, 2.5, -5.5]},
];

/** Quadratic ease-in-out for smooth camera transitions */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Max mouse-look rotation in radians (~60 deg horizontal, ~35 deg vertical) */
const LOOK_YAW_LIMIT = Math.PI / 3;
const LOOK_PITCH_LIMIT = Math.PI / 5;
/** Mouse sensitivity (radians per pixel of mouse movement) */
const MOUSE_SENSITIVITY = 0.003;
/** How fast the look offset eases toward its target (higher = snappier) */
const LOOK_SMOOTHING = 8;

// -----------------------------------------------------------------
// CameraWalker — smoothly animates the camera between stations
//                + mouse-look pivot from the current waypoint
// -----------------------------------------------------------------

interface CameraWalkerProps {
  target: {position: [number, number, number]; lookAt: [number, number, number]};
}

function CameraWalker({target}: CameraWalkerProps) {
  const {camera, gl} = useThree();
  const progressRef = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endLookAt = useRef(new THREE.Vector3());

  // Mouse-look state: target offset (from mouse input) and current smoothed offset
  const lookTarget = useRef({yaw: 0, pitch: 0});
  const lookCurrent = useRef({yaw: 0, pitch: 0});
  const isPointerDown = useRef(false);
  const lastPointer = useRef({x: 0, y: 0});

  // Base direction from camera position → target lookAt (computed once per station)
  const baseDirection = useRef(new THREE.Vector3());

  useEffect(() => {
    // Capture current camera state as animation start
    startPos.current.copy(camera.position);

    // Extract current lookAt from camera direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    startLookAt.current.copy(camera.position).add(dir.multiplyScalar(5));

    endPos.current.set(...target.position);
    endLookAt.current.set(...target.lookAt);
    progressRef.current = 0;

    // Reset mouse-look when changing stations
    lookTarget.current = {yaw: 0, pitch: 0};
    lookCurrent.current = {yaw: 0, pitch: 0};

    // Compute base look direction for this station
    baseDirection.current
      .set(...target.lookAt)
      .sub(new THREE.Vector3(...target.position))
      .normalize();
  }, [target, camera]);

  // Pointer event handlers for mouse-look
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      // Only activate on left-click (or touch)
      if (e.button !== 0) return;
      isPointerDown.current = true;
      lastPointer.current = {x: e.clientX, y: e.clientY};
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = {x: e.clientX, y: e.clientY};

      // Accumulate yaw/pitch with limits
      lookTarget.current.yaw = Math.max(
        -LOOK_YAW_LIMIT,
        Math.min(LOOK_YAW_LIMIT, lookTarget.current.yaw - dx * MOUSE_SENSITIVITY),
      );
      lookTarget.current.pitch = Math.max(
        -LOOK_PITCH_LIMIT,
        Math.min(LOOK_PITCH_LIMIT, lookTarget.current.pitch - dy * MOUSE_SENSITIVITY),
      );
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // --- Station transition animation ---
    if (progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + dt * 0.4, 1);
      const t = easeInOutQuad(progressRef.current);

      camera.position.lerpVectors(startPos.current, endPos.current, t);

      const lookAt = new THREE.Vector3();
      lookAt.lerpVectors(startLookAt.current, endLookAt.current, t);
      camera.lookAt(lookAt);
      return;
    }

    // --- Mouse-look: smooth the offset toward target ---
    const lerpFactor = Math.min(LOOK_SMOOTHING * dt, 1);
    lookCurrent.current.yaw += (lookTarget.current.yaw - lookCurrent.current.yaw) * lerpFactor;
    lookCurrent.current.pitch +=
      (lookTarget.current.pitch - lookCurrent.current.pitch) * lerpFactor;

    // Apply yaw/pitch rotation to the base direction
    const dir = baseDirection.current.clone();

    // Yaw rotation (around world Y axis)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      lookCurrent.current.yaw,
    );
    dir.applyQuaternion(yawQuat);

    // Pitch rotation (around the camera's local X axis, perpendicular to current direction)
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, lookCurrent.current.pitch);
    dir.applyQuaternion(pitchQuat);

    // Set camera to look along the rotated direction
    const lookPoint = camera.position.clone().add(dir.multiplyScalar(5));
    camera.lookAt(lookPoint);
  });

  return null;
}

// -----------------------------------------------------------------
// SceneContent — all 3D content inside the Canvas
// -----------------------------------------------------------------

const SceneContent = () => {
  const {
    gameStatus,
    currentChallenge,
    challengeProgress,
    challengePressure,
    challengeIsPressing,
    challengeTemperature,
    challengeHeatLevel,
    strikes,
    mrSausageReaction,
    hintActive,
    // Shared fridge state from store (IngredientChallenge writes, 3D reads)
    fridgePool,
    fridgeMatchingIndices,
    fridgeSelectedIndices,
    triggerFridgeClick,
    setFridgeHovered,
  } = useGameStore();

  const showFridge = gameStatus === 'playing' && currentChallenge === 0;
  const showGrinder = gameStatus === 'playing' && currentChallenge === 1;
  const showStuffer = gameStatus === 'playing' && currentChallenge === 2;
  const showStove = gameStatus === 'playing' && currentChallenge === 3;

  // Grinder station state derived from store
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  // Animate crank angle based on challenge progress changes
  useEffect(() => {
    if (showGrinder) {
      grinderCrankAngle.current = (challengeProgress / 100) * Math.PI * 8;
    }
  }, [showGrinder, challengeProgress]);

  // Detect new strikes to trigger splatter visual
  const [grinderSplattering, setGrinderSplattering] = useState(false);
  useEffect(() => {
    if (showGrinder && strikes > prevStrikesRef.current) {
      setGrinderSplattering(true);
      const timeout = setTimeout(() => setGrinderSplattering(false), 800);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStrikesRef.current = strikes;
  }, [showGrinder, strikes]);

  // Stuffer station state: detect burst from strike changes
  const [stufferBurst, setStufferBurst] = useState(false);
  const prevStufferStrikesRef = useRef(strikes);
  useEffect(() => {
    if (showStuffer && strikes > prevStufferStrikesRef.current) {
      setStufferBurst(true);
      const timeout = setTimeout(() => setStufferBurst(false), 1000);
      prevStufferStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStufferStrikesRef.current = strikes;
  }, [showStuffer, strikes]);

  // Convert store arrays to Sets for FridgeStation props
  const fridgeSelectedSet = new Set(fridgeSelectedIndices);
  const fridgeMatchingSet = new Set(fridgeMatchingIndices);

  // Determine camera target based on game state
  const cameraTarget =
    gameStatus === 'playing' ? (STATION_CAMERAS[currentChallenge] ?? MENU_CAMERA) : MENU_CAMERA;

  return (
    <>
      {/* Dim ambient fill (KitchenEnvironment provides the strong fluorescent + fill lights) */}
      <ambientLight intensity={0.15} />
      <CameraWalker target={cameraTarget} />
      <KitchenEnvironment />
      <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : mrSausageReaction} />
      {showFridge && fridgePool.length > 0 && (
        <FridgeStation
          ingredients={fridgePool}
          selectedIds={fridgeSelectedSet}
          hintActive={hintActive}
          matchingIndices={fridgeMatchingSet}
          onSelect={triggerFridgeClick}
          onHover={setFridgeHovered}
        />
      )}
      {showGrinder && (
        <GrinderStation
          grindProgress={challengeProgress}
          crankAngle={grinderCrankAngle.current}
          isSplattering={grinderSplattering}
        />
      )}
      {showStuffer && (
        <StufferStation
          fillLevel={challengeProgress}
          pressureLevel={challengePressure}
          isPressing={challengeIsPressing}
          hasBurst={stufferBurst}
        />
      )}
      {showStove && (
        <StoveStation temperature={challengeTemperature} heatLevel={challengeHeatLevel} />
      )}
    </>
  );
};

// -----------------------------------------------------------------
// GameWorld — top-level 3D scene container
// -----------------------------------------------------------------

export const GameWorld = () => {
  return (
    <Canvas
      camera={{fov: 70, near: 0.1, far: 100, position: [0, 1.6, 2]}}
      style={{width: '100%', height: '100%'}}
      gl={async (props) => {
        const renderer = new WebGPURenderer({
          canvas: props.canvas as HTMLCanvasElement,
          antialias: true,
        });
        await renderer.init();
        return renderer;
      }}
    >
      <SceneContent />
    </Canvas>
  );
};
