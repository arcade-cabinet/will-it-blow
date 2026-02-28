import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import type {IngredientVariant} from '../data/challenges/variants';
import {pickVariant} from '../engine/ChallengeRegistry';
import {matchesCriteria} from '../engine/IngredientMatcher';
import {getRandomIngredientPool} from '../engine/Ingredients';
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
  // 0: Fridge — stand near center, look toward back-left (stay inside room)
  {position: [0, 1.6, 0], lookAt: [-3, 1.4, -3]},
  // 1: Grinder — step to left side, face the counter/shelf on left wall
  {position: [-1, 1.6, 0], lookAt: [-4, 1.4, 0]},
  // 2: Stuffer — walk toward main counter/island on right side
  {position: [0, 1.6, 1], lookAt: [3, 1.2, 2]},
  // 3: Stove — face the gas burners on the right counter
  {position: [0, 1.6, 0], lookAt: [2.5, 2.0, 1.5]},
  // 4: Tasting — walk to table, face the CRT TV on back wall
  {position: [-1, 1.6, -1], lookAt: [0, 2.5, -5.5]},
];

/** Quadratic ease-in-out for smooth camera transitions */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// -----------------------------------------------------------------
// CameraWalker — smoothly animates the camera between stations
// -----------------------------------------------------------------

interface CameraWalkerProps {
  target: {position: [number, number, number]; lookAt: [number, number, number]};
}

function CameraWalker({target}: CameraWalkerProps) {
  const {camera} = useThree();
  const progressRef = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endLookAt = useRef(new THREE.Vector3());

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
  }, [target, camera]);

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return;
    progressRef.current = Math.min(progressRef.current + delta * 0.4, 1);
    const t = easeInOutQuad(progressRef.current);

    camera.position.lerpVectors(startPos.current, endPos.current, t);

    const lookAt = new THREE.Vector3();
    lookAt.lerpVectors(startLookAt.current, endLookAt.current, t);
    camera.lookAt(lookAt);
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
    variantSeed,
    challengeProgress,
    challengePressure,
    challengeIsPressing,
    challengeTemperature,
    challengeHeatLevel,
    strikes,
  } = useGameStore();

  // Fridge station state for 3D visual feedback
  const [fridgeSelectedIds, setFridgeSelectedIds] = useState<Set<number>>(new Set());
  const [fridgeHintActive] = useState(false);

  const showFridge = gameStatus === 'playing' && currentChallenge === 0;
  const showGrinder = gameStatus === 'playing' && currentChallenge === 1;
  const showStuffer = gameStatus === 'playing' && currentChallenge === 2;
  const showStove = gameStatus === 'playing' && currentChallenge === 3;
  const showTasting = gameStatus === 'playing' && currentChallenge === 4;

  // Grinder station state derived from store
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  // Animate crank angle based on challenge progress changes
  useEffect(() => {
    if (showGrinder) {
      // Map progress to crank rotation (multiple full rotations over the challenge)
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

  // Generate a stable ingredient pool + matching indices for the fridge 3D display
  const fridgeData = useMemo(() => {
    if (!showFridge) return null;
    const pool = getRandomIngredientPool(10);
    const v = pickVariant('ingredients', variantSeed) as IngredientVariant | null;
    const matching = new Set<number>();
    if (v) {
      pool.forEach((ing, i) => {
        if (matchesCriteria(ing, v.criteria)) matching.add(i);
      });
    }
    return {pool, matching};
  }, [showFridge, variantSeed]);

  // Determine camera target based on game state
  const cameraTarget =
    gameStatus === 'playing' ? (STATION_CAMERAS[currentChallenge] ?? MENU_CAMERA) : MENU_CAMERA;

  return (
    <>
      {/* Dim ambient fill (KitchenEnvironment provides the strong fluorescent + fill lights) */}
      <ambientLight intensity={0.15} />
      <CameraWalker target={cameraTarget} />
      <KitchenEnvironment />
      <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : showTasting ? 'talk' : 'idle'} />
      {showFridge && fridgeData && (
        <FridgeStation
          ingredients={fridgeData.pool}
          selectedIds={fridgeSelectedIds}
          hintActive={fridgeHintActive}
          matchingIndices={fridgeData.matching}
          onSelect={index => {
            setFridgeSelectedIds(prev => {
              const next = new Set(prev);
              next.add(index);
              return next;
            });
          }}
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
      gl={{preserveDrawingBuffer: true, antialias: true}}
    >
      <SceneContent />
    </Canvas>
  );
};
