/**
 * @module GrinderOrchestrator
 * ECS-driven replacement for GrinderMechanics.
 *
 * Spawns grinder machine entities from GRINDER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (toggle, plunger).
 *
 * Challenge-specific elements (meat chunks, ground-meat particles) remain
 * as R3F JSX since they are unique to the grinder challenge and not part
 * of the machine's compositional ECS model.
 *
 * ECS systems handle:
 * - VibrationSystem: housing vibration when powered
 * - RotationSystem: faceplate spin when powered
 * - ToggleSystem: switch on/off processing
 * - PlungerSystem: drag-to-displacement conversion + spring-back
 * - InputContractSystem: wiring switch -> vibration/rotation/power
 *
 * The orchestrator only:
 * - Toggles enabled flags on input primitives based on game phase
 * - Reads input primitive outputs (toggle.isOn, plunger.displacement)
 * - Manages challenge-specific elements (chunks, particles)
 * - Fires onGrindComplete callback to Zustand store
 */

import {useFrame} from '@react-three/fiber';
import {damp3} from 'maath/easing';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {INGREDIENTS} from '../../engine/Ingredients';
import {createMeatMaterial} from '../../engine/MeatTexture';
import {useGameStore} from '../../store/gameStore';
import {GRINDER_ARCHETYPE} from '../archetypes/grinderArchetype';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrinderOrchestratorProps {
  position: [number, number, number];
  counterY: number;
  visible: boolean;
  onGrindComplete?: (groundVolume: number) => void;
}

type ChunkState = 'BOWL' | 'TRAY' | 'CHUTE';

interface ChunkData {
  id: number;
  state: ChunkState;
  targetPos: THREE.Vector3;
}

interface ParticleData {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_G_PARTS = 150;

const CHUNK_BOWL_OFFSETS = Array.from({length: 15}, (_, i) => {
  const angle = (i / 15) * Math.PI * 6;
  const r = 0.3 + (i % 5) * 0.45;
  return {
    x: Math.cos(angle) * r,
    yExtra: (i % 3) * 0.4,
    z: Math.sin(angle) * r,
  };
});

function makeParticleGeo() {
  return new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6).rotateX(Math.PI / 2);
}

// ---------------------------------------------------------------------------
// GrinderOrchestrator
// ---------------------------------------------------------------------------

