/**
 * @module App
 * Root application component — manages app phase routing (title -> playing -> results)
 * and composes the 3D Canvas, physics world, stations, and controls.
 *
 * Phase 2 checkpoint: R3F kitchen renders with furniture + horror props.
 */
import {Canvas} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {PCFShadowMap} from 'three';
import {IntroSequence} from './components/camera/IntroSequence';
import {PlayerHands} from './components/camera/PlayerHands';
import {TieCasingDots} from './components/challenges/TieCasingDots';
import {MrSausage3D} from './components/characters/MrSausage3D';
import {SwipeFPSControls} from './components/controls/SwipeFPSControls';
import {BasementRoom} from './components/environment/BasementRoom';
import {SlaughterhouseDressing} from './components/environment/dressing/SlaughterhouseDressing';
import {FlickeringFluorescent} from './components/environment/FlickeringFluorescent';
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
import {GameOverScreen} from './components/ui/GameOverScreen';
import {LoadingScreen} from './components/ui/LoadingScreen';
import {RoundTransition} from './components/ui/RoundTransition';
import {TitleScreen} from './components/ui/TitleScreen';
import {usePersistence} from './db/usePersistence';
import {useGameStore} from './ecs/hooks';
import {audioEngine} from './engine/AudioEngine';
import {GameOrchestrator} from './engine/GameOrchestrator';
import {FPSCamera} from './player/FPSCamera';
import {PlayerCapsule} from './player/PlayerCapsule';
import {useInput} from './player/useInput';

// Rapier WASM is loaded by <Physics> internally.
// The fixRapierWasm() Vite plugin rewrites the broken import.meta.url
// so the WASM fetches from public/rapier_wasm3d_bg.wasm.

// Asset paths are prefixed at each call site via asset() from src/utils/assetPath.ts.
// No global THREE.DefaultLoadingManager.setURLModifier needed.

// --- Console Warning Overrides to keep dev env clean of upstream noise ---
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
// -----------------------------------------------------------------------

/**
 * Module-level signal so PresentationFlow (inside Canvas/Physics) can
 * notify App (outside Canvas) that the 12-second presentation sequence
 * has completed. We use a simple callback ref rather than a Zustand
 * store because this is a one-shot transient signal, not persisted state.
 */
let presentationCompleteCallback: (() => void) | null = null;

function notifyPresentationComplete(): void {
  if (presentationCompleteCallback) {
    presentationCompleteCallback();
    presentationCompleteCallback = null;
  }
}

/** 3D scene content: physics world, stations, props, camera, and controls. */
function GameContent() {
  const introActive = useGameStore(state => state.introActive);
  const mrSausageReaction = useGameStore(state => state.mrSausageReaction);
  const gamePhase = useGameStore(state => state.gamePhase);
  const {moveDirection} = useInput();

  // Block movement during intro sequence
  const effectiveMove = introActive ? {x: 0, z: 0} : moveDirection;

  // Initialize Tone.js audio on mount and start the horror drone
  useEffect(() => {
    audioEngine
      .initialize()
      .then(() => audioEngine.startDrone())
      .catch(err => console.warn('Audio init failed:', err));
    return () => {
      audioEngine.stopDrone();
    };
  }, []);

  // PresentationFlow calls this when the full 12-second sequence finishes.
  // The signal crosses the Canvas boundary via the module-level callback.
  const handlePresentationComplete = useCallback(() => {
    notifyPresentationComplete();
  }, []);

  return (
    <>
      <Physics gravity={[0, -9.81, 0]}>
        {/* Player physics body + FPS camera (inside Physics) */}
        <PlayerCapsule moveDirection={effectiveMove} />
        <FPSCamera />

        <BasementRoom />
        <SurrealText />
        <KitchenSetPieces />
        <PhysicsFreezerChest />
        <TV />
        <ChoppingBlock />

        {/* Stations */}
        <Grinder />
        <Stuffer />
        <Stove />
        <BlowoutStation />
        <Sink />
        <Sausage position={[2.8, 2.0, 0]} />
        <ProceduralIngredientsList />
        <LiquidPourer position={[-2.8, 2.2, -2.0]} />

        {/* Horror Props */}
        <ScatterProps />
        <SlaughterhouseDressing />
        <Prop name="Saw" position={[2.9, 1.8, -1.0]} rotation={[0, -Math.PI / 2, 0]} />
        <Prop name="Cleaver" position={[1.5, 0.45, 0]} rotation={[Math.PI / 2, 0.2, 0]} />
        <Prop name="PS1" position={[-2.8, 0.4, 1.0]} rotation={[0, Math.PI / 4, 0]} />
        <Prop name="Polaroid" position={[2.6, 0.4, -2.5]} rotation={[0, 0, 0]} />

        {/* Mr. Sausage area */}
        <MrSausage3D
          position={[-2.4, 0, 0]}
          rotationY={Math.PI / 2}
          scale={0.4}
          trackCamera
          reaction={mrSausageReaction}
        />

        {/* Ceiling Trapdoor */}
        <TrapDoorAnimation position={[0, 3, 0]} />

        {/* Diegetic tie-casing interaction — pulsing dots on casing ends.
            Replaces the old HTML TieGesture overlay (pillar 7 compliance). */}
        {gamePhase === 'TIE_CASING' && <TieCasingDots />}

        {/* Presentation climax (T1.B): plate on rope descends during DONE phase.
            The full 12-second presentation must complete BEFORE the round
            transition overlay appears. */}
        {gamePhase === 'DONE' && (
          <PresentationFlow onComplete={handlePresentationComplete} position={[0, 0]} />
        )}
      </Physics>

      <PlayerHands />

      {introActive && <IntroSequence />}
    </>
  );
}

