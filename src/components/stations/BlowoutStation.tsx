/**
 * @module BlowoutStation
 * The "Will It Blow?" climax (design pillar #3).
 *
 * The player picks up the stuffing tube, aims at a cereal box with a
 * surreal drawing, and slams down. The tube's contents spray onto the
 * box face as a persistent composite-colour splatter via CanvasTexture.
 * Mr. Sausage scores the result based on the composite tier — a
 * function of the ingredient mix's density, fat, and moisture.
 *
 * This is the first HARD-COMMIT moment: before blowing, the player
 * can still fix mistakes; after, the splatter is permanent and scoring
 * is locked in.
 *
 * Determinism note (T0.A): all random jitter (tube initial pressure,
 * particle scatter, splatter positions) routes through a per-component
 * seeded RNG. Save-scummed reloads see the same blow pattern.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useCallback, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {audioEngine} from '../../engine/AudioEngine';
import {compositeMix} from '../../engine/IngredientComposition';
import {useRunRng} from '../../engine/useRunRng';
import {requestHandGesture} from '../camera/handGestureStore';
import type {createSplatterCanvas} from './blowout/CanvasTextureSplatter';
import {CerealBoxTarget} from './blowout/CerealBoxTarget';
import {getCompositeTier} from './blowout/compositeTier';

const PARTICLE_COUNT = 80;
const SPLATTER_COUNT = 12;

/**
 * Closure-bound RNG helper. We can't read the seeded `rng` at module
 * level because the seed isn't established until the player starts a
 * run; this factory binds a stable per-component RNG when the
 * component mounts. Caller passes its `useRunRng()` result in.
 */
function makeRand(rng: () => number) {
  return (min: number, max: number): number => min + rng() * (max - min);
}

