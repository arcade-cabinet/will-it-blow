/**
 * @module GameWorld
 * Main R3F Canvas scene orchestrator for the "Will It Blow?" kitchen.
 *
 * Renders the full 3D scene: kitchen environment, ECS-driven orchestrators
 * (grinder, stuffer, cooking), the CRT television, fridge station,
 * FPS camera controller, physics world, grab system, and station waypoint markers.
 *
 * Architecture:
 * - `GameWorld` is the top-level export, providing the R3F `<Canvas>` with
 *   WebGPU renderer initialization, XR support, and Rapier physics wrapper.
 * - `SceneContent` lives inside the Canvas and wires Zustand store state to
 *   child 3D components. It is the bridge between the 2D overlay layer
 *   (challenge UIs) and the 3D scene (station visuals).
 * - `PlayerBody` / `StationSensor` / `RoomColliders` provide Rapier physics
 *   for proximity detection (web only). `ManualProximityTrigger` is the
 *   native fallback using per-frame distance checks.
 *
 * All station positions come from {@link resolveTargets} — no hardcoded
 * coordinates in this file. If room dimensions change, everything follows.
 */

import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import type {RapierRigidBody} from '@react-three/rapier';
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
} from '@react-three/rapier';
import {createXRStore, XR} from '@react-three/xr';
import {useKeepAwake} from 'expo-keep-awake';
import {BlendFunction} from 'postprocessing';
import {Suspense, useCallback, useRef} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {WebGPURenderer} from 'three/webgpu';
import {CookingOrchestrator} from '../ecs/orchestrators/CookingOrchestrator';
import {GrinderOrchestrator} from '../ecs/orchestrators/GrinderOrchestrator';
import {StufferOrchestrator} from '../ecs/orchestrators/StufferOrchestrator';
import {ECSScene} from '../ecs/renderers/ECSScene';
import {DEFAULT_ROOM, resolveTargets, STATION_TARGET_NAMES} from '../engine/FurnitureLayout';
import {useGameStore} from '../store/gameStore';
import {FPSController} from './controls/FPSController';
import {GrabSystem} from './controls/GrabSystem';
import {BasementStructure} from './kitchen/BasementStructure';
import {CrtTelevision} from './kitchen/CrtTelevision';
import {FridgeStation} from './kitchen/FridgeStation';
import {KitchenEnvironment} from './kitchen/KitchenEnvironment';
import {StationMarker} from './kitchen/StationMarker';
import {TransferBowl} from './kitchen/TransferBowl';
import {SceneIntrospector} from './SceneIntrospector';

// -----------------------------------------------------------------
// Resolve station targets from the layout system
// -----------------------------------------------------------------

const RESOLVED_TARGETS = resolveTargets(DEFAULT_ROOM);

// Pre-compute station data from resolved targets for rendering
const STATIONS = STATION_TARGET_NAMES.map(name => {
  const t = RESOLVED_TARGETS[name];
  return {
    position: t.position,
    triggerRadius: t.triggerRadius,
    markerY: t.markerY ?? t.position[1],
  };
});

// -----------------------------------------------------------------
// PlayerBody — kinematic rigid body that follows the camera
// -----------------------------------------------------------------

/**
 * Kinematic rigid body that tracks the camera position each frame.
 * Used as the player's physics proxy for Rapier sensor intersection
 * checks (detecting proximity to station triggers). Web only.
 */
function PlayerBody() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const {camera} = useThree();

  useFrame(() => {
    if (rigidBodyRef.current) {
      const p = camera.position;
      rigidBodyRef.current.setNextKinematicTranslation({x: p.x, y: p.y, z: p.z});
    }
  });

  return (
    <RigidBody ref={rigidBodyRef} type="kinematicPosition" colliders={false}>
      <BallCollider args={[0.3]} />
    </RigidBody>
  );
}

// -----------------------------------------------------------------
// StationSensor — sensor collider at a station target position
// -----------------------------------------------------------------

/**
 * Rapier cylinder sensor placed at a station's target position.
 * When the PlayerBody intersects this sensor, it triggers the
 * corresponding challenge via the Zustand store — but only if
 * the game is playing, no challenge is already triggered, and
 * the current challenge index matches this sensor's index.
 *
 * @param props.position - World position from resolveTargets()
 * @param props.radius - Trigger radius from the target definition
 * @param props.challengeIndex - Which challenge (0-4) this sensor gates
 */
function StationSensor({
  position,
  radius,
  challengeIndex,
}: {
  position: [number, number, number];
  radius: number;
  challengeIndex: number;
}) {
  const handleIntersection = useCallback(() => {
    const state = useGameStore.getState();
    if (state.gameStatus !== 'playing') return;
    if (state.challengeTriggered) return;
    if (state.currentChallenge !== challengeIndex) return;
    state.triggerChallenge();
  }, [challengeIndex]);

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CylinderCollider args={[2, radius]} sensor onIntersectionEnter={handleIntersection} />
    </RigidBody>
  );
}

// -----------------------------------------------------------------
// RoomColliders — static wall and floor colliders for physics objects
// -----------------------------------------------------------------