/** Wrapper that reads score state from ECS and passes props to GameOverScreen. */
function GameOverScreenWrapper() {
  const finalScore = useGameStore(s => s.finalScore);
  const playerDecisions = useGameStore(s => s.playerDecisions);
  const startNewGame = useGameStore(s => s.startNewGame);
  const returnToMenu = useGameStore(s => s.returnToMenu);

  const totalScore = finalScore?.totalScore ?? 0;
  const rank = totalScore >= 92 ? 'S' : totalScore >= 75 ? 'A' : totalScore >= 50 ? 'B' : 'F';

  return (
    <GameOverScreen
      rank={rank}
      totalScore={totalScore}
      breakdown={[{label: 'Final Score', score: totalScore}]}
      demandBonus={0}
      flairPoints={playerDecisions.flairPoints}
      onPlayAgain={() => startNewGame()}
      onMenu={() => returnToMenu()}
    />
  );
}

export function App() {
  const appPhase = useGameStore(state => state.appPhase);
  const gamePhase = useGameStore(state => state.gamePhase);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const nextRound = useGameStore(state => state.nextRound);
  const [showRoundTransition, setShowRoundTransition] = useState(false);

  // Track whether we're waiting for the presentation to finish before
  // showing the round transition. This prevents the race where the
  // round transition would appear immediately on entering DONE, before
  // the 12-second presentation sequence has played.
  const waitingForPresentationRef = useRef(false);

  usePersistence();

  // When DONE phase is reached with rounds remaining, register a
  // callback for PresentationFlow completion instead of immediately
  // showing the round transition.
  useEffect(() => {
    if (gamePhase === 'DONE' && currentRound < totalRounds && appPhase === 'playing') {
      waitingForPresentationRef.current = true;
      presentationCompleteCallback = () => {
        waitingForPresentationRef.current = false;
        setShowRoundTransition(true);
      };
    }
  }, [gamePhase, currentRound, totalRounds, appPhase]);

  const handleRoundTransitionComplete = useCallback(() => {
    setShowRoundTransition(false);
    nextRound();
  }, [nextRound]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {appPhase === 'title' && <TitleScreen />}

      {appPhase === 'playing' && (
        <Suspense fallback={<LoadingScreen />}>
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
              <GameContent />
            </Suspense>
          </Canvas>

          {/* Invisible touch overlay for mobile FPS controls */}
          <SwipeFPSControls />

          {/* Round transition overlay -- shown AFTER presentation completes */}
          {showRoundTransition && (
            <RoundTransition
              roundNumber={currentRound + 1}
              totalRounds={totalRounds}
              onComplete={handleRoundTransitionComplete}
            />
          )}

          {/* GameOrchestrator -- non-visual state machine, outside Canvas */}
          <GameOrchestrator />
        </Suspense>
      )}

      {appPhase === 'results' && <GameOverScreenWrapper />}
    </div>
  );
}
