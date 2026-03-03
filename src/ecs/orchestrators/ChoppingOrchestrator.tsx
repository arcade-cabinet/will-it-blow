/**
 * @module ChoppingOrchestrator
 * ECS-driven GAME DRIVER for the chopping station.
 *
 * Manages a rhythm-based chopping minigame where the player clicks to chop
 * when a knife is near the cutting board surface (the "sweet spot"). Each
 * ingredient needs multiple chops. Good timing = fast progress, bad timing
 * = slow progress or strikes.
 *
 * No ECS machine entities needed — the cutting board GLB is loaded by
 * FurnitureLoader as a decorative prop. This orchestrator renders the
 * interactive knife mesh and ingredient chunk visuals on top.
 *
 * Phase machine: idle → dialogue → active → success → complete
 */

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import type {ChoppingVariant} from '../../config/types';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {INGREDIENTS} from '../../engine/Ingredients';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchestratorPhase = 'idle' | 'dialogue' | 'active' | 'success' | 'complete';

interface ChoppingOrchestratorProps {
  position: [number, number, number];
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Constants (from config)
// ---------------------------------------------------------------------------

const {
  goodChopProgress: GOOD_CHOP_PROGRESS,
  badChopProgress: BAD_CHOP_PROGRESS,
  knifeBaseFrequency: KNIFE_BASE_FREQ,
  knifeAmplitude: KNIFE_AMPLITUDE,
  knifeRestY: KNIFE_REST_Y,
  dialogueDurationMs: DIALOGUE_DURATION_MS,
  successDelayMs: SUCCESS_DELAY_MS,
  scorePenaltyPerStrike: SCORE_PENALTY_PER_STRIKE,
  streakBonusThreshold: STREAK_BONUS_THRESHOLD,
  streakFlairPoints: STREAK_FLAIR_POINTS,
  missStrikeCooldownMs: MISS_STRIKE_COOLDOWN_MS,
} = config.gameplay.chopping;

// ---------------------------------------------------------------------------
// ChoppingOrchestrator
// ---------------------------------------------------------------------------

export const ChoppingOrchestrator = ({position, visible}: ChoppingOrchestratorProps) => {
  // ---- Store selectors ----
  const setChallengeProgress = useGameStore(s => s.setChallengeProgress);
  const setChallengeTimeRemaining = useGameStore(s => s.setChallengeTimeRemaining);
  const setChallengeSpeedZone = useGameStore(s => s.setChallengeSpeedZone);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);
  const addStrike = useGameStore(s => s.addStrike);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);
  const variantSeed = useGameStore(s => s.variantSeed);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const gameStatus = useGameStore(s => s.gameStatus);
  const strikes = useGameStore(s => s.strikes);

  // ---- Refs for game loop (avoid stale closures) ----
  const phaseRef = useRef<OrchestratorPhase>('idle');
  const variantRef = useRef<ChoppingVariant | null>(null);
  const progressRef = useRef(0);
  const timerRef = useRef(0);
  const chopCountRef = useRef(0);
  const goodChopCountRef = useRef(0);
  const streakRef = useRef(0);
  const strikesRef = useRef(strikes);
  const completedRef = useRef(false);
  const missStrikeCooldownRef = useRef(false);
  const dialogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep strikes ref in sync
  strikesRef.current = strikes;

  // ---- Knife animation refs ----
  const knifeRef = useRef<THREE.Group>(null);
  const knifePhaseRef = useRef(0); // 0-1 cycle position for sweet spot calculation

  // ---- Ingredient chunk visuals ----
  const bowlContents = useGameStore(s => s.bowlContents);
  const chunkColors = useMemo(() => {
    if (bowlContents.length === 0) return ['#D4A017', '#C41E3A', '#E85D2C'];
    return bowlContents.map(name => {
      const ing = INGREDIENTS.find(i => i.name === name);
      return ing?.decomposition.chunkColor ?? '#888888';
    });
  }, [bowlContents]);

  const chunkMats = useMemo(
    () =>
      Array.from(
        {length: 6},
        (_, i) =>
          new THREE.MeshStandardMaterial({
            color: chunkColors[i % chunkColors.length],
            roughness: 0.7,
            metalness: 0.1,
          }),
      ),
    [chunkColors],
  );

  const chunkGeo = useMemo(() => new THREE.DodecahedronGeometry(0.15, 1), []);

  // ---- Variant selection on mount when visible ----
  useEffect(() => {
    if (!visible || !challengeTriggered) return;
    const v = pickVariant('chopping', variantSeed) as ChoppingVariant;
    variantRef.current = v;
    timerRef.current = v.timerSeconds;
    progressRef.current = 0;
    chopCountRef.current = 0;
    goodChopCountRef.current = 0;
    streakRef.current = 0;
    completedRef.current = false;

    // Transition to dialogue phase
    phaseRef.current = 'dialogue';
    setChallengePhase('dialogue');

    // After dialogue timeout, transition to active
    dialogueTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'dialogue') {
        phaseRef.current = 'active';
        setChallengePhase('active');
      }
    }, DIALOGUE_DURATION_MS);

    return () => {
      if (dialogueTimerRef.current) clearTimeout(dialogueTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [visible, challengeTriggered, variantSeed, setChallengePhase]);

  // ---- Watch for defeat ----
  useEffect(() => {
    if (gameStatus === 'defeat' && phaseRef.current === 'active') {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
    }
  }, [gameStatus, setChallengePhase]);

  // ---- Click handler: chop ----
  const handleChop = (e: any) => {
    e.stopPropagation();
    if (phaseRef.current !== 'active' || completedRef.current) return;

    const v = variantRef.current;
    if (!v) return;

    chopCountRef.current += 1;
    fireHaptic('toggle_click');

    // Determine if knife is in the sweet spot (near bottom of bob)
    // knifePhaseRef is 0-1 where ~0.75 is the bottom of the sine bob
    const phase = knifePhaseRef.current;
    const sweetSpotCenter = 0.75; // Bottom of sine wave
    const inSweetSpot = Math.abs(phase - sweetSpotCenter) <= v.sweetSpotSize / 2;

    if (inSweetSpot) {
      // Good chop
      goodChopCountRef.current += 1;
      streakRef.current += 1;
      progressRef.current = Math.min(100, progressRef.current + GOOD_CHOP_PROGRESS);
      setChallengeProgress(progressRef.current);
      setMrSausageReaction('nod');
      audioEngine.playChop?.();

      // Streak flair bonus
      if (streakRef.current >= STREAK_BONUS_THRESHOLD) {
        recordFlairPoint('chop-streak', STREAK_FLAIR_POINTS);
        streakRef.current = 0; // Reset streak after bonus
        setMrSausageReaction('excitement');
      }

      // Check for success
      if (progressRef.current >= 100) {
        phaseRef.current = 'success';
        setChallengePhase('success');
        setMrSausageReaction('excitement');

        successTimerRef.current = setTimeout(() => {
          if (completedRef.current) return;
          completedRef.current = true;
          phaseRef.current = 'complete';
          setChallengePhase('complete');
          const accuracy = goodChopCountRef.current / Math.max(1, chopCountRef.current);
          const score = Math.max(
            0,
            Math.round(accuracy * 100 - strikesRef.current * SCORE_PENALTY_PER_STRIKE),
          );
          completeChallenge(score);
        }, SUCCESS_DELAY_MS);
      }
    } else {
      // Bad chop — slower progress, break streak
      streakRef.current = 0;
      progressRef.current = Math.min(100, progressRef.current + BAD_CHOP_PROGRESS);
      setChallengeProgress(progressRef.current);

      // Strike on very bad timing (outside larger tolerance) with cooldown
      const veryBadThreshold = v.sweetSpotSize * 1.5;
      if (Math.abs(phase - sweetSpotCenter) > veryBadThreshold && !missStrikeCooldownRef.current) {
        missStrikeCooldownRef.current = true;
        addStrike();
        setMrSausageReaction('flinch');
        setTimeout(() => {
          missStrikeCooldownRef.current = false;
        }, MISS_STRIKE_COOLDOWN_MS);
      } else {
        setMrSausageReaction('nervous');
      }
    }
  };

  // ---- useFrame: knife animation + timer ----
  useFrame(state => {
    if (!visible) return;
    const dt = Math.min(state.clock.getDelta(), 0.05);
    const t = state.clock.getElapsedTime();

    // Knife bobbing animation
    const knife = knifeRef.current;
    if (knife) {
      const v = variantRef.current;
      const freq = v?.knifeSpeed ?? KNIFE_BASE_FREQ;
      // Sine wave: 0-1 cycle mapped so 0.75 = bottom
      const cycle = (t * freq) % 1;
      knifePhaseRef.current = cycle;
      // Convert to visual Y: sin wave with bottom at cycle=0.75
      const yOffset = Math.sin(cycle * Math.PI * 2) * KNIFE_AMPLITUDE;
      knife.position.y = KNIFE_REST_Y + KNIFE_AMPLITUDE + yOffset;
    }

    // Timer countdown (only in active phase)
    if (phaseRef.current === 'active' && variantRef.current && !completedRef.current) {
      timerRef.current = Math.max(0, timerRef.current - dt);
      setChallengeTimeRemaining(timerRef.current);

      // Speed zone feedback: maps knife proximity to sweet spot
      const phase = knifePhaseRef.current;
      const distFromSweet = Math.abs(phase - 0.75);
      if (distFromSweet <= variantRef.current.sweetSpotSize / 2) {
        setChallengeSpeedZone('good');
      } else if (distFromSweet <= variantRef.current.sweetSpotSize) {
        setChallengeSpeedZone('slow');
      } else {
        setChallengeSpeedZone('fast');
      }

      // Timer expired
      if (timerRef.current <= 0 && !completedRef.current) {
        completedRef.current = true;
        phaseRef.current = 'complete';
        setChallengePhase('complete');
        const accuracy = goodChopCountRef.current / Math.max(1, chopCountRef.current);
        const score = Math.max(
          0,
          Math.round(
            (progressRef.current / 100) * accuracy * 100 -
              strikesRef.current * SCORE_PENALTY_PER_STRIKE,
          ),
        );
        completeChallenge(score);
      }
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Interactive knife — bobs up and down, click to chop */}
      <group ref={knifeRef} position={[0, KNIFE_REST_Y + KNIFE_AMPLITUDE, 0.2]}>
        {/* Knife blade */}
        <mesh
          onClick={handleChop}
          onPointerOver={() => {
            if (typeof document !== 'undefined') {
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerOut={() => {
            if (typeof document !== 'undefined') {
              document.body.style.cursor = 'default';
            }
          }}
        >
          <boxGeometry args={[0.02, 0.25, 0.4]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Knife handle */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.04, 0.12, 0.08]} />
          <meshStandardMaterial color="#3d2b1f" roughness={0.8} metalness={0.05} />
        </mesh>
      </group>

      {/* Ingredient chunks scattered on the board surface */}
      <group position={[0, 0.52, 0]}>
        {chunkMats.map((mat, i) => (
          <mesh
            key={`chunk-${i}`}
            position={[
              ((i % 3) - 1) * 0.2 + Math.sin(i * 2.3) * 0.05,
              0,
              (Math.floor(i / 3) - 0.5) * 0.2 + Math.cos(i * 1.7) * 0.05,
            ]}
            rotation={[Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3]}
          >
            <primitive object={chunkGeo} attach="geometry" />
            <primitive object={mat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Clickable surface hitbox (covers the cutting board area) */}
      <mesh position={[0, 0.55, 0]} onClick={handleChop} visible={false}>
        <boxGeometry args={[1.0, 0.3, 0.8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Sweet spot indicator light — glows green when knife is in sweet zone */}
      <pointLight
        position={[0, 0.3, 0.5]}
        color="#4CAF50"
        intensity={phaseRef.current === 'active' ? 2.0 : 0}
        distance={2}
        decay={2}
      />
    </group>
  );
};