/** Static cuboid colliders forming the room's floor, ceiling, and four walls.
 *  Prevents dynamic physics objects (ingredients, sausage) from falling
 *  through the floor or flying out of bounds. Web only (Rapier). */

const HALF_W = DEFAULT_ROOM.w / 2;
const HALF_D = DEFAULT_ROOM.d / 2;
const ROOM_H = DEFAULT_ROOM.h;
const WALL_THICKNESS = 0.1;

function RoomColliders() {
  return (
    <>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <CuboidCollider args={[HALF_W, WALL_THICKNESS, HALF_D]} />
      </RigidBody>
      {/* Ceiling */}
      <RigidBody type="fixed" position={[0, ROOM_H, 0]}>
        <CuboidCollider args={[HALF_W, WALL_THICKNESS, HALF_D]} />
      </RigidBody>
      {/* Left wall (-X) */}
      <RigidBody type="fixed" position={[-HALF_W, ROOM_H / 2, 0]}>
        <CuboidCollider args={[WALL_THICKNESS, ROOM_H / 2, HALF_D]} />
      </RigidBody>
      {/* Right wall (+X) */}
      <RigidBody type="fixed" position={[HALF_W, ROOM_H / 2, 0]}>
        <CuboidCollider args={[WALL_THICKNESS, ROOM_H / 2, HALF_D]} />
      </RigidBody>
      {/* Back wall (-Z) */}
      <RigidBody type="fixed" position={[0, ROOM_H / 2, -HALF_D]}>
        <CuboidCollider args={[HALF_W, ROOM_H / 2, WALL_THICKNESS]} />
      </RigidBody>
      {/* Front wall (+Z) */}
      <RigidBody type="fixed" position={[0, ROOM_H / 2, HALF_D]}>
        <CuboidCollider args={[HALF_W, ROOM_H / 2, WALL_THICKNESS]} />
      </RigidBody>
    </>
  );
}

// -----------------------------------------------------------------
// ManualProximityTrigger — fallback for native (no Rapier WASM)
// -----------------------------------------------------------------

/**
 * Native-platform fallback for station proximity detection.
 * On native, Rapier WASM is unavailable, so this component runs a
 * per-frame distance check between the player's position (from the store)
 * and the current station's target position. Triggers the challenge
 * when the player is within the station's triggerRadius.
 */
function ManualProximityTrigger() {
  useFrame(() => {
    const state = useGameStore.getState();
    if (state.gameStatus !== 'playing' || state.challengeTriggered) return;

    const station = STATIONS[state.currentChallenge];
    if (!station) return;

    const [px, , pz] = state.playerPosition;
    const dx = px - station.position[0];
    const dz = pz - station.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < station.triggerRadius) {
      state.triggerChallenge();
    }
  });

  return null;
}

// -----------------------------------------------------------------
/** Renders postprocessing effects only when the renderer is WebGL (not WebGPU). */
function WebGLOnlyEffects() {
  const gl = useThree(s => s.gl);
  if (!(gl as any).isWebGLRenderer) return null;
  return (
    <EffectComposer>
      <Bloom intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.025} mipmapBlur />
      <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      <ChromaticAberration offset={[0.002, 0.002]} blendFunction={BlendFunction.NORMAL} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}

// SceneContent — all 3D content inside the Canvas
// -----------------------------------------------------------------

/**
 * All 3D content rendered inside the R3F Canvas.
 *
 * Reads game state from Zustand and distributes it as props to child
 * components (Mechanics, environment, markers). Determines which station
 * is "active" based on gameStatus / currentChallenge / challengeTriggered,
 * converts store arrays to Sets for FridgeStation, and computes bowl
 * render position from the bowlPosition state machine.
 *
 * @param props.joystickRef - Shared ref from MobileJoystick for movement input
 * @param props.lookDeltaRef - Shared ref from MobileJoystick for look-drag input
 */
