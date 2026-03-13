/**
 * @module App
 * Root application component -- manages app phase routing (title -> loading -> playing -> results)
 * and composes the 3D Canvas, physics world, UI overlays, and mobile controls.
 */
import {Canvas} from '@react-three/fiber';
import {Physics} from '@react-three/rapier';
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import * as THREE from 'three';
import {CameraRail} from './src/components/camera/CameraRail';
import {FirstPersonControls} from './src/components/camera/FirstPersonControls';
import {IntroSequence} from './src/components/camera/IntroSequence';
import {PlayerHands} from './src/components/camera/PlayerHands';
import {TieGesture} from './src/components/challenges/TieGesture';
import {MrSausage3D} from './src/components/characters/MrSausage3D';
import {SwipeFPSControls} from './src/components/controls/SwipeFPSControls';
import {BasementRoom} from './src/components/environment/BasementRoom';
import {Prop} from './src/components/environment/Prop';
import {ScatterProps} from './src/components/environment/ScatterProps';
import {SurrealText} from './src/components/environment/SurrealText';
import {KitchenSetPieces} from './src/components/kitchen/KitchenSetPieces';
import {LiquidPourer} from './src/components/kitchen/LiquidPourer';
import {ProceduralIngredientsList} from './src/components/kitchen/ProceduralIngredients';
import {TrapDoorAnimation} from './src/components/kitchen/TrapDoorAnimation';
import {Sausage} from './src/components/sausage/Sausage';
import {BlowoutStation} from './src/components/stations/BlowoutStation';
import {ChoppingBlock} from './src/components/stations/ChoppingBlock';
import {Grinder} from './src/components/stations/Grinder';
import {PhysicsFreezerChest} from './src/components/stations/PhysicsFreezerChest';
import {Sink} from './src/components/stations/Sink';
import {Stove} from './src/components/stations/Stove';
import {Stuffer} from './src/components/stations/Stuffer';
import {TV} from './src/components/stations/TV';
import {BlowoutHUD} from './src/components/ui/BlowoutHUD';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
import {CookingHUD} from './src/components/ui/CookingHUD';
import {DialogueOverlay} from './src/components/ui/DialogueOverlay';
import {GameOverScreen} from './src/components/ui/GameOverScreen';
import {GrindingHUD} from './src/components/ui/GrindingHUD';
import {IngredientChallenge} from './src/components/ui/IngredientChallenge';
import {LoadingScreen} from './src/components/ui/LoadingScreen';
import {RoundTransition} from './src/components/ui/RoundTransition';
import {SettingsScreen} from './src/components/ui/SettingsScreen';
import {StrikeCounter} from './src/components/ui/StrikeCounter';
import {StuffingHUD} from './src/components/ui/StuffingHUD';
import {TastingChallenge} from './src/components/ui/TastingChallenge';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {INTRO_DIALOGUE} from './src/data/dialogue/intro';
import {VERDICT_A, VERDICT_B, VERDICT_F, VERDICT_S} from './src/data/dialogue/verdict';
import {GameOrchestrator} from './src/engine/GameOrchestrator';
import {INGREDIENT_MODELS} from './src/engine/Ingredients';
import {useGameStore} from './src/store/gameStore';

// --- Console Warning Overrides to keep dev env clean of upstream noise ---
const origWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('THREE.Clock')) return;
    if (args[0].includes('PCFSoftShadowMap')) return;
    if (args[0].includes('deprecated parameters for the initialization function')) return;
    if (args[0].includes('textShadow')) return;
    if (args[0].includes('pointerEvents')) return;
  }
  origWarn(...args);
};

// -----------------------------------------------------------------------

/** 3D scene content: physics world, stations, props, camera, and orchestrator. */
function GameContent() {
  const introActive = useGameStore(state => state.introActive);
  const mrSausageReaction = useGameStore(state => state.mrSausageReaction);

  return (
    <>
      <Physics gravity={[0, -20, 0]}>
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

        {/* Dynamic Camera Rail */}
        <CameraRail />

        {/* State Machine */}
        <GameOrchestrator />
      </Physics>

      <PlayerHands />

      {introActive ? <IntroSequence /> : <FirstPersonControls />}
    </>
  );
}