export function BlowoutStation() {
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const recordFlairPoint = useGameStore(state => state.recordFlairPoint);
  const setMrSausageReaction = useGameStore(state => state.setMrSausageReaction);
  const currentRoundSelection = useGameStore(state => state.currentRoundSelection);

  // Per-component seeded RNG. Save-scummed reload -> same blow pattern.
  const rng = useRunRng('Blowout.particles');
  const rand = useMemo(() => makeRand(rng), [rng]);

  // --- Cereal box splatter API ---
  const splatterRef = useRef<ReturnType<typeof createSplatterCanvas> | null>(null);
  const onCerealBoxReady = useCallback((api: ReturnType<typeof createSplatterCanvas>) => {
    splatterRef.current = api;
  }, []);

  // --- Interaction state (refs to avoid stale closures in useFrame) ---
  const [pickedUp, setPickedUp] = useState(false);

  const tubeRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Tube pressure -- randomized per appearance (0.2 to 1.0). Initial
  // value uses the seeded `rand` so the first appearance is stable
  // across reloads (the on-enter reset re-rolls from the same RNG).
  const tubePressure = useRef(rand(0.2, 1.0));
  // Wobble phase accumulator
  const wobblePhase = useRef(0);
  // Drag tracking for slam velocity
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const lastPointerY = useRef(0);
  const slamVelocity = useRef(0);
  // Explosion timer
  const explosionTimer = useRef(0);
  const hasExploded = useRef(false);

  // Particle data (positions + velocities for the burst)
  const particles = useRef(
    Array.from({length: PARTICLE_COUNT}, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
    })),
  );

  // Splatter stain positions (placed after particles land). Each
  // entry carries its own pre-rolled rotation so re-renders don't
  // shuffle the stains.
  const [splatters, setSplatters] = useState<
    {pos: [number, number, number]; scale: number; rot: number}[]
  >([]);

  const {size} = useThree();

  // --- Reset when phase enters BLOWOUT ---
  const prevPhase = useRef(gamePhase);
  if (gamePhase === 'BLOWOUT' && prevPhase.current !== 'BLOWOUT') {
    tubePressure.current = rand(0.2, 1.0);
    wobblePhase.current = 0;
    hasExploded.current = false;
    explosionTimer.current = 0;
    slamVelocity.current = 0;
    setPickedUp(false);
    setSplatters([]);
    splatterRef.current?.clear();
    for (const p of particles.current) {
      p.active = false;
    }
  }
  prevPhase.current = gamePhase;

  // --- Slam detection ---
  const onPointerDown = useCallback(
    (e: any) => {
      if (gamePhase !== 'BLOWOUT' || hasExploded.current) return;
      e.stopPropagation();
      if (!pickedUp) {
        setPickedUp(true);
        audioEngine.playSound('click');
        requestHandGesture('grab_left');
        return;
      }
      isDragging.current = true;
      dragStartY.current = e.clientY ?? e.nativeEvent?.clientY ?? 0;
      lastPointerY.current = dragStartY.current;
      slamVelocity.current = 0;
    },
    [gamePhase, pickedUp],
  );

  const onPointerMove = useCallback((e: any) => {
    if (!isDragging.current || hasExploded.current) return;
    const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0;
    const delta = clientY - lastPointerY.current;
    // Positive delta = dragging downward = good slam direction
    slamVelocity.current = Math.max(slamVelocity.current, delta);
    lastPointerY.current = clientY;
  }, []);

  const triggerExplosion = useCallback(() => {
    if (hasExploded.current) return;
    hasExploded.current = true;

    // ─── Composite tier scoring (T1.A) ────────────────────────────
    // Build the composite mix from selected ingredients and score it.
    const mix = compositeMix(currentRoundSelection);
    const tierResult = getCompositeTier(mix);

    // Normalize slam velocity and blend with composite potential.
    const normalizedVelocity = Math.min(
      1.0,
      Math.max(0, slamVelocity.current) / (size.height * 0.06),
    );
    const power = normalizedVelocity * 0.4 + tierResult.power * 0.6;

    // Record flair points from the composite tier.
    if (tierResult.points > 0) {
      recordFlairPoint(tierResult.label, tierResult.points);
    }
    setMrSausageReaction(tierResult.reaction);
    audioEngine.playSound('burst');

    // Paint the cereal box with the composite colour splatter.
    if (splatterRef.current) {
      splatterRef.current.paintBurst(mix.color, power, rng);
    }

    // Match the hand gesture to the result.
    if (tierResult.tier === 'massive' || tierResult.tier === 'clean') {
      requestHandGesture('thumbs_up');
    } else {
      requestHandGesture('flip_off');
    }

    // Spawn particles proportional to power.
    const count = tierResult.tier === 'dud' ? 3 : Math.floor(power * PARTICLE_COUNT);
    const speed = tierResult.tier === 'dud' ? 1 : 3 + power * 8;
    for (let i = 0; i < count; i++) {
      const p = particles.current[i];
      p.active = true;
      p.life = 1.0;
      p.pos.set(rand(-0.1, 0.1), 0.05, rand(-0.1, 0.1));
      p.vel.set(rand(-1, 1) * speed * 0.5, rand(0.5, 1.5) * speed, rand(-1, 1) * speed * 0.5);
    }

    explosionTimer.current = 0;
  }, [size.height, recordFlairPoint, setMrSausageReaction, rand, currentRoundSelection, rng]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current || hasExploded.current) return;
    isDragging.current = false;
    if (slamVelocity.current > 2) {
      requestHandGesture('swing_left');
      triggerExplosion();
    }
  }, [triggerExplosion]);

  // --- Tube wobble + particle sim ---
  useFrame((_state, delta) => {
    if (gamePhase !== 'BLOWOUT') return;

    // Wobble the tube with internal pressure
    if (tubeRef.current && !hasExploded.current && pickedUp) {
      wobblePhase.current += delta * (4 + tubePressure.current * 8);
      const intensity = tubePressure.current * 0.06;
      tubeRef.current.rotation.z = Math.sin(wobblePhase.current * 3.7) * intensity;
      tubeRef.current.rotation.x = Math.cos(wobblePhase.current * 2.3) * intensity * 0.7;
      const pulse = 1 + Math.sin(wobblePhase.current * 5) * tubePressure.current * 0.04;
      tubeRef.current.scale.set(pulse, 1, pulse);
    }

    // After explosion: simulate particles
    if (hasExploded.current && particlesRef.current) {
      explosionTimer.current += delta;
      const newSplatters: {pos: [number, number, number]; scale: number; rot: number}[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles.current[i];
        if (!p.active) {
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0.01, 0.01, 0.01);
          dummy.updateMatrix();
          particlesRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }

        p.vel.y -= 12 * delta; // gravity
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta * 0.8;

        // Ground collision -- spawn splatter
        if (p.pos.y <= 0) {
          p.active = false;
          newSplatters.push({
            pos: [p.pos.x, 0.005, p.pos.z],
            scale: rand(0.08, 0.25),
            rot: rand(0, Math.PI * 2),
          });
          dummy.position.set(0, -999, 0);
        } else {
          dummy.position.copy(p.pos);
        }

        const s = 0.02 + p.life * 0.03;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }

      particlesRef.current.instanceMatrix.needsUpdate = true;

      if (newSplatters.length > 0) {
        setSplatters(prev => [...prev, ...newSplatters].slice(0, SPLATTER_COUNT));
      }

      // Advance phase after explosion display
      if (explosionTimer.current > 2.0) {
        setGamePhase('MOVE_SAUSAGE');
      }
    }
  });

  if (gamePhase !== 'BLOWOUT') return null;

  return (
    <group position={[-1.5, 0, 1.5]}>
      {/* Cereal box target (T1.A) -- receives the composite-colour splatter */}
      <CerealBoxTarget position={[0, 0.6, -0.5]} onReady={onCerealBoxReady} />

      {/* Concrete slam target -- a dark patch on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial color="#3a3a3a" roughness={1} metalness={0} />
      </mesh>
      {/* Target ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.55, 0.6, 32]} />
        <meshStandardMaterial
          color="#661111"
          roughness={0.9}
          emissive="#330808"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* The plastic tube -- semi-transparent, pulsing with pressure */}
      {!hasExploded.current && (
        <mesh
          ref={tubeRef}
          position={pickedUp ? [0, 0.8, 0.3] : [0.4, 0.3, 0]}
          rotation={pickedUp ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          castShadow
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <cylinderGeometry args={[0.06, 0.07, 0.5, 16, 8, true]} />
          <meshPhysicalMaterial
            color="#cc8866"
            transmission={0.4}
            opacity={0.85}
            transparent
            roughness={0.3}
            thickness={0.05}
            side={THREE.DoubleSide}
          />
          {/* Filling visible inside the tube */}
          <mesh>
            <cylinderGeometry args={[0.045, 0.055, 0.48, 12]} />
            <meshStandardMaterial
              color="#6b1a1a"
              roughness={0.8}
              transparent
              opacity={0.7 + tubePressure.current * 0.3}
            />
          </mesh>
          {/* End caps -- sealed with filling bulging out */}
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.06, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color="#993322"
              transmission={0.2}
              opacity={0.9}
              transparent
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.07, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color="#993322"
              transmission={0.2}
              opacity={0.9}
              transparent
              roughness={0.4}
            />
          </mesh>
          {/* Invisible larger hitbox for easier grabbing */}
          <mesh visible={false}>
            <cylinderGeometry args={[0.15, 0.15, 0.7, 8]} />
            <meshBasicMaterial />
          </mesh>
        </mesh>
      )}

      {/* Filling particles -- grotesque meat chunks flying */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial color="#6b1a1a" roughness={0.9} />
      </instancedMesh>

      {/* Splatter stains on the floor */}
      {splatters.map((s, i) => (
        <mesh
          key={`splat-${i}-${s.pos[0].toFixed(3)}`}
          rotation={[-Math.PI / 2, 0, s.rot]}
          position={s.pos}
        >
          <circleGeometry args={[s.scale, 8]} />
          <meshStandardMaterial color="#4a0e0e" roughness={1} transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Spot light on the slam zone for dramatic effect */}
      <spotLight
        position={[0, 3, 0]}
        angle={0.4}
        penumbra={0.6}
        intensity={2}
        color="#ffddcc"
        castShadow
        target-position={[0, 0, 0]}
      />
    </group>
  );
}
