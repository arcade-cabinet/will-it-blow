/**
 * @module GrinderMechanics
 * Procedural grinder station mechanics ported from sausage_factory.html POC.
 *
 * Renders the full grinder geometry — motor block, extruder cylinder, chute/hopper,
 * tray, faceplate, side switch, draggable plunger, mixing bowl with meat chunks,
 * a meat mound that grows as grinding progresses, and instanced ground-meat particles.
 *
 * Interaction flow (mirrors POC game phases):
 *  - 'fill'  — Click meat chunks to move them BOWL→TRAY→CHUTE (15 chunks, 3 states)
 *  - 'grind' — Toggle the switch ON, then drag the plunger down to generate groundVol
 *  - 'done'  — Fires onGrindComplete(groundVolume) and resets plunger
 *
 * Geometry offsets are relative to the parent <group position={position}>, matching
 * the POC's (gX, cY) coordinate system mapped to local space.
 *
 * Ported from sausage_factory.html:
 *  - Lines 132-172: Geometry construction
 *  - Lines 330-365: Click interaction (chunk state machine, switch, plunger drag start)
 *  - Lines 410-438: Plunger drag movement + particle spawning
 *  - Lines 492-511: Render loop (vibration, faceplate spin, particle physics)
 */

import {useFrame} from '@react-three/fiber';
import {damp3} from 'maath/easing';
import {useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {INGREDIENTS} from '../../engine/Ingredients';
import {createMeatMaterial} from '../../engine/MeatTexture';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrinderMechanicsProps {
  /** World position of the grinder station (from resolveTargets). */
  position: [number, number, number];
  /** Y coordinate of the counter surface top. */
  counterY: number;
  /** Render nothing when false (far from grinder station). */
  visible: boolean;
  /** Called once when grinding is finished, with the final groundVolume value. */
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
// Constants (deterministic layout — no random at module level)
// ---------------------------------------------------------------------------

const MAX_G_PARTS = 150;

/** Pre-seeded chunk positions in the mixing bowl (relative to bowl centre). */
const CHUNK_BOWL_OFFSETS = Array.from({length: 15}, (_, i) => {
  // Deterministic spiral so tests are stable
  const angle = (i / 15) * Math.PI * 6;
  const r = 0.3 + (i % 5) * 0.45;
  return {
    x: Math.cos(angle) * r,
    yExtra: (i % 3) * 0.4,
    z: Math.sin(angle) * r,
  };
});

// ---------------------------------------------------------------------------
// Geometry factories (created once per mount via useMemo)
// ---------------------------------------------------------------------------

function makeParticleGeo() {
  return new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6).rotateX(Math.PI / 2);
}

// ---------------------------------------------------------------------------
// GrinderMechanics
// ---------------------------------------------------------------------------

/**
 * Full procedural grinder station with interactive chunk pipeline, switch, plunger,
 * mixing bowl, and instanced meat particles.
 */
export const GrinderMechanics = ({
  position,
  counterY,
  visible,
  onGrindComplete,
}: GrinderMechanicsProps) => {
  // ---- local phase state ----
  const [gamePhase, setGamePhase] = useState<'fill' | 'grind' | 'done'>('fill');
  const [isGrinderOn, setIsGrinderOn] = useState(false);

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
  const isGrinderOnRef = useRef(false);
  const gamePhasRef = useRef<'fill' | 'grind' | 'done'>('fill');
  const isDraggingPlungerRef = useRef(false);
  const plungerPointerIdRef = useRef<number | null>(null);

  // Keep refs in sync with state
  isGrinderOnRef.current = isGrinderOn;
  gamePhasRef.current = gamePhase;

  // ---- mesh refs ----
  const motorRef = useRef<THREE.Mesh>(null);
  const extruderRef = useRef<THREE.Mesh>(null);
  const chuteRef = useRef<THREE.Mesh>(null);
  const faceplateRef = useRef<THREE.Mesh>(null);
  const switchNotchRef = useRef<THREE.Mesh>(null);
  const plungerGroupRef = useRef<THREE.Group>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  // Per-chunk mesh refs (for damp3 animation)
  const chunkRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: 15}, () => null));

  // Particle data array (mutable, not state — updated every frame)
  const particleDataRef = useRef<ParticleData[]>(
    Array.from({length: MAX_G_PARTS}, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
    })),
  );

  // Scratch Object3D for instanced matrix updates
  const dummyRef = useRef(new THREE.Object3D());

  // ---- materials ----
  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        roughness: 0.3,
        metalness: 0.9,
      }),
    [],
  );

  const darkMetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.7,
        metalness: 0.8,
      }),
    [],
  );

  const plasticMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.0,
      }),
    [],
  );

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

  // ---- geometry (memoised to avoid recreation) ----
  const chunkGeo = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), []);
  const particleGeo = useMemo(() => makeParticleGeo(), []);

  // cY shorthand for use in JSX positions — counterY is accessed via closure
  const cY = counterY;

  // ---- plunger drag ----
  const handlePlungerPointerDown = (e: THREE.Event) => {
    const pe = e as unknown as PointerEvent & {pointerId: number};
    if (gamePhasRef.current !== 'grind') return;
    isDraggingPlungerRef.current = true;
    plungerPointerIdRef.current = pe.pointerId ?? null;
    // Move plunger to chute X/Z immediately (snap like POC)
    if (plungerGroupRef.current) {
      plungerGroupRef.current.position.x = 3;
      plungerGroupRef.current.position.z = 0.5;
    }
  };

  // ---- chunk click handler ----
  const handleChunkClick = (chunkId: number) => {
    if (gamePhasRef.current !== 'fill') return;

    setChunks(prev => {
      const next = prev.map(c => {
        if (c.id !== chunkId) return c;
        if (c.state === 'BOWL') {
          // BOWL → TRAY: move to tray
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
          // TRAY → CHUTE
          meatInChuteRef.current += 1;
          return {
            ...c,
            state: 'CHUTE' as ChunkState,
            targetPos: new THREE.Vector3(0, cY + 4.5, 0.5),
          };
        }
        return c;
      });

      // Check if all chunks are in CHUTE → advance to grind phase
      const allInChute = next.every(c => c.state === 'CHUTE' || c.state === 'BOWL');
      const justFinishedTray =
        next.every(c => c.state !== 'TRAY') && prev.some(c => c.state === 'TRAY');
      if (justFinishedTray && allInChute) {
        setGamePhase('grind');
      }

      return next;
    });
  };

  // ---- switch click ----
  const handleSwitchClick = () => {
    if (gamePhasRef.current !== 'grind') return;
    setIsGrinderOn(prev => !prev);
  };

  // ---- useFrame: vibration, faceplate spin, particle physics, chunk damp ----
  useFrame((state, delta) => {
    if (!visible) return;

    const time = state.clock.getElapsedTime();
    const phase = gamePhasRef.current;
    const on = isGrinderOnRef.current;

    // --- Grinder vibration (POC L497) ---
    if (phase === 'grind' && on) {
      const v = Math.sin(time * 50) * 0.02;
      if (motorRef.current) motorRef.current.position.x = v;
      if (chuteRef.current) chuteRef.current.position.x = v;
      if (extruderRef.current) extruderRef.current.position.x = v;
      // Faceplate rotation (POC L497: delta*5)
      if (faceplateRef.current) faceplateRef.current.rotation.y += delta * 5;
    } else if (phase === 'grind') {
      if (motorRef.current) motorRef.current.position.x = 0;
      if (chuteRef.current) chuteRef.current.position.x = 0;
      if (extruderRef.current) extruderRef.current.position.x = 0;
    }

    // --- Switch notch rotation animation ---
    if (switchNotchRef.current) {
      const targetZ = on ? Math.PI / 4 : 0;
      switchNotchRef.current.rotation.z +=
        (targetZ - switchNotchRef.current.rotation.z) * Math.min(1, delta * 10);
    }

    // --- Plunger Y clamped during drag (pointer events on canvas handle XY) ---
    // The drag target Y is tracked by a pointer-move listener on the canvas.
    // We expose a method via userData so the canvas onPointerMove can update it.
    // (Pointer events on the plunger hitbox only fire on pointer-down.)

    // --- Chunk position damp (replaces anime.js) ---
    for (let i = 0; i < 15; i++) {
      const mesh = chunkRefs.current[i];
      if (!mesh) continue;
      // Hide chunks that reached CHUTE
      const chunk = chunks[i];
      if (chunk.state === 'CHUTE') {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      damp3(mesh.position, chunk.targetPos.toArray(), 0.12, delta);
    }

    // --- Particle physics (POC L501-511) ---
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

  // ---- Canvas-level pointer move for plunger drag ----
  // We attach this to the group's onPointerMove to track vertical drag.
  const handleGroupPointerMove = (e: THREE.Event) => {
    if (!isDraggingPlungerRef.current) return;
    const pg = plungerGroupRef.current;
    if (!pg) return;

    const pe = e as unknown as {point: THREE.Vector3};
    // Clamp plunger Y between cY+3 and cY+7 (POC L416)
    const tY = Math.max(cY + 3, Math.min(cY + 7, pe.point.y - 2.5));

    if (isGrinderOnRef.current && meatInChuteRef.current > 0 && tY < pg.position.y) {
      const push = pg.position.y - tY;
      groundVolRef.current += push * 0.015;
      if (Math.random() < push * 0.5)
        meatInChuteRef.current = Math.max(0, meatInChuteRef.current - 1);

      // Spawn particles (POC L423-428)
      const pData = particleDataRef.current;
      for (let i = 0; i < 3; i++) {
        const p = pData.find(d => !d.active);
        if (p) {
          p.active = true;
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.8;
          // Particles emit from faceplate position (0, cY+2.5, 2.0) in group space
          p.pos.set(r * Math.cos(ang), cY + 2.5, 2.1);
          p.vel.set((Math.random() - 0.5) * 1, -2 - Math.random() * 2, 1 + Math.random() * 2);
          p.rot.set(0, 0, 0);
        }
      }

      // Grind complete when groundVol >= 0.25 (POC L430)
      if (groundVolRef.current >= 0.25) {
        isDraggingPlungerRef.current = false;
        meatInChuteRef.current = 0;
        setGamePhase('done');
        gamePhasRef.current = 'done';
        // Spring plunger back up
        if (pg) pg.position.y = cY + 7;
        onGrindComplete?.(groundVolRef.current);
      }
    }

    // Prevent plunger descending below cY+5.5 when grinder is off (POC L436)
    if (!isGrinderOnRef.current && meatInChuteRef.current > 0 && tY < cY + 5.5) {
      pg.position.y = cY + 5.5;
    } else {
      pg.position.y = tY;
    }
  };

  const handleGroupPointerUp = () => {
    isDraggingPlungerRef.current = false;
    plungerPointerIdRef.current = null;
  };

  if (!visible) return null;

  return (
    <group
      position={position}
      onPointerMove={handleGroupPointerMove}
      onPointerUp={handleGroupPointerUp}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Motor block — BoxGeometry(4, 4.5, 5), offset (0, cY+2.25, -2)       */}
      {/* ------------------------------------------------------------------ */}
      <mesh ref={motorRef} position={[0, cY + 2.25, -2]} castShadow>
        <boxGeometry args={[4, 4.5, 5]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Extruder — CylinderGeometry(1.0, 1.0, 4, 32) rotX(PI/2)            */}
      {/* ------------------------------------------------------------------ */}
      <mesh ref={extruderRef} position={[0, cY + 2.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 4, 32]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Chute/hopper — CylinderGeometry(1.2, 0.8, 2.5, 32)                 */}
      {/* ------------------------------------------------------------------ */}
      <mesh ref={chuteRef} position={[0, cY + 4.5, 0.5]} castShadow>
        <cylinderGeometry args={[1.2, 0.8, 2.5, 32]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Tray — BoxGeometry(5, 0.3, 4), offset (0, cY+5.6, 0.5)             */}
      {/* ------------------------------------------------------------------ */}
      <mesh position={[0, cY + 5.6, 0.5]} castShadow>
        <boxGeometry args={[5, 0.3, 4]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Faceplate — CylinderGeometry(1.05, 1.05, 0.2, 32) rotX(PI/2)       */}
      {/* darkMetal; rotates on Y when grinder is on                          */}
      {/* ------------------------------------------------------------------ */}
      <mesh ref={faceplateRef} position={[0, cY + 2.5, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.2, 32]} />
        <primitive object={darkMetalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Switch — CylinderGeometry(0.6, 0.6, 0.5, 16) rotZ(PI/2)            */}
      {/* ------------------------------------------------------------------ */}
      <mesh position={[2.1, cY + 3, -2]} rotation={[0, 0, Math.PI / 2]} onClick={handleSwitchClick}>
        <cylinderGeometry args={[0.6, 0.6, 0.5, 16]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* Switch notch — BoxGeometry(0.1, 1.0, 0.1), rotates 45° when on */}
      <mesh ref={switchNotchRef} position={[2.35, cY + 3, -2]}>
        <boxGeometry args={[0.1, 1.0, 0.1]} />
        <primitive object={darkMetalMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------------ */}
      {/* Plunger group — draggable vertically                                */}
      {/* shaft + guard + handle, initial Y = cY + 5.6                       */}
      {/* ------------------------------------------------------------------ */}
      <group ref={plungerGroupRef} position={[3, cY + 5.6, 0.5]}>
        {/* Shaft */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 3]} />
          <primitive object={plasticMat} attach="material" />
        </mesh>
        {/* Guard */}
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.2]} />
          <primitive object={plasticMat} attach="material" />
        </mesh>
        {/* Handle */}
        <mesh position={[0, 3.8, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.5]} />
          <primitive object={plasticMat} attach="material" />
        </mesh>
        {/* Invisible hitbox for drag start */}
        <mesh position={[0, 2.5, 0]} onPointerDown={handlePlungerPointerDown}>
          <cylinderGeometry args={[1.5, 1.5, 5]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>

      {/* Meat chunks — float independently (bowl rendering moved to TransferBowl) */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Ground meat particles — InstancedMesh(CylGeo(0.08,0.08,0.5,6), 150) */}
      {/* ------------------------------------------------------------------ */}
      <instancedMesh ref={particleMeshRef} args={[particleGeo, meatMat, MAX_G_PARTS]}>
        <primitive object={particleGeo} attach="geometry" />
        <primitive object={meatMat} attach="material" />
      </instancedMesh>
    </group>
  );
};
