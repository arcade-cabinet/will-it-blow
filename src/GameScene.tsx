/**
 * @module GameScene
 * The heavy-load module: Canvas + Physics + all station components.
 *
 * Lazy-loaded by App.tsx via `React.lazy(() => import('./GameScene'))` so
 * the title screen renders instantly while this 2.8 MB R3F bundle
 * downloads in the background. First paint goes from ~4s to <1s on mobile.
 */
import {Canvas} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense, useCallback, useEffect, useRef} from 'react';
import {PCFShadowMap} from 'three';
import type {BroadcastSignal} from './App';
import {IntroSequence} from './components/camera/IntroSequence';
import {PlayerHands} from './components/camera/PlayerHands';
import {TieCasingDots} from './components/challenges/TieCasingDots';
import {MrSausage3D} from './components/characters/MrSausage3D';
import {SwipeFPSControls} from './components/controls/SwipeFPSControls';
import {BasementRoom} from './components/environment/BasementRoom';
import {DisgustIndicator} from './components/environment/DisgustIndicator';
import {SlaughterhouseDressing} from './components/environment/dressing/SlaughterhouseDressing';
import {EndgameEnvironment} from './components/environment/EndgameEnvironment';
import {FlickeringFluorescent} from './components/environment/FlickeringFluorescent';
import {PhaseFog} from './components/environment/PhaseFog';
import {PhaseLighting} from './components/environment/PhaseLighting';
import {Prop} from './components/environment/Prop';
import {ScatterProps} from './components/environment/ScatterProps';
import {SurrealText} from './components/environment/SurrealText';
import {KitchenSetPieces} from './components/kitchen/KitchenSetPieces';
import {LiquidPourer} from './components/kitchen/LiquidPourer';
import {PresentationFlow} from './components/kitchen/PresentationFlow';
import {ProceduralIngredientsList} from './components/kitchen/ProceduralIngredients';
import {TrapDoorAnimation} from './components/kitchen/TrapDoorAnimation';
import {Sausage} from './components/sausage/Sausage';
import {BlowoutStation} from './components/stations/BlowoutStation';
import {ChoppingBlock} from './components/stations/ChoppingBlock';
import {Grinder} from './components/stations/Grinder';
import {PhysicsFreezerChest} from './components/stations/PhysicsFreezerChest';
import {Sink} from './components/stations/Sink';
import {Stove} from './components/stations/Stove';
import {Stuffer} from './components/stations/Stuffer';
import {TV} from './components/stations/TV';
import {useGameStore} from './ecs/hooks';
import {audioEngine} from './engine/AudioEngine';
import {GameOrchestrator} from './engine/GameOrchestrator';
import {FPSCamera} from './player/FPSCamera';
import {PlayerCapsule} from './player/PlayerCapsule';
import {useInput} from './player/useInput';
import {setPitch, setYaw} from './player/useMouseLook';

// --- Console Warning Overrides (keep dev env clean of upstream noise) ---
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('THREE.Clock')) return;
    if (args[0].includes('PCFSoftShadowMap')) return;
    if (args[0].includes('deprecated parameters for the initialization function')) return;
    if (args[0].includes('textShadow')) return;
    if (args[0].includes('pointerEvents')) return;
  }
  origWarn(...args);
};

const origError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('getSnapshot should be cached')) return;
  }
  origError(...args);
};

// Presentation-complete signal lives in a shared module so App.tsx
// (main bundle) can register a callback without statically importing
// this lazy-loaded chunk. Re-export for backward compatibility.
export {setPresentationCompleteCallback} from './engine/presentationSignal';

import {notifyPresentationComplete} from './engine/presentationSignal';

// ─── GameContent (inside Canvas + Physics) ───────────────────────────