export const GrinderOrchestrator = ({
  position,
  counterY,
  visible,
  onGrindComplete,
}: GrinderOrchestratorProps) => {
  // ---- ECS entity lifecycle ----
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    const entities = spawnMachine(GRINDER_ARCHETYPE);
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- local phase state ----
  const [gamePhase, setGamePhase] = useState<'fill' | 'grind' | 'done'>('fill');

  // ---- chunk state machine ----
  const [chunks, setChunks] = useState<ChunkData[]>(() =>
    Array.from({length: 15}, (_, i) => ({
      id: i,
      state: 'BOWL' as ChunkState,
      targetPos: new THREE.Vector3(
        CHUNK_BOWL_OFFSETS[i].x,
        CHUNK_BOWL_OFFSETS[i].yExtra,
        CHUNK_BOWL_OFFSETS[i].z,
      ),
    })),
  );

  // ---- mutable refs (avoid stale closure in useFrame) ----
  const groundVolRef = useRef(0);
  const meatInChuteRef = useRef(0);
  const gamePhasRef = useRef<'fill' | 'grind' | 'done'>('fill');
  const prevDisplacementRef = useRef(0);

  gamePhasRef.current = gamePhase;

  // ---- mesh refs ----
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const chunkRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: 15}, () => null));

  // Particle data
  const particleDataRef = useRef<ParticleData[]>(
    Array.from({length: MAX_G_PARTS}, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
    })),
  );
  const dummyRef = useRef(new THREE.Object3D());

  // ---- materials ----
  const meatMat = useMemo(() => createMeatMaterial(), []);

  // ---- ingredient-based chunk colors ----
  const bowlContents = useGameStore(s => s.bowlContents);
  const chunkColors = useMemo(() => {
    if (bowlContents.length === 0) return null;
    const colors: string[] = [];
    for (const name of bowlContents) {
      const ing = INGREDIENTS.find(i => i.name === name);
      if (ing) colors.push(ing.decomposition.chunkColor);
    }
    return colors.length > 0 ? colors : null;
  }, [bowlContents]);

  const chunkMats = useMemo(() => {
    if (!chunkColors) return null;
    return Array.from({length: 15}, (_, i) => {
      const hex = chunkColors[i % chunkColors.length];
      return new THREE.MeshStandardMaterial({color: hex, roughness: 0.7, metalness: 0.1});
    });
  }, [chunkColors]);

  // ---- geometry ----
  const chunkGeo = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), []);
  const particleGeo = useMemo(() => makeParticleGeo(), []);

  const cY = counterY;

  // ---- Enable/disable ECS input primitives based on game phase ----
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      if (entity.toggle) {
        entity.toggle.enabled = gamePhase === 'grind';
      }
      if (entity.plunger) {
        entity.plunger.enabled = gamePhase === 'grind';
      }
    }
  }, [gamePhase]);

  // ---- chunk click handler ----
  const handleChunkClick = (chunkId: number) => {
    if (gamePhasRef.current !== 'fill') return;

    setChunks(prev => {
      const next = prev.map(c => {
        if (c.id !== chunkId) return c;
        if (c.state === 'BOWL') {
          const ang = (chunkId / 15) * Math.PI * 4;
          const r = (chunkId % 5) * 0.5;
          return {
            ...c,
            state: 'TRAY' as ChunkState,
            targetPos: new THREE.Vector3(
              (Math.cos(ang) * r * 3) / 3,
              cY + 6,
              0.5 + (Math.sin(ang) * r * 2) / 3,
            ),
          };
        }
        if (c.state === 'TRAY') {
          meatInChuteRef.current += 1;
          return {
            ...c,
            state: 'CHUTE' as ChunkState,
            targetPos: new THREE.Vector3(0, cY + 4.5, 0.5),
          };
        }
        return c;
      });

      const allInChute = next.every(c => c.state === 'CHUTE' || c.state === 'BOWL');
      const justFinishedTray =
        next.every(c => c.state !== 'TRAY') && prev.some(c => c.state === 'TRAY');
      if (justFinishedTray && allInChute) {
        setGamePhase('grind');
      }

      return next;
    });
  };

  // ---- useFrame: read ECS state + particle physics + chunk damp ----
  useFrame((_, delta) => {
    if (!visible) return;

    const phase = gamePhasRef.current;

    // --- Read ECS state for game logic ---
    const switchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-body');
    const isGrinderOn = switchEntity?.toggle?.isOn ?? false;

    const plungerEntity = entitiesRef.current.find(
      e => e.machineSlot?.slotName === 'plunger-hitbox',
    );
    const plungerDisplacement = plungerEntity?.plunger?.displacement ?? 0;

    // --- Grind logic: plunger displacement increasing while grinder on ---
    if (
      phase === 'grind' &&
      isGrinderOn &&
      meatInChuteRef.current > 0 &&
      plungerDisplacement > prevDisplacementRef.current
    ) {
      const push = plungerDisplacement - prevDisplacementRef.current;
      groundVolRef.current += push * 0.6;
      if (Math.random() < push * 15)
        meatInChuteRef.current = Math.max(0, meatInChuteRef.current - 1);

      // Spawn particles
      const pData = particleDataRef.current;
      for (let i = 0; i < 3; i++) {
        const p = pData.find(d => !d.active);
        if (p) {
          p.active = true;
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.8;
          p.pos.set(r * Math.cos(ang), cY + 2.5, 2.1);
          p.vel.set((Math.random() - 0.5) * 1, -2 - Math.random() * 2, 1 + Math.random() * 2);
          p.rot.set(0, 0, 0);
        }
      }

      // Grind complete
      if (groundVolRef.current >= 0.25) {
        meatInChuteRef.current = 0;
        setGamePhase('done');
        gamePhasRef.current = 'done';
        onGrindComplete?.(groundVolRef.current);
      }
    }
    prevDisplacementRef.current = plungerDisplacement;

    // --- Switch notch visual animation ---
    const notchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-notch');
    if (notchEntity?.three) {
      const targetZ = isGrinderOn ? Math.PI / 4 : 0;
      notchEntity.three.rotation.z +=
        (targetZ - notchEntity.three.rotation.z) * Math.min(1, delta * 10);
    }

    // --- Chunk position damp ---
    for (let i = 0; i < 15; i++) {
      const mesh = chunkRefs.current[i];
      if (!mesh) continue;
      const chunk = chunks[i];
      if (chunk.state === 'CHUTE') {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      damp3(mesh.position, chunk.targetPos.toArray(), 0.12, delta);
    }

    // --- Particle physics ---
    const pData = particleDataRef.current;
    const pMesh = particleMeshRef.current;
    const dummy = dummyRef.current;
    let needsUpdate = false;

    if ((phase === 'grind' || phase === 'done') && pMesh) {
      const groundY = cY + 0.5 + groundVolRef.current * 1.5;
      for (let i = 0; i < MAX_G_PARTS; i++) {
        const p = pData[i];
        if (p.active) {
          p.vel.y -= 15 * delta;
          p.pos.addScaledVector(p.vel, delta);
          p.rot.x += delta;
          if (p.pos.y < groundY) {
            p.active = false;
          }
          dummy.position.copy(p.pos);
          dummy.rotation.copy(p.rot);
        } else {
          dummy.position.set(0, 999, 0);
        }
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
      }
      if (needsUpdate) pMesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* ECS machine entities — rendered with automatic input event wiring */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* Meat chunks — challenge-specific, not ECS */}
      <group position={[-5, cY, 2]}>
        {chunks.map((chunk, i) => (
          <mesh
            key={chunk.id}
            ref={el => {
              chunkRefs.current[i] = el;
            }}
            position={chunk.targetPos.toArray()}
            visible={chunk.state !== 'CHUTE'}
            castShadow
            onClick={() => handleChunkClick(chunk.id)}
          >
            <primitive object={chunkGeo} attach="geometry" />
            <primitive object={chunkMats ? chunkMats[i] : meatMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Ground meat particles */}
      <instancedMesh ref={particleMeshRef} args={[particleGeo, meatMat, MAX_G_PARTS]}>
        <primitive object={particleGeo} attach="geometry" />
        <primitive object={meatMat} attach="material" />
      </instancedMesh>
    </group>
  );
};
