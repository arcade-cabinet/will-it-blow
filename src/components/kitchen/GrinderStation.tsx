import {useFrame} from '@react-three/fiber';
import type {RapierRigidBody} from '@react-three/rapier';
import {BallCollider, CylinderCollider, RigidBody} from '@react-three/rapier';
import {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import type * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

interface GrinderStationProps {
  position: [number, number, number];
  grindProgress: number; // 0-100
  crankAngle: number; // Current rotation angle in radians
  isSplattering: boolean; // Trigger splatter visual
}

const GRINDER_BASE_Y = 0;

// Geometry constants
const BODY_HEIGHT = 0.7;
const HOPPER_HEIGHT = 0.5;
const CRANK_ARM_LENGTH = 0.5;

// Particle counts
const MEAT_CHUNK_COUNT = 6;
const OUTPUT_PARTICLE_MAX = 12;
const SPLATTER_PARTICLE_COUNT = 10;

// Splatter duration in seconds
const SPLATTER_DURATION = 0.8;

// Gravity applied per-body (world gravity is 0 for sensor system)
const GRAVITY_Y = -9.8;

// Pre-compute meat chunk layout (deterministic for consistent rendering)
const MEAT_CHUNK_LAYOUT = Array.from({length: MEAT_CHUNK_COUNT}, (_, i) => {
  const angle = (i / MEAT_CHUNK_COUNT) * Math.PI * 2;
  const radius = 0.14 + i * 0.013; // Deterministic spread instead of random
  const yOffset = (i * 0.03) % 0.2;
  const size = 0.08 + i * 0.01; // Slight size variation, deterministic
  return {
    x: Math.cos(angle) * radius,
    y: GRINDER_BASE_Y + BODY_HEIGHT + HOPPER_HEIGHT * 0.3 + yOffset,
    z: Math.sin(angle) * radius,
    size,
  };
});

// Pre-compute output particle layout
const OUTPUT_PARTICLE_LAYOUT = Array.from({length: OUTPUT_PARTICLE_MAX}, (_, i) => ({
  x: ((i % 3) - 1) * 0.05,
  y: GRINDER_BASE_Y + BODY_HEIGHT * 0.2 - i * 0.04,
  z: 0.55 + (i % 4) * 0.025,
}));

// Pre-compute splatter particle sizes and initial velocities
const SPLATTER_SIZES = Array.from({length: SPLATTER_PARTICLE_COUNT}, (_, i) => 0.05 + i * 0.008);
const SPLATTER_VELOCITIES = Array.from({length: SPLATTER_PARTICLE_COUNT}, (_, i) => ({
  x: Math.sin(i * 1.7) * 0.5 * 4,
  y: Math.abs(Math.cos(i * 2.3)) * 3 + 1,
  z: Math.cos(i * 1.3) * 0.5 * 4,
}));

// -----------------------------------------------------------------
// PhysicsMeatChunk — a single dynamic rigid body meat chunk (web only)
// -----------------------------------------------------------------

function PhysicsMeatChunk({
  chunk,
  visible,
}: {
  chunk: (typeof MEAT_CHUNK_LAYOUT)[number];
  visible: boolean;
}) {
  const rbRef = useRef<RapierRigidBody>(null);
  const wasVisible = useRef(visible);

  // Apply per-body gravity each frame (world gravity is 0)
  useFrame(() => {
    const rb = rbRef.current;
    if (!rb || !visible) return;
    const mass = rb.mass();
    rb.addForce({x: 0, y: GRAVITY_Y * mass, z: 0}, true);
  });

  // Reset position when chunk becomes visible again (new round)
  useEffect(() => {
    if (visible && !wasVisible.current) {
      const rb = rbRef.current;
      if (rb) {
        rb.setTranslation({x: chunk.x, y: chunk.y, z: chunk.z}, true);
        rb.setLinvel({x: 0, y: 0, z: 0}, true);
        rb.setAngvel({x: 0, y: 0, z: 0}, true);
        rb.wakeUp();
      }
    }
    wasVisible.current = visible;
  }, [visible, chunk.x, chunk.y, chunk.z]);

  if (!visible) return null;

  const s = chunk.size / 0.04;
  return (
    <RigidBody
      ref={rbRef}
      type="dynamic"
      position={[chunk.x, chunk.y, chunk.z]}
      colliders={false}
      restitution={0.3}
      friction={0.5}
    >
      <BallCollider args={[0.04 * s]} />
      <mesh scale={[s, s, s]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color={[0.6, 0.15, 0.1]} />
      </mesh>
    </RigidBody>
  );
}

// -----------------------------------------------------------------
// PhysicsSplatterParticle — a single dynamic splatter particle (web only)
// -----------------------------------------------------------------

function PhysicsSplatterParticle({
  index,
  size,
  active,
  originY,
}: {
  index: number;
  size: number;
  active: boolean;
  originY: number;
}) {
  const rbRef = useRef<RapierRigidBody>(null);
  const wasActive = useRef(false);
  const scaleRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // On rising edge of active, reset position and apply impulse
  useEffect(() => {
    if (active && !wasActive.current) {
      const rb = rbRef.current;
      if (rb) {
        rb.setTranslation({x: 0, y: originY, z: 0}, true);
        rb.setLinvel({x: 0, y: 0, z: 0}, true);
        rb.setAngvel({x: 0, y: 0, z: 0}, true);
        rb.wakeUp();
        const vel = SPLATTER_VELOCITIES[index];
        rb.setLinvel({x: vel.x, y: vel.y, z: vel.z}, true);
      }
      timeRef.current = 0;
    }
    wasActive.current = active;
  }, [active, index, originY]);

  // Apply gravity and fade scale each frame
  useFrame((_, delta) => {
    const rb = rbRef.current;
    if (!rb || !active) return;

    const mass = rb.mass();
    rb.addForce({x: 0, y: GRAVITY_Y * mass, z: 0}, true);

    // Fade out over SPLATTER_DURATION
    timeRef.current += delta;
    const fadeScale = Math.max(0, 1.0 - timeRef.current / SPLATTER_DURATION);
    if (scaleRef.current) {
      scaleRef.current.scale.setScalar(fadeScale * (size / 0.03));
    }
  });

  if (!active) return null;

  return (
    <RigidBody
      ref={rbRef}
      type="dynamic"
      position={[0, originY, 0]}
      colliders={false}
      restitution={0.5}
      friction={0.3}
    >
      <BallCollider args={[size * 0.5]} />
      <mesh ref={scaleRef} scale={size / 0.03}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color={[0.8, 0.05, 0.02]} />
      </mesh>
    </RigidBody>
  );
}

// -----------------------------------------------------------------
// ManualMeatChunks — original manual animation (native fallback)
// -----------------------------------------------------------------

function ManualMeatChunks({chunkScale}: {chunkScale: number}) {
  const chunksVisible = chunkScale > 0.05;
  if (!chunksVisible) return null;
  return (
    <>
      {MEAT_CHUNK_LAYOUT.map((chunk, i) => {
        const s = chunkScale * (chunk.size / 0.04);
        return (
          <mesh key={`meatChunk_${i}`} position={[chunk.x, chunk.y, chunk.z]} scale={[s, s, s]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color={[0.6, 0.15, 0.1]} />
          </mesh>
        );
      })}
    </>
  );
}

// -----------------------------------------------------------------
// ManualSplatterParticles — original manual particle sim (native fallback)
// -----------------------------------------------------------------

function ManualSplatterParticles({isSplattering}: {isSplattering: boolean}) {
  const splatterRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: SPLATTER_PARTICLE_COUNT}, () => null),
  );
  const splatterStateRef = useRef({
    active: false,
    time: 0,
    velocities: Array.from(
      {length: SPLATTER_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
    positions: Array.from(
      {length: SPLATTER_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
  });
  const prevSplatteringRef = useRef(false);

  useFrame((_, delta) => {
    const ss = splatterStateRef.current;

    if (isSplattering && !prevSplatteringRef.current) {
      ss.active = true;
      ss.time = 0;
      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        ss.positions[i] = [0, GRINDER_BASE_Y + BODY_HEIGHT, 0];
        const vel = SPLATTER_VELOCITIES[i];
        ss.velocities[i] = [vel.x, vel.y, vel.z];
      }
    }
    prevSplatteringRef.current = isSplattering;

    if (ss.active) {
      ss.time += delta;
      const fadeScale = Math.max(0, 1.0 - ss.time / SPLATTER_DURATION);

      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        const mesh = splatterRefs.current[i];
        if (!mesh) continue;

        ss.positions[i][0] += ss.velocities[i][0] * delta;
        ss.positions[i][1] += ss.velocities[i][1] * delta;
        ss.positions[i][2] += ss.velocities[i][2] * delta;
        ss.velocities[i][1] += GRAVITY_Y * delta;

        mesh.position.set(ss.positions[i][0], ss.positions[i][1], ss.positions[i][2]);
        mesh.scale.setScalar(fadeScale);
        mesh.visible = true;
      }

      if (ss.time > SPLATTER_DURATION) {
        ss.active = false;
        for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
          const mesh = splatterRefs.current[i];
          if (mesh) mesh.visible = false;
        }
      }
    } else {
      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        const mesh = splatterRefs.current[i];
        if (mesh) mesh.visible = false;
      }
    }
  });

  return (
    <>
      {SPLATTER_SIZES.map((size, i) => (
        <mesh
          key={`splatter_${i}`}
          ref={el => {
            splatterRefs.current[i] = el;
          }}
          position={[0, GRINDER_BASE_Y + BODY_HEIGHT * 0.5, 0]}
          visible={false}
          scale={size / 0.03}
        >
          <sphereGeometry args={[0.03, 4, 4]} />
          <meshBasicMaterial color={[0.8, 0.05, 0.02]} />
        </mesh>
      ))}
    </>
  );
}