/** Derive rank letter from a total score. */
function getRank(score: number): string {
  if (score >= 92) return 'S';
  if (score >= 75) return 'A';
  if (score >= 50) return 'B';
  return 'F';
}

/** 2D overlay layer: dialogue, verdict, mobile touch controls, HUDs, challenges, and tie gesture. */
function UILayer() {
  const _introActive = useGameStore(state => state.introActive);
  const setIntroActive = useGameStore(state => state.setIntroActive);
  const setJoystick = useGameStore(state => state.setJoystick);
  const addLookDelta = useGameStore(state => state.addLookDelta);
  const triggerInteract = useGameStore(state => state.triggerInteract);
  const posture = useGameStore(state => state.posture);
  const gamePhase = useGameStore(state => state.gamePhase);
  const finalScore = useGameStore(state => state.finalScore);
  const groundMeatVol = useGameStore(state => state.groundMeatVol);
  const stuffLevel = useGameStore(state => state.stuffLevel);
  const cookLevel = useGameStore(state => state.cookLevel);
  const casingTied = useGameStore(state => state.casingTied);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const nextRound = useGameStore(state => state.nextRound);
  const addSelectedIngredientId = useGameStore(state => state.addSelectedIngredientId);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const calculateFinalScore = useGameStore(state => state.calculateFinalScore);

  const [showIntroDialogue, setShowIntroDialogue] = useState(true);
  const [strikes, setStrikes] = useState(0);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showTasting, setShowTasting] = useState(false);

  // Track previous groundMeatVol to compute grinding speed
  const prevGroundMeatVolRef = useRef(groundMeatVol);
  const grindSpeed = useRef(0);
  useEffect(() => {
    const delta = Math.abs(groundMeatVol - prevGroundMeatVolRef.current);
    grindSpeed.current = Math.min(100, delta * 500);
    prevGroundMeatVolRef.current = groundMeatVol;
  }, [groundMeatVol]);

  // Track previous stuffLevel to compute pressure
  const prevStuffLevelRef = useRef(stuffLevel);
  const stuffPressure = useRef(0);
  useEffect(() => {
    const delta = Math.abs(stuffLevel - prevStuffLevelRef.current);
    stuffPressure.current = Math.min(100, delta * 600);
    prevStuffLevelRef.current = stuffLevel;
  }, [stuffLevel]);

  // When DONE phase reached with more rounds to play, show round transition
  useEffect(() => {
    if (gamePhase === 'DONE' && finalScore?.calculated && currentRound < totalRounds) {
      setShowRoundTransition(true);
    }
  }, [gamePhase, finalScore, currentRound, totalRounds]);

  // When DONE phase reached, show tasting challenge
  useEffect(() => {
    if (gamePhase === 'DONE' && finalScore?.calculated) {
      setShowTasting(true);
    }
  }, [gamePhase, finalScore]);

  const verdictLines = useMemo(() => {
    if (gamePhase !== 'DONE' || !finalScore?.calculated) return null;
    if (finalScore.totalScore >= 92) return VERDICT_S;
    if (finalScore.totalScore >= 75) return VERDICT_A;
    if (finalScore.totalScore >= 50) return VERDICT_B;
    return VERDICT_F;
  }, [gamePhase, finalScore]);

  const joystickRef = useRef({x: 0, y: 0});

  // Sync joystick ref to store at 30fps (not every frame -- avoids render loop)
  useEffect(() => {
    const interval = setInterval(() => {
      setJoystick(joystickRef.current.x, joystickRef.current.y);
    }, 33);
    return () => clearInterval(interval);
  }, [setJoystick]);

  // Ingredients for the challenge overlay -- map INGREDIENT_MODELS to simple {id, name}
  const ingredientItems = useMemo(
    () => INGREDIENT_MODELS.map(ing => ({id: ing.id, name: ing.name})),
    [],
  );

  const handleIngredientComplete = useCallback(
    (selectedIds: string[]) => {
      for (const id of selectedIds) {
        addSelectedIngredientId(id);
      }
      // Auto-advance to CHOPPING after ingredient selection
      setTimeout(() => {
        setGamePhase('CHOPPING');
      }, 800);
    },
    [addSelectedIngredientId, setGamePhase],
  );

  const handleTastingComplete = useCallback(() => {
    setShowTasting(false);
    // Round transition or verdict will take over
  }, []);

  const handleNextRound = useCallback(() => {
    setShowRoundTransition(false);
    setShowTasting(false);
    setStrikes(0);
    nextRound();
  }, [nextRound]);

  // Compute temperature from cookLevel (0 -> 70F, 1 -> 400F)
  const temperature = 70 + cookLevel * 330;
  const targetZone: [number, number] = [280, 350];

  return (
    <View style={[StyleSheet.absoluteFill, {pointerEvents: 'box-none'} as any]}>
      {/* Challenge Header -- top-of-screen HUD showing current challenge */}
      <ChallengeHeader />

      {/* Strike Counter */}
      <StrikeCounter strikes={strikes} />

      {/* Dialogue Overlay for Mr. Sausage's Intro */}
      {showIntroDialogue && (
        <DialogueOverlay
          lines={INTRO_DIALOGUE}
          onComplete={() => {
            setShowIntroDialogue(false);
            setIntroActive(false);
          }}
        />
      )}

      {/* Ingredient Selection Challenge */}
      {gamePhase === 'SELECT_INGREDIENTS' && !showIntroDialogue && (
        <IngredientChallenge
          ingredients={ingredientItems}
          requiredCount={3}
          onComplete={handleIngredientComplete}
          onStrike={() => setStrikes(s => Math.min(3, s + 1))}
        />
      )}

      {/* Grinding HUD */}
      {(gamePhase === 'GRINDING' || gamePhase === 'FILL_GRINDER') && (
        <GrindingHUD speed={grindSpeed.current} progress={groundMeatVol * 100} />
      )}

      {/* Stuffing HUD */}
      {gamePhase === 'STUFFING' && (
        <StuffingHUD pressure={stuffPressure.current} fillLevel={stuffLevel * 100} />
      )}

      {/* Cooking HUD */}
      {gamePhase === 'COOKING' && (
        <CookingHUD
          temperature={temperature}
          targetZone={targetZone}
          timeInZone={
            temperature >= targetZone[0] && temperature <= targetZone[1] ? cookLevel * 10 : 0
          }
        />
      )}

      {/* Blowout HUD */}
      {gamePhase === 'BLOWOUT' && (
        <BlowoutHUD pressure={stuffLevel * 100} leftTied={casingTied} rightTied={casingTied} />
      )}

      {/* Tasting Challenge -- 4-beat score reveal */}
      {showTasting && finalScore?.calculated && (
        <TastingChallenge
          scores={{
            form: finalScore.totalScore * 0.3,
            ingredients: finalScore.totalScore * 0.4,
            cook: finalScore.totalScore * 0.3,
          }}
          demandBonus={Math.round(finalScore.totalScore * 0.1)}
          rank={getRank(finalScore.totalScore)}
          onComplete={handleTastingComplete}
        />
      )}

      {/* Round Transition */}
      {showRoundTransition && finalScore?.calculated && (
        <RoundTransition
          roundNumber={currentRound}
          totalRounds={totalRounds}
          roundScore={finalScore.totalScore}
          totalScore={finalScore.totalScore * currentRound}
          onNextRound={handleNextRound}
        />
      )}

      {/* Dialogue Overlay for Verdict (only on final round) */}
      {verdictLines && !showRoundTransition && currentRound >= totalRounds && (
        <DialogueOverlay
          key={finalScore?.totalScore ?? 0}
          lines={verdictLines}
          onComplete={() => {
            calculateFinalScore();
          }}
        />
      )}

      {/* Mobile Touch Surface (only active when game is playing and standing) */}
      {!showIntroDialogue &&
        !verdictLines &&
        posture === 'standing' &&
        gamePhase !== 'TIE_CASING' &&
        gamePhase !== 'SELECT_INGREDIENTS' && (
          <SwipeFPSControls
            joystickRef={joystickRef}
            onLookDrag={(dx, dy) => addLookDelta(dx, dy)}
            onInteract={triggerInteract}
          />
        )}
      {/* Tie Gesture Overlay */}
      {gamePhase === 'TIE_CASING' && (
        <TieGesture onComplete={() => useGameStore.getState().setGamePhase('BLOWOUT')} />
      )}
    </View>
  );
}

