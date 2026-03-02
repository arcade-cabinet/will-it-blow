/**
 * @module GrinderOrchestrator
 * ECS-driven visual driver for the grinder station.
 *
 * Spawns grinder machine entities from GRINDER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (toggle, plunger).
 *
 * This orchestrator is VISUAL ONLY — it reads Zustand state set by the
 * 2D GrindingChallenge overlay and drives ECS entity animations.
 * It does NOT manage game phases, scoring, or strike logic.
 *
 * ECS systems handle:
 * - VibrationSystem: housing vibration when powered
 * - RotationSystem: faceplate spin when powered
 * - ToggleSystem: switch on/off processing
 * - PlungerSystem: drag-to-displacement conversion + spring-back
 * - InputContractSystem: wiring switch -> vibration/rotation/power
 */

import {useFrame} from '@react-three/fiber';
import {damp3} from 'maath/easing';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {INGREDIENTS} from '../../engine/Ingredients';
import {createMeatMaterial} from '../../engine/MeatTexture';
import {fireHaptic} from '../../input/HapticService';
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
  visible: boolean;
}

interface ChunkData {
  id: number;
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

export const GrinderOrchestrator = ({position, visible}: GrinderOrchestratorProps) => {
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

  // ---- Read challenge progress from Zustand (set by 2D overlay) ----
  const challengeProgress = useGameStore(s => s.challengeProgress);

  // ---- chunk data (decorative only) ----
  const chunks = useMemo<ChunkData[]>(
    () =>
      Array.from({length: 15}, (_, i) => ({
        id: i,
        targetPos: new THREE.Vector3(
          CHUNK_BOWL_OFFSETS[i].x,
          CHUNK_BOWL_OFFSETS[i].yExtra,
          CHUNK_BOWL_OFFSETS[i].z,
        ),
      })),
    [],
  );

  // ---- mesh refs ----
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const chunkRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: 15}, () => null));
  const prevProgressRef = useRef(0);
  const hapticAccumRef = useRef(0);

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

  // ---- Enable/disable ECS input primitives + haptic feedback ----
  useEffect(() => {
    if (visible) fireHaptic('toggle_click');
    for (const entity of entitiesRef.current) {
      if (entity.toggle) {
        entity.toggle.enabled = visible;
        entity.toggle.isOn = visible;
      }
      if (entity.plunger) {
        entity.plunger.enabled = visible;
      }
    }
  }, [visible]);

  // ---- useFrame: particle physics + chunk damp + progress-driven visuals ----
  useFrame((_, delta) => {
    if (!visible) return;

    // --- Read ECS state for switch notch visual ---
    const switchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-body');
    const isGrinderOn = switchEntity?.toggle?.isOn ?? false;

    // --- Progress-driven particle spawning ---
    const progress = challengeProgress / 100; // 0-1
    const progressDelta = progress - prevProgressRef.current;

    if (progressDelta > 0) {
      // Haptic feedback throttled to every 5% progress
      hapticAccumRef.current += progressDelta;
      if (hapticAccumRef.current >= 5) {
        hapticAccumRef.current = 0;
        fireHaptic('rotary_feedback');
      }
      // Spawn particles proportional to progress increase
      const pData = particleDataRef.current;
      const numToSpawn = Math.min(3, Math.ceil(progressDelta * 30));
      for (let i = 0; i < numToSpawn; i++) {
        const p = pData.find(d => !d.active);
        if (p) {
          p.active = true;
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.8;
          p.pos.set(r * Math.cos(ang), 2.5, 2.1);
          p.vel.set((Math.random() - 0.5) * 1, -2 - Math.random() * 2, 1 + Math.random() * 2);
          p.rot.set(0, 0, 0);
        }
      }
    }
    prevProgressRef.current = progress;

    // --- Switch notch visual animation ---
    const notchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-notch');
    if (notchEntity?.three) {
      const targetZ = isGrinderOn ? Math.PI / 4 : 0;
      notchEntity.three.rotation.z +=
        (targetZ - notchEntity.three.rotation.z) * Math.min(1, delta * 10);
    }

    // --- Chunk position damp (decorative) ---
    for (let i = 0; i < 15; i++) {
      const mesh = chunkRefs.current[i];
      if (!mesh) continue;
      const chunk = chunks[i];
      mesh.visible = true;
      damp3(mesh.position, chunk.targetPos.toArray(), 0.12, delta);
    }

    // --- Particle physics ---
    const pData = particleDataRef.current;
    const pMesh = particleMeshRef.current;
    const dummy = dummyRef.current;
    let needsUpdate = false;

    if (pMesh) {
      const groundY = 0.5 + progress * 1.5;
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

      {/* Meat chunks — decorative, no click interaction */}
      <group position={[-5, 0, 2]}>
        {chunks.map((chunk, i) => (
          <mesh
            key={chunk.id}
            ref={el => {
              chunkRefs.current[i] = el;
            }}
            position={chunk.targetPos.toArray()}
            castShadow
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