const SceneContent = ({
  joystickRef,
  lookDeltaRef,
}: {
  joystickRef?: React.RefObject<{x: number; y: number}>;
  lookDeltaRef?: React.RefObject<{dx: number; dy: number}>;
}) => {
  useKeepAwake();
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const mrSausageReaction = useGameStore(s => s.mrSausageReaction);
  const hintActive = useGameStore(s => s.hintActive);
  // Shared fridge state from store (IngredientChallenge writes, 3D reads)
  const fridgePool = useGameStore(s => s.fridgePool);
  const fridgeMatchingIndices = useGameStore(s => s.fridgeMatchingIndices);
  const fridgeSelectedIndices = useGameStore(s => s.fridgeSelectedIndices);
  const triggerFridgeClick = useGameStore(s => s.triggerFridgeClick);
  const setFridgeHovered = useGameStore(s => s.setFridgeHovered);

  // Station is active only when playing + correct challenge + player has arrived
  const isPlaying = gameStatus === 'playing' && challengeTriggered;
  const isFridgeActive = isPlaying && currentChallenge === 0;
  const isGrinderActive = isPlaying && currentChallenge === 1;
  const isStufferActive = isPlaying && currentChallenge === 2;
  const isStoveActive = isPlaying && currentChallenge === 3;

  // Convert store arrays to Sets for FridgeStation props
  const fridgeSelectedSet = new Set(fridgeSelectedIndices);
  const fridgeMatchingSet = new Set(fridgeMatchingIndices);

  // Show waypoint marker for the next station when player hasn't reached it yet
  const showMarker = gameStatus === 'playing' && !challengeTriggered;

  const isWeb = Platform.OS === 'web';

  return (
    <>
      {/* Dim ambient fill (KitchenEnvironment provides the strong fluorescent + fill lights) */}
      <ambientLight intensity={0.15} />
      <SceneIntrospector />
      <FPSController joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} />
      <GrabSystem />

      {/* Rapier physics sensors (web) or manual proximity check (native fallback) */}
      {isWeb ? (
        <>
          <PlayerBody />
          <RoomColliders />
          {STATIONS.map((station, i) => (
            <StationSensor
              key={STATION_TARGET_NAMES[i]}
              position={station.position}
              radius={station.triggerRadius}
              challengeIndex={i}
            />
          ))}
        </>
      ) : (
        <ManualProximityTrigger />
      )}

      <KitchenEnvironment fridgeDoorOpen={isFridgeActive} grinderCranking={isGrinderActive} />
      <CrtTelevision
        position={STATIONS[4].position}
        reaction={gameStatus === 'defeat' ? 'laugh' : mrSausageReaction}
      />

      {/* Station waypoint markers — pulse at the next station to guide the player */}
      {STATIONS.map((station, i) => (
        <StationMarker
          key={STATION_TARGET_NAMES[i]}
          position={[station.position[0], station.markerY, station.position[2]]}
          visible={showMarker && currentChallenge === i}
        />
      ))}

      {/* Horror post-processing: subtle bloom, vignette, chromatic aberration, film noise.
         Disabled under WebGPU — postprocessing library requires WebGL's getContextAttributes(). */}
      <WebGLOnlyEffects />

      {/* Fridge station — 3D shelf with ingredient items */}
      {isFridgeActive && fridgePool.length > 0 && (
        <FridgeStation
          position={STATIONS[0].position}
          ingredients={fridgePool}
          selectedIds={fridgeSelectedSet}
          hintActive={hintActive}
          matchingIndices={fridgeMatchingSet}
          onSelect={triggerFridgeClick}
          onHover={setFridgeHovered}
        />
      )}

      {/* Procedural mechanics — visual-only station geometry driven by Zustand */}
      <GrinderOrchestrator position={STATIONS[1].position} visible={isGrinderActive} />
      <StufferOrchestrator position={STATIONS[2].position} visible={isStufferActive} />
      <CookingOrchestrator position={STATIONS[3].position} visible={isStoveActive} />

      {/* Procedural transfer bowl — follows bowlPosition through the pipeline */}
      <TransferBowl />

      {/* Atmospheric basement elements — always visible */}
      <BasementStructure room={DEFAULT_ROOM} />

      {/* ECS-driven renderers — renders nothing until entities are spawned */}
      <ECSScene />
    </>
  );
};

// -----------------------------------------------------------------
// PhysicsWrapper — wraps children in Rapier Physics on web only
// -----------------------------------------------------------------

/**
 * Conditionally wraps children in Rapier `<Physics>` on web.
 * On native platforms, simply passes children through without physics.
 * Gravity is set to zero because station sensors use intersection
 * detection (not gravity-driven collisions), and per-body gravity
 * is applied manually to dynamic objects that need it.
 */
function PhysicsWrapper({children}: {children: React.ReactNode}) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={null}>
      <Physics gravity={[0, 0, 0]}>{children}</Physics>
    </Suspense>
  );
}

// -----------------------------------------------------------------
// GameWorld — top-level 3D scene container
// -----------------------------------------------------------------

const xrStore = createXRStore();

/**
 * Top-level 3D scene container exported for use by App.tsx (lazy-loaded).
 *
 * Creates the R3F `<Canvas>` with a WebGPU renderer (Dawn-based on native,
 * browser WebGPU on web). Wraps the scene in `<XR>` for optional VR entry
 * and `<PhysicsWrapper>` for Rapier physics on web.
 *
 * An "Enter VR" button is rendered as a React Native overlay on web.
 *
 * @param props.joystickRef - Forwarded to SceneContent for mobile movement
 * @param props.lookDeltaRef - Forwarded to SceneContent for mobile look
 */
export const GameWorld = ({
  joystickRef,
  lookDeltaRef,
}: {
  joystickRef?: React.RefObject<{x: number; y: number}>;
  lookDeltaRef?: React.RefObject<{dx: number; dy: number}>;
}) => {
  return (
    <View style={{flex: 1}}>
      <Canvas
        camera={{fov: 70, near: 0.1, far: 100, position: [0, 1.6, 0]}}
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
          <PhysicsWrapper>
            <SceneContent joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} />
          </PhysicsWrapper>
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
