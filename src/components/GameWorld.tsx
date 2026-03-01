import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {createXRStore, XR} from '@react-three/xr';
import {useEffect, useRef, useState} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
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
 * Aligned to GLB furniture (Three.js Y-up coords from Blender MCP):
 * - Fridge (Cube001_2): center [-5.16, 1.79, -5.02]
 * - Grinder on left counter (Cube.008): surface y=2.06, center [-4.75, _, -0.64]
 * - Stuffer on right counter (Cube): surface y=2.68, center [2.28, _, 2.25]
 * - Stove on oven/range (Cube.002): surface y=2.13, center [-4.98, _, -2.23]
 * - CRT TV: [0, 2.5, -5.5] (back wall)
 */
const STATION_CAMERAS: {position: [number, number, number]; lookAt: [number, number, number]}[] = [
  // 0: Fridge — approach from room center toward back-left corner
  {position: [-2.5, 1.6, -2.5], lookAt: [-5.16, 1.6, -5.02]},
  // 1: Grinder — face left-wall counter (Cube.008)
  {position: [-2, 1.6, -0.5], lookAt: [-4.75, 2.1, -0.64]},
  // 2: Stuffer — face right counter/island (Cube), look at stuffer body center (base 2.68 + half body 0.5)
  {position: [0, 1.6, 0], lookAt: [2.28, 3.2, 2.25]},
  // 3: Stove — face oven/range (Cube.002)
  {position: [-2.5, 1.6, -2.0], lookAt: [-4.98, 2.1, -2.23]},
  // 4: Tasting — face CRT TV on back wall
  {position: [-1, 1.6, 0], lookAt: [0, 2.5, -5.5]},
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
// SceneIntrospector — exposes Three.js scene data for E2E tests
// -----------------------------------------------------------------

function SceneIntrospector() {
  const {scene, camera} = useThree();

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).__gov) return;
    const gov = (window as any).__gov;

    /** Query camera position and direction */
    gov.getCamera = () => ({
      position: [camera.position.x, camera.position.y, camera.position.z],
      fov: (camera as any).fov ?? 0,
    });

    /** List all top-level group names and their positions in the scene */
    gov.getSceneChildren = () => {
      const result: {name: string; type: string; position: number[]; childCount: number}[] = [];
      scene.children.forEach(child => {
        result.push({
          name: child.name || child.type,
          type: child.type,
          position: [child.position.x, child.position.y, child.position.z],
          childCount: child.children.length,
        });
      });
      return result;
    };

    /** Find a mesh/group by name (searches recursively) and return its world position */
    gov.findObject = (name: string) => {
      let found: THREE.Object3D | null = null;
      scene.traverse(obj => {
        if (obj.name === name && !found) found = obj;
      });
      if (!found) return null;
      const target: THREE.Object3D = found;
      const wp = new THREE.Vector3();
      target.getWorldPosition(wp);
      return {
        name: target.name,
        type: target.type,
        worldPosition: [wp.x, wp.y, wp.z],
        visible: target.visible,
        childCount: target.children.length,
      };
    };

    /** Count all Mesh objects in the scene (useful for verifying always-render) */
    gov.getMeshCount = () => {
      let count = 0;
      scene.traverse(obj => {
        if (obj.type === 'Mesh') count++;
      });
      return count;
    };

    /** Get positions of all groups whose names match a pattern */
    gov.findGroups = (pattern: string) => {
      const re = new RegExp(pattern, 'i');
      const results: {
        name: string;
        worldPosition: number[];
        visible: boolean;
        childCount: number;
      }[] = [];
      scene.traverse(obj => {
        if (obj.type === 'Group' && re.test(obj.name)) {
          const wp = new THREE.Vector3();
          obj.getWorldPosition(wp);
          results.push({
            name: obj.name,
            worldPosition: [wp.x, wp.y, wp.z],
            visible: obj.visible,
            childCount: obj.children.length,
          });
        }
      });
      return results;
    };
  }, [scene, camera]);

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

  // Which station is currently the active challenge?
  const isFridgeActive = gameStatus === 'playing' && currentChallenge === 0;
  const isGrinderActive = gameStatus === 'playing' && currentChallenge === 1;
  const isStufferActive = gameStatus === 'playing' && currentChallenge === 2;
  const isStoveActive = gameStatus === 'playing' && currentChallenge === 3;

  // Grinder station state derived from store
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  // Animate crank angle based on challenge progress changes
  useEffect(() => {
    if (isGrinderActive) {
      grinderCrankAngle.current = (challengeProgress / 100) * Math.PI * 8;
    }
  }, [isGrinderActive, challengeProgress]);

  // Detect new strikes to trigger splatter visual
  const [grinderSplattering, setGrinderSplattering] = useState(false);
  useEffect(() => {
    if (isGrinderActive && strikes > prevStrikesRef.current) {
      setGrinderSplattering(true);
      const timeout = setTimeout(() => setGrinderSplattering(false), 800);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStrikesRef.current = strikes;
  }, [isGrinderActive, strikes]);

  // Stuffer station state: detect burst from strike changes
  const [stufferBurst, setStufferBurst] = useState(false);
  const prevStufferStrikesRef = useRef(strikes);
  useEffect(() => {
    if (isStufferActive && strikes > prevStufferStrikesRef.current) {
      setStufferBurst(true);
      const timeout = setTimeout(() => setStufferBurst(false), 1000);
      prevStufferStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStufferStrikesRef.current = strikes;
  }, [isStufferActive, strikes]);

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
      <SceneIntrospector />
      <CameraWalker target={cameraTarget} />
      <KitchenEnvironment fridgeDoorOpen={isFridgeActive} />
      <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : mrSausageReaction} />

      {/* All stations always rendered — rest-state props when not active challenge */}
      {isFridgeActive && fridgePool.length > 0 && (
        <FridgeStation
          ingredients={fridgePool}
          selectedIds={fridgeSelectedSet}
          hintActive={hintActive}
          matchingIndices={fridgeMatchingSet}
          onSelect={triggerFridgeClick}
          onHover={setFridgeHovered}
        />
      )}
      <GrinderStation
        grindProgress={isGrinderActive ? challengeProgress : 0}
        crankAngle={isGrinderActive ? grinderCrankAngle.current : 0}
        isSplattering={isGrinderActive && grinderSplattering}
      />
      <StufferStation
        fillLevel={isStufferActive ? challengeProgress : 0}
        pressureLevel={isStufferActive ? challengePressure : 0}
        isPressing={isStufferActive && challengeIsPressing}
        hasBurst={isStufferActive && stufferBurst}
      />
      <StoveStation
        temperature={isStoveActive ? challengeTemperature : 70}
        heatLevel={isStoveActive ? challengeHeatLevel : 0}
      />
    </>
  );
};

// -----------------------------------------------------------------
// GameWorld — top-level 3D scene container
// -----------------------------------------------------------------

const xrStore = createXRStore();

export const GameWorld = () => {
  return (
    <View style={{flex: 1}}>
      <Canvas
        camera={{fov: 70, near: 0.1, far: 100, position: [0, 1.6, 2]}}
        style={{width: '100%', height: '100%'}}
        gl={async props => {
          try {
            const renderer = new WebGPURenderer({
              canvas: props.canvas as HTMLCanvasElement,
              antialias: true,
            });
            await renderer.init();
            return renderer;
          } catch (error) {
            console.error('WebGPU initialization failed, device may not support WebGPU:', error);
            throw error;
          }
        }}
      >
        <XR store={xrStore}>
          <SceneContent />
        </XR>
      </Canvas>
      {Platform.OS === 'web' && (
        <Pressable
          onPress={() => xrStore.enterVR()}
          style={{
            position: 'absolute',
            zIndex: 20,
            bottom: 20,
            right: 20,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Enter VR</Text>
        </Pressable>
      )}
    </View>
  );
};
