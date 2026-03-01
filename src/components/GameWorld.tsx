import {Canvas, useFrame} from '@react-three/fiber';
import {createXRStore, XR} from '@react-three/xr';
import {useEffect, useRef, useState} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {WebGPURenderer} from 'three/webgpu';
import {DEFAULT_ROOM, resolveTargets, STATION_TARGET_NAMES} from '../engine/FurnitureLayout';
import {useGameStore} from '../store/gameStore';
import {FPSController} from './controls/FPSController';
import {CrtTelevision} from './kitchen/CrtTelevision';
import {FridgeStation} from './kitchen/FridgeStation';
import {GrinderStation} from './kitchen/GrinderStation';
import {KitchenEnvironment} from './kitchen/KitchenEnvironment';
import {StationMarker} from './kitchen/StationMarker';
import {StoveStation} from './kitchen/StoveStation';
import {StufferStation} from './kitchen/StufferStation';
import {SceneIntrospector} from './SceneIntrospector';

// -----------------------------------------------------------------
// Derive station triggers from the target system
// -----------------------------------------------------------------

const RESOLVED_TARGETS = resolveTargets(DEFAULT_ROOM);

/**
 * STATION_TRIGGERS — derived from FurnitureLayout targets.
 * Each entry provides the xz-center, proximity radius, and marker height
 * for the corresponding challenge station:
 *   0: Fridge (ingredient selection)
 *   1: Grinder (meat grinding)
 *   2: Stuffer (casing stuffing)
 *   3: Stove (cooking)
 *   4: CRT TV (tasting / Mr. Sausage verdict)
 */
const STATION_TRIGGERS = STATION_TARGET_NAMES.map(name => {
  const t = RESOLVED_TARGETS[name];
  return {
    center: [t.position[0], t.position[2]] as [number, number],
    radius: t.triggerRadius,
    markerY: t.markerY ?? t.position[1],
    position: t.position,
  };
});

// -----------------------------------------------------------------
// ProximityTrigger — checks player distance to current station
// -----------------------------------------------------------------

function ProximityTrigger() {
  useFrame(() => {
    const state = useGameStore.getState();
    if (state.gameStatus !== 'playing' || state.challengeTriggered) return;

    const trigger = STATION_TRIGGERS[state.currentChallenge];
    if (!trigger) return;

    const [px, , pz] = state.playerPosition;
    const dx = px - trigger.center[0];
    const dz = pz - trigger.center[1];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < trigger.radius) {
      state.triggerChallenge();
    }
  });

  return null;
}

// -----------------------------------------------------------------
// SceneContent — all 3D content inside the Canvas
// -----------------------------------------------------------------

const SceneContent = ({
  joystickRef,
  lookDeltaRef,
}: {
  joystickRef?: React.RefObject<{x: number; y: number}>;
  lookDeltaRef?: React.RefObject<{dx: number; dy: number}>;
}) => {
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengePressure = useGameStore(s => s.challengePressure);
  const challengeIsPressing = useGameStore(s => s.challengeIsPressing);
  const challengeTemperature = useGameStore(s => s.challengeTemperature);
  const challengeHeatLevel = useGameStore(s => s.challengeHeatLevel);
  const strikes = useGameStore(s => s.strikes);
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

  // Show waypoint marker for the next station when player hasn't reached it yet
  const showMarker = gameStatus === 'playing' && !challengeTriggered;

  return (
    <>
      {/* Dim ambient fill (KitchenEnvironment provides the strong fluorescent + fill lights) */}
      <ambientLight intensity={0.15} />
      <SceneIntrospector />
      <FPSController joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} />
      <ProximityTrigger />
      <KitchenEnvironment fridgeDoorOpen={isFridgeActive} grinderCranking={isGrinderActive} />
      <CrtTelevision
        position={STATION_TRIGGERS[4].position}
        reaction={gameStatus === 'defeat' ? 'laugh' : mrSausageReaction}
      />

      {/* Station waypoint markers — pulse at the next station to guide the player */}
      {STATION_TRIGGERS.map((trigger, i) => (
        <StationMarker
          key={i}
          position={[trigger.center[0], trigger.markerY, trigger.center[1]]}
          visible={showMarker && currentChallenge === i}
        />
      ))}

      {/* All stations always rendered — positions from target system */}
      {isFridgeActive && fridgePool.length > 0 && (
        <FridgeStation
          position={STATION_TRIGGERS[0].position}
          ingredients={fridgePool}
          selectedIds={fridgeSelectedSet}
          hintActive={hintActive}
          matchingIndices={fridgeMatchingSet}
          onSelect={triggerFridgeClick}
          onHover={setFridgeHovered}
        />
      )}
      <GrinderStation
        position={STATION_TRIGGERS[1].position}
        grindProgress={isGrinderActive ? challengeProgress : 0}
        crankAngle={isGrinderActive ? grinderCrankAngle.current : 0}
        isSplattering={isGrinderActive && grinderSplattering}
      />
      <StufferStation
        position={STATION_TRIGGERS[2].position}
        fillLevel={isStufferActive ? challengeProgress : 0}
        pressureLevel={isStufferActive ? challengePressure : 0}
        isPressing={isStufferActive && challengeIsPressing}
        hasBurst={isStufferActive && stufferBurst}
      />
      <StoveStation
        position={STATION_TRIGGERS[3].position}
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
          <SceneContent joystickRef={joystickRef} lookDeltaRef={lookDeltaRef} />
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