function GameContent({broadcastRound}: {broadcastRound: BroadcastSignal}) {
  const introActive = useGameStore(state => state.introActive);
  const mrSausageReaction = useGameStore(state => state.mrSausageReaction);
  const gamePhase = useGameStore(state => state.gamePhase);
  const posture = useGameStore(state => state.posture);
  const {moveDirection} = useInput();

  const effectiveMove = introActive ? {x: 0, z: 0} : moveDirection;

  // C.1: One-shot camera nudge toward the first clue on standing.
  const clueNudgeFiredRef = useRef(false);
  useEffect(() => {
    if (
      !clueNudgeFiredRef.current &&
      posture === 'standing' &&
      gamePhase === 'SELECT_INGREDIENTS' &&
      !introActive
    ) {
      clueNudgeFiredRef.current = true;
      setYaw(-0.3);
      setPitch(0);
    }
  }, [posture, gamePhase, introActive]);

  // Initialize Tone.js audio on mount.
  useEffect(() => {
    audioEngine
      .initialize()
      .then(() => audioEngine.startDrone())
      .catch(err => console.warn('Audio init failed:', err));
    return () => {
      audioEngine.stopDrone();
    };
  }, []);

  const handlePresentationComplete = useCallback(() => {
    notifyPresentationComplete();
  }, []);

  return (
    <>
      <Physics gravity={[0, -9.81, 0]}>
        <PlayerCapsule moveDirection={effectiveMove} />
        <FPSCamera />

        <BasementRoom />
        <SurrealText />
        <KitchenSetPieces />
        <PhysicsFreezerChest />
        <TV broadcastRound={broadcastRound} />
        <ChoppingBlock />

        <Grinder />
        <Stuffer />
        <Stove />
        <BlowoutStation />
        <Sink />
        <Sausage position={[2.8, 2.0, 0]} />
        <ProceduralIngredientsList />
        <LiquidPourer position={[-2.8, 2.2, -2.0]} />

        <ScatterProps />
        <SlaughterhouseDressing />
        <Prop name="Saw" position={[2.9, 1.8, -1.0]} rotation={[0, -Math.PI / 2, 0]} />
        <Prop name="Cleaver" position={[1.5, 0.45, 0]} rotation={[Math.PI / 2, 0.2, 0]} />
        <Prop name="PS1" position={[-2.8, 0.4, 1.0]} rotation={[0, Math.PI / 4, 0]} />
        <Prop name="Polaroid" position={[2.6, 0.4, -2.5]} rotation={[0, 0, 0]} />

        <MrSausage3D
          position={[-2.4, 0, 0]}
          rotationY={Math.PI / 2}
          scale={0.4}
          trackCamera
          reaction={mrSausageReaction}
        />

        <DisgustIndicator />
        <EndgameEnvironment />
        <PhaseLighting />
        <PhaseFog />

        <TrapDoorAnimation position={[0, 3, 0]} />

        {gamePhase === 'TIE_CASING' && <TieCasingDots />}

        {gamePhase === 'DONE' && (
          <PresentationFlow onComplete={handlePresentationComplete} position={[0, 0]} />
        )}
      </Physics>

      <PlayerHands />

      {introActive && <IntroSequence />}
    </>
  );
}

// ─── GameScene (the lazy-loaded export) ──────────────────────────────

export default function GameScene({broadcastRound}: {broadcastRound: BroadcastSignal}) {
  const gamePhase = useGameStore(state => state.gamePhase);

  return (
    <>
      <Canvas
        shadows={{type: PCFShadowMap}}
        gl={{
          toneMappingExposure: 1.0,
          preserveDrawingBuffer: import.meta.env.DEV,
        }}
        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
      >
        <color attach="background" args={['#0a0b0f']} />
        <fogExp2 attach="fog" args={['#14161c', 0.018]} />

        <ambientLight intensity={0.35} color="#c8d8d4" />
        <directionalLight
          position={[0, 2.5, 0]}
          intensity={0.7}
          color="#d8f8e8"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.001}
        />
        <FlickeringFluorescent
          position={[0, 2.0, 0]}
          baseIntensity={45}
          distance={10}
          color="#d8f8e8"
          flickerRate={0.9}
          flickerDepth={0.85}
        />
        <FlickeringFluorescent
          position={[0, 1.8, -2]}
          baseIntensity={28}
          distance={7}
          color="#c8e8dc"
          flickerRate={0.15}
          flickerDepth={0.25}
        />
        <pointLight position={[0, 0.4, 0]} intensity={12} distance={6} color="#b8c8c4" />

        <Suspense fallback={null}>
          <GameContent broadcastRound={broadcastRound} />
        </Suspense>
      </Canvas>

      <SwipeFPSControls />

      {gamePhase === 'TIE_CASING' && <TieCasingDots />}

      <GameOrchestrator />
    </>
  );
}