/**
 * Simulated loading screen wrapper.
 * Runs a progress timer from 0 to 100 over ~2 seconds, then calls onReady.
 */
function LoadingPhase({onReady}: {onReady: () => void}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(100, prev + 5);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return <LoadingScreen progress={progress} onReady={onReady} />;
}

export default function App() {
  const appPhase = useGameStore(state => state.appPhase);
  const returnToMenu = useGameStore(state => state.returnToMenu);
  const startNewGame = useGameStore(state => state.startNewGame);
  const finalScore = useGameStore(state => state.finalScore);
  const [showLoading, setShowLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [musicVolume, setMusicVolume] = useState(70);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const prevAppPhase = useRef(appPhase);

  // Intercept transition to 'playing' to show loading screen first
  useEffect(() => {
    if (prevAppPhase.current !== 'playing' && appPhase === 'playing') {
      setShowLoading(true);
    }
    prevAppPhase.current = appPhase;
  }, [appPhase]);

  const handleLoadingReady = useCallback(() => {
    setShowLoading(false);
  }, []);

  // Derive results data from finalScore
  const rank = finalScore?.calculated ? getRank(finalScore.totalScore) : 'F';
  const totalScore = finalScore?.totalScore ?? 0;
  const breakdown = finalScore?.calculated
    ? [
        {label: 'Ingredients', score: totalScore * 0.25},
        {label: 'Chopping', score: totalScore * 0.15},
        {label: 'Grinding', score: totalScore * 0.15},
        {label: 'Stuffing', score: totalScore * 0.15},
        {label: 'Cooking', score: totalScore * 0.2},
        {label: 'Form', score: totalScore * 0.1},
      ]
    : [];
  const demandBonus = finalScore?.calculated ? Math.round(totalScore * 0.1) : 0;

  return (
    <View style={styles.container}>
      {/* Title screen with Settings button */}
      {appPhase === 'title' && !showSettings && <TitleScreen />}

      {/* Settings screen (accessible from title) */}
      {appPhase === 'title' && showSettings && (
        <SettingsScreen
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          hapticsEnabled={hapticsEnabled}
          onSfxChange={setSfxVolume}
          onMusicChange={setMusicVolume}
          onHapticsToggle={() => setHapticsEnabled(prev => !prev)}
          onBack={() => setShowSettings(false)}
        />
      )}

      {/* Results screen */}
      {appPhase === 'results' && (
        <GameOverScreen
          rank={rank}
          totalScore={totalScore}
          breakdown={breakdown}
          demandBonus={demandBonus}
          onPlayAgain={startNewGame}
          onMenu={returnToMenu}
        />
      )}

      {/* Loading screen (shown briefly when entering playing phase) */}
      {appPhase === 'playing' && showLoading && <LoadingPhase onReady={handleLoadingReady} />}

      {/* Playing state: 3D Canvas + UI Layer */}
      {appPhase === 'playing' && !showLoading && (
        <>
          <Canvas
            camera={{position: [2.0, 0.5, 3.0], fov: 75}}
            shadows={{type: THREE.PCFShadowMap}}
            gl={{toneMappingExposure: 1.0}}
          >
            <color attach="background" args={['#000000']} />
            <fogExp2 attach="fog" args={['#2a2a2a', 0.015]} />

            <ambientLight intensity={0.4} />
            <directionalLight
              position={[0, 2.5, 0]}
              intensity={1.0}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.001}
            />
            <pointLight position={[0, 2.0, 0]} intensity={50} distance={10} color="#ffeedd" />

            <Suspense fallback={null}>
              <GameContent />
            </Suspense>
          </Canvas>
          <UILayer />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
