/**
 * @module BlowoutOrchestrator
 * ECS-driven GAME DRIVER for the blowout challenge — the mechanic the game is named after.
 *
 * Phase machine: 'idle' → 'dialogue' → 'tie' → 'blow' → 'score' → 'complete'
 *
 * During 'tie' phase: renders the TieGesture overlay in-world.
 * During 'blow' phase: player holds interact key/button to build pressure,
 *   releasing sends a burst of particles arcing toward the CerealBox.
 *   Particles that land on the box contribute to coverage score.
 *   Floor hits penalize the score.
 *
 * Scoring:
 *   - Base: coverage percentage on the cereal box (0-100)
 *   - Penalty: particles that hit the floor
 *   - Bonus: fast tie flair (already recorded in TieGesture)
 *
 * ECS systems handle nothing special here — this challenge has no machine
 * archetype. The blowout table is procedural geometry in BlowoutOrchestrator JSX.
 *
 * Store fields written:
 *   - challengePhase: 'dialogue' | 'active' | 'success' | 'complete'
 *   - challengeTimeRemaining
 *   - challengeProgress (coverage 0-100)
 *   - blowoutScore (final)
 *   - casingTied (via TieGesture)
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {CerealBox} from '../../components/kitchen/CerealBox';
import {config} from '../../config';
import {InputManager} from '../../input/InputManager';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const blowoutCfg = config.gameplay.blowout;

const TIMER_SECONDS: number = blowoutCfg.timerSeconds;
const MAX_PRESSURE: number = blowoutCfg.maxPressure;
const PRESSURE_DECAY_RATE: number = blowoutCfg.pressureDecayRate;
const PRESSURE_BUILD_RATE: number = blowoutCfg.pressureBuildRate;
const PARTICLE_COUNT: number = blowoutCfg.particleCount;
const PARTICLE_GRAVITY: number = blowoutCfg.particleGravity;
const PARTICLE_SPREAD: number = blowoutCfg.particleSpread;
const PARTICLE_INITIAL_SPEED: number = blowoutCfg.particleInitialSpeed;
const COVERAGE_PER_HIT: number = blowoutCfg.coveragePerHit;
const FLOOR_PENALTY_PER_HIT: number = blowoutCfg.floorPenaltyPerHit;
const COMPLETE_DELAY_SEC: number = blowoutCfg.completeDelaySec;
const BOX_POSITION: [number, number, number] = blowoutCfg.boxPosition as [number, number, number];
const BOX_HALF_WIDTH: number = blowoutCfg.boxHalfWidth;
const BOX_HALF_HEIGHT: number = blowoutCfg.boxHalfHeight;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchestratorPhase = 'idle' | 'dialogue' | 'tie' | 'blow' | 'score' | 'complete';

interface ParticleState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface BlowoutOrchestratorProps {
  position: [number, number, number];
  visible: boolean;
}

// ---------------------------------------------------------------------------
// BlowoutOrchestrator
// ---------------------------------------------------------------------------

export function BlowoutOrchestrator({position, visible}: BlowoutOrchestratorProps) {
  // ---- Store selectors ----
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const gameStatus = useGameStore(s => s.gameStatus);
  const casingTied = useGameStore(s => s.casingTied);
  const blendColor = useGameStore(s => s.blendColor);

  // Store actions
  const setChallengePhase = useGameStore(s => s.setChallengePhase);
  const setChallengeTimeRemaining = useGameStore(s => s.setChallengeTimeRemaining);
  const setChallengeProgress = useGameStore(s => s.setChallengeProgress);
  const setBlowoutScore = useGameStore(s => s.setBlowoutScore);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);

  // Store challengePhase (for dialogue -> active transition)
  const storeChallengePhase = useGameStore(s => s.challengePhase);

  // ---- Phase and timing refs (avoid stale closures in useFrame) ----
  const phaseRef = useRef<OrchestratorPhase>('idle');
  const timerRef = useRef(TIMER_SECONDS);
  const pressureRef = useRef(0);
  const coverageRef = useRef(0);
  const floorHitsRef = useRef(0);
  const successDelayRef = useRef(0);

  // ---- Particle state ----
  const particleRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: PARTICLE_COUNT}, () => null),
  );
  const particleState = useRef<ParticleState[]>(
    Array.from({length: PARTICLE_COUNT}, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0,
    })),
  );

  // ---- Cereal box splat callback (ref to avoid stale) ----
  const addSplatRef = useRef<((x: number, y: number) => void) | null>(null);

  // Derive particle color from sausage blend
  const particleColor = useRef(new THREE.Color(blendColor));
  useEffect(() => {
    particleColor.current.set(blendColor);
  }, [blendColor]);

  // ---- Phase: idle → dialogue when visible + triggered ----
  useEffect(() => {
    if (visible && challengeTriggered && phaseRef.current === 'idle') {
      phaseRef.current = 'dialogue';
      setChallengePhase('dialogue');
    }
  }, [visible, challengeTriggered, setChallengePhase]);

  // ---- Phase: dialogue → tie (HUD advances challengePhase to 'active' after dialogue) ----
  useEffect(() => {
    if (storeChallengePhase === 'active' && phaseRef.current === 'dialogue') {
      phaseRef.current = 'tie';
    }
  }, [storeChallengePhase]);

  // ---- Phase: tie → blow (triggered when casingTied goes true) ----
  useEffect(() => {
    if (casingTied && phaseRef.current === 'tie') {
      phaseRef.current = 'blow';
      timerRef.current = TIMER_SECONDS;
      coverageRef.current = 0;
      floorHitsRef.current = 0;
    }
  }, [casingTied]);

  // ---- Watch for defeat ----
  useEffect(() => {
    if (gameStatus === 'defeat' && phaseRef.current === 'blow') {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
    }
  }, [gameStatus, setChallengePhase]);

  // ---- TieGesture completion handler ----
  // Note: TieGesture is rendered by BlowoutHUD which reads store.casingTied
  // The store.setCasingTied call in TieGesture will trigger the useEffect above.

  /** Emit a burst of particles from the nozzle toward the box. */
  const emitBurst = useCallback(() => {
    const pressure = pressureRef.current;
    const burstCount = Math.max(1, Math.floor((pressure / MAX_PRESSURE) * 6));

    // World-space nozzle position (in front of station)
    const nozzleX = position[0];
    const nozzleY = position[1] + 0.8;
    const nozzleZ = position[2];

    let spawned = 0;
    for (let i = 0; i < PARTICLE_COUNT && spawned < burstCount; i++) {
      const p = particleState.current[i];
      if (!p.active) {
        p.active = true;
        p.x = nozzleX;
        p.y = nozzleY;
        p.z = nozzleZ;

        // Arc toward the box with spread
        const dx = BOX_POSITION[0] - nozzleX;
        const dz = BOX_POSITION[2] - nozzleZ;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const speed = (pressure / MAX_PRESSURE) * PARTICLE_INITIAL_SPEED;

        p.vx = (dx / dist) * speed + (Math.random() - 0.5) * PARTICLE_SPREAD;
        p.vy = 2.0 + Math.random() * 1.5;
        p.vz = (dz / dist) * speed + (Math.random() - 0.5) * PARTICLE_SPREAD;
        p.life = 0;
        p.maxLife = 0.8 + Math.random() * 0.6;
        spawned++;
      }
    }
  }, [position]);

  // ---------------------------------------------------------------------------
  // Frame loop
  // ---------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    const phase = phaseRef.current;
    const inputManager = InputManager.getInstance();

    // ==================================================================
    // BLOW PHASE — pressure simulation + particle bursts
    // ==================================================================

    if (phase === 'blow') {
      const holding = inputManager.isActionHeld('interact');

      // Build or decay pressure
      if (holding) {
        pressureRef.current = Math.min(
          MAX_PRESSURE,
          pressureRef.current + PRESSURE_BUILD_RATE * dt,
        );
      } else {
        if (pressureRef.current > 0) {
          // Release: emit burst proportional to built pressure
          emitBurst();
        }
        pressureRef.current = Math.max(0, pressureRef.current - PRESSURE_DECAY_RATE * dt);
      }

      // Timer countdown
      timerRef.current = Math.max(0, timerRef.current - dt);
      setChallengeTimeRemaining(timerRef.current);
      setChallengeProgress(Math.min(100, coverageRef.current));

      // Mr. Sausage reacts to pressure
      if (pressureRef.current > MAX_PRESSURE * 0.8) {
        setMrSausageReaction('excitement');
      } else if (pressureRef.current > MAX_PRESSURE * 0.4) {
        setMrSausageReaction('nod');
      } else {
        setMrSausageReaction('idle');
      }

      // Timer expiry
      if (timerRef.current <= 0) {
        phaseRef.current = 'score';
        setChallengePhase('success');
        setMrSausageReaction('nod');
        successDelayRef.current = 0;
      }
    }

    // ==================================================================
    // SCORE PHASE — brief pause then finalize
    // ==================================================================

    if (phase === 'score') {
      successDelayRef.current += dt;
      if (successDelayRef.current >= COMPLETE_DELAY_SEC) {
        phaseRef.current = 'complete';
        setChallengePhase('complete');

        const rawScore = Math.min(100, coverageRef.current);
        const penalty = floorHitsRef.current * FLOOR_PENALTY_PER_HIT;
        const score = Math.max(0, Math.round(rawScore - penalty));

        setBlowoutScore(score);
        completeChallenge(score);
      }
    }

    // ==================================================================
    // PARTICLE UPDATE — physics + collision detection
    // ==================================================================

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleState.current[i];
      const mesh = particleRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.life += dt;

      // Gravity
      p.vy += PARTICLE_GRAVITY * dt;

      // Integrate position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      mesh.position.set(p.x, p.y, p.z);
      mesh.visible = true;

      // Lifetime expiry
      if (p.life >= p.maxLife) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      // Floor collision (y <= station floor)
      if (p.y <= position[1] + 0.05) {
        p.active = false;
        mesh.visible = false;
        // Count floor hit during blow phase (phase may have advanced to score)
        if (phaseRef.current === 'blow' || phaseRef.current === 'score') {
          floorHitsRef.current += 1;
        }
        continue;
      }

      // Box collision — simple AABB check
      const boxX = position[0] + BOX_POSITION[0];
      const boxY = position[1] + BOX_POSITION[1];
      const boxZ = position[2] + BOX_POSITION[2];

      const hitBox =
        Math.abs(p.x - boxX) < BOX_HALF_WIDTH &&
        Math.abs(p.y - boxY) < BOX_HALF_HEIGHT &&
        p.z >= boxZ - 0.05 &&
        p.z <= boxZ + 0.08;

      if (hitBox) {
        p.active = false;
        mesh.visible = false;
        coverageRef.current = Math.min(100, coverageRef.current + COVERAGE_PER_HIT);

        // Map hit position to UV-like 0-1 coords for splat texture
        const u = (p.x - (boxX - BOX_HALF_WIDTH)) / (BOX_HALF_WIDTH * 2);
        const v = (p.y - (boxY - BOX_HALF_HEIGHT)) / (BOX_HALF_HEIGHT * 2);

        if (addSplatRef.current) {
          addSplatRef.current(u, v);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Dining table surface */}
      <mesh position={[0, 0.85, -0.4]}>
        <boxGeometry args={[1.2, 0.04, 0.8]} />
        <meshStandardMaterial color={[0.45, 0.32, 0.18]} roughness={0.7} />
      </mesh>

      {/* Table legs */}
      {(
        [
          [0.55, 0.4, -0.1],
          [-0.55, 0.4, -0.1],
          [0.55, 0.4, -0.7],
          [-0.55, 0.4, -0.7],
        ] as [number, number, number][]
      ).map((legPos, i) => (
        <mesh key={`leg_${i}`} position={legPos}>
          <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
          <meshStandardMaterial color={[0.35, 0.25, 0.12]} roughness={0.8} />
        </mesh>
      ))}

      {/* Place setting */}
      <group position={[0, 0.87, -0.38]}>
        {/* Plate */}
        <mesh position={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.14, 0.14, 0.012, 24]} />
          <meshStandardMaterial color={[0.95, 0.95, 0.92]} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Fork */}
        <mesh position={[-0.18, 0, 0.05]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.015, 0.004, 0.16]} />
          <meshStandardMaterial color={[0.75, 0.75, 0.78]} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Knife */}
        <mesh position={[0.18, 0, 0.05]}>
          <boxGeometry args={[0.015, 0.004, 0.16]} />
          <meshStandardMaterial color={[0.75, 0.75, 0.78]} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Glass */}
        <mesh position={[0.22, 0.04, -0.1]}>
          <cylinderGeometry args={[0.025, 0.022, 0.1, 10]} />
          <meshStandardMaterial
            color={[0.85, 0.95, 1.0]}
            transparent
            opacity={0.4}
            roughness={0.05}
          />
        </mesh>

        {/* Napkin */}
        <mesh position={[-0.22, 0, 0.05]} rotation={[0, 0.2, 0]}>
          <planeGeometry args={[0.1, 0.1]} />
          <meshStandardMaterial color={[0.95, 0.92, 0.88]} roughness={0.9} />
        </mesh>
      </group>

      {/* Cereal box on table */}
      <CerealBox
        position={BOX_POSITION}
        onSplatReady={(fn: (u: number, v: number) => void) => {
          addSplatRef.current = fn;
        }}
      />

      {/* Particles */}
      {Array.from({length: PARTICLE_COUNT}, (_, i) => (
        <mesh
          key={`blowout_p_${i}`}
          ref={el => {
            particleRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.022, 5, 5]} />
          <meshBasicMaterial color={particleColor.current} />
        </mesh>
      ))}
    </group>
  );
}