// -----------------------------------------------------------------
// GrinderStation — main exported component
// -----------------------------------------------------------------

export const GrinderStation = ({
  position,
  grindProgress,
  crankAngle,
  isSplattering,
}: GrinderStationProps) => {
  const bodyRef = useRef<THREE.Mesh>(null);
  const crankArmRef = useRef<THREE.Mesh>(null);
  const knobRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const setBowlPosition = useGameStore(s => s.setBowlPosition);

  // Receiver callback: accepts the mixing bowl being placed on the hopper
  const handleReceive = useCallback(
    (objectType: string, _objectId: string) => {
      if (objectType === 'bowl') {
        setBowlPosition('grinder');
        audioEngine.playPour();
      }
    },
    [setBowlPosition],
  );

  // Crank pivot point (right side of grinder body)
  const crankPivotX = 0.3;
  const crankPivotY = GRINDER_BASE_Y + BODY_HEIGHT * 0.5;
  const armRadius = CRANK_ARM_LENGTH / 2;

  // Meat chunk scale for native fallback
  const chunkScale = Math.max(0, 1.0 - grindProgress / 100);

  // Output particle visibility: proportional to progress
  const visibleOutputCount = Math.floor((grindProgress / 100) * OUTPUT_PARTICLE_MAX);

  const isWeb = Platform.OS === 'web';

  useFrame((_, delta) => {
    timeRef.current += delta;

    // --- Crank arm rotation ---
    if (crankArmRef.current) {
      crankArmRef.current.position.x = crankPivotX + Math.cos(crankAngle) * armRadius;
      crankArmRef.current.position.y = crankPivotY + Math.sin(crankAngle) * armRadius;
      crankArmRef.current.rotation.z = crankAngle + Math.PI / 2;
    }

    // --- Crank knob at end of arm ---
    if (knobRef.current) {
      knobRef.current.position.x = crankPivotX + Math.cos(crankAngle) * CRANK_ARM_LENGTH;
      knobRef.current.position.y = crankPivotY + Math.sin(crankAngle) * CRANK_ARM_LENGTH;
    }

    // --- Grinder body vibration ---
    if (bodyRef.current) {
      if (grindProgress > 0 && grindProgress < 100) {
        const vibration = Math.sin(timeRef.current * 40) * 0.003;
        bodyRef.current.position.x = vibration;
      } else {
        bodyRef.current.position.x = 0;
      }
    }
  });

  return (
    <group position={position}>
      {/* --- Grinder Body (main cylinder) --- */}
      {isWeb ? (
        <RigidBody type="fixed" colliders={false}>
          <CylinderCollider
            args={[BODY_HEIGHT / 2, 0.3]}
            position={[0, GRINDER_BASE_Y + BODY_HEIGHT / 2, 0]}
          />
          <mesh ref={bodyRef} position={[0, GRINDER_BASE_Y + BODY_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, BODY_HEIGHT, 16]} />
            <meshBasicMaterial color={[0.5, 0.5, 0.55]} />
          </mesh>
        </RigidBody>
      ) : (
        <mesh ref={bodyRef} position={[0, GRINDER_BASE_Y + BODY_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[0.3, 0.3, BODY_HEIGHT, 16]} />
          <meshBasicMaterial color={[0.5, 0.5, 0.55]} />
        </mesh>
      )}

      {/* --- Hopper (wider top, narrower bottom — funnel shape) --- */}
      <mesh position={[0, GRINDER_BASE_Y + BODY_HEIGHT + HOPPER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.35, 0.15, HOPPER_HEIGHT, 12]} />
        <meshBasicMaterial color={[0.55, 0.55, 0.6]} transparent opacity={0.85} />
      </mesh>

      {/* --- Invisible receiver at hopper opening for bowl drop --- */}
      <mesh
        position={[0, GRINDER_BASE_Y + BODY_HEIGHT + HOPPER_HEIGHT + 0.05, 0]}
        userData={{receiver: true, onReceive: handleReceive}}
      >
        <cylinderGeometry args={[0.35, 0.35, 0.1, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* --- Spout (horizontal cylinder for meat output) --- */}
      <mesh
        position={[0, GRINDER_BASE_Y + BODY_HEIGHT * 0.35, 0.45]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshBasicMaterial color={[0.45, 0.45, 0.5]} />
      </mesh>

      {/* --- Crank Arm (animated in useFrame) --- */}
      <mesh
        ref={crankArmRef}
        position={[crankPivotX + armRadius, crankPivotY, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.03, 0.03, CRANK_ARM_LENGTH, 8]} />
        <meshBasicMaterial color={[0.6, 0.6, 0.65]} />
      </mesh>

      {/* --- Crank Knob (animated in useFrame) --- */}
      <mesh ref={knobRef} position={[crankPivotX + CRANK_ARM_LENGTH, crankPivotY, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={[0.7, 0.2, 0.2]} />
      </mesh>

      {/* --- Meat Chunks in Hopper --- */}
      {isWeb ? (
        MEAT_CHUNK_LAYOUT.map((chunk, i) => {
          // Each chunk disappears when progress passes its threshold
          const threshold = ((i + 1) / MEAT_CHUNK_COUNT) * 100;
          return (
            <PhysicsMeatChunk
              key={`meatChunk_${i}`}
              chunk={chunk}
              visible={grindProgress < threshold}
            />
          );
        })
      ) : (
        <ManualMeatChunks chunkScale={chunkScale} />
      )}

      {/* --- Ground Meat Output Particles --- */}
      {OUTPUT_PARTICLE_LAYOUT.map((p, i) => (
        <mesh key={`groundMeat_${i}`} position={[p.x, p.y, p.z]} visible={i < visibleOutputCount}>
          <sphereGeometry args={[0.03, 4, 4]} />
          <meshBasicMaterial color={[0.5, 0.12, 0.08]} />
        </mesh>
      ))}

      {/* --- Splatter Particles --- */}
      {isWeb ? (
        SPLATTER_SIZES.map((size, i) => (
          <PhysicsSplatterParticle
            key={`splatter_${i}`}
            index={i}
            size={size}
            active={isSplattering}
            originY={GRINDER_BASE_Y + BODY_HEIGHT}
          />
        ))
      ) : (
        <ManualSplatterParticles isSplattering={isSplattering} />
      )}
    </group>
  );
};
