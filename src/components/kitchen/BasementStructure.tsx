/**
 * @module BasementStructure
 * Procedural atmospheric basement elements — ceiling pipes, barred window,
 * locked door, and floor drain — rendered as primitive Three.js geometry
 * (no GLBs). All positions use proportional fractions of room dimensions
 * so they scale correctly for any aspect ratio derived by computeRoom().
 *
 * Elements:
 * - 3 ceiling pipe runs along Z-axis, one with a 90° elbow and a water drip
 * - Barred window high on the right wall (too small to escape through)
 * - Locked door on the front wall, right side, with red deadbolt
 * - Floor drain with grate cross-bars and dark hole beneath
 */

import {useFrame} from '@react-three/fiber';
import type React from 'react';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BasementStructureProps {
  room: {w: number; d: number; h: number};
}

// ---------------------------------------------------------------------------
// CeilingPipes — three horizontal pipe runs along Z, one with elbow + drip
// ---------------------------------------------------------------------------

/**
 * Three horizontal pipe runs along the Z-axis at ceiling height.
 * Pipe 0 (leftmost) has a 90° elbow turning toward the right wall.
 * The elbow pipe has a drip point: a small sphere on its underside
 * with a slow-growing water drop that resets when fully grown (drop falls).
 */
function CeilingPipes({
  room,
  darkMetal,
}: {
  room: BasementStructureProps['room'];
  darkMetal: THREE.MeshStandardMaterial;
}) {
  const halfW = room.w / 2;
  const halfD = room.d / 2;
  const pipeY = room.h - 0.3;
  const pipeLen = room.d * 0.85;

  // Pipe X positions at ~20%, ~50%, ~80% of room width from left wall
  const pipeXPositions = [
    -halfW + room.w * 0.2,
    -halfW + room.w * 0.5,
    -halfW + room.w * 0.8,
  ] as const;

  // Water drip animation: slowly grows, resets (drop falls) when full
  const dropRef = useRef<THREE.Mesh>(null);
  const dripState = useRef({scale: 0.01});

  useFrame((_, delta) => {
    const drop = dropRef.current;
    if (!drop) return;
    const dt = Math.min(delta, 0.1);
    const d = dripState.current;
    d.scale += dt * 0.07;
    if (d.scale >= 1.0) {
      d.scale = 0.01; // reset — drop falls and reforms
    }
    drop.scale.setScalar(d.scale);
  });

  // Elbow on pipe 0: short cylinder segment running along X-axis
  const elbowPipeX = pipeXPositions[0];
  const elbowPipeZ = halfD * 0.25;
  const elbowLen = room.w * 0.15;

  return (
    <group>
      {/* Three main pipe runs — each group rotated to align cylinder along Z */}
      {pipeXPositions.map((px, i) => (
        <group key={`pipe_${i}`} position={[px, pipeY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, pipeLen, 8]} />
            <primitive object={darkMetal} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Elbow: short cylinder along X-axis (rotated 90° around Z) */}
      <group
        position={[elbowPipeX + elbowLen / 2, pipeY, elbowPipeZ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, elbowLen, 8]} />
          <primitive object={darkMetal} attach="material" />
        </mesh>
      </group>

      {/* Drip sphere on underside of elbow */}
      <mesh position={[elbowPipeX + elbowLen / 2, pipeY - 0.1, elbowPipeZ]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>

      {/* Slow-growing water drop below drip sphere */}
      <mesh
        ref={dropRef}
        position={[elbowPipeX + elbowLen / 2, pipeY - 0.16, elbowPipeZ]}
        scale={0.01}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color="#3a6b8a"
          roughness={0.05}
          metalness={0.0}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// BarredWindow — small high window on right wall with 3 vertical bars
// ---------------------------------------------------------------------------

/**
 * A small barred window high on the right wall (+X side).
 * Consists of a dark frame, a dim blue-emissive glass pane suggesting
 * moonlight, and 3 vertical bars — too small and too high to escape through.
 */
function BarredWindow({
  room,
  darkMetal,
}: {
  room: BasementStructureProps['room'];
  darkMetal: THREE.MeshStandardMaterial;
}) {
  const halfW = room.w / 2;
  const winX = halfW - 0.01;
  const winY = room.h * 0.7;

  const frameW = 1.5;
  const frameH = 1.0;
  const barSpacing = frameW / 4; // 3 bars spaced evenly across frame

  return (
    <group position={[winX, winY, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Frame — dark metal box around the window opening */}
      <mesh>
        <boxGeometry args={[frameW, frameH, 0.1]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>

      {/* Glass pane — slightly recessed, dim blue emissive for moonlight */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[frameW - 0.15, frameH - 0.12]} />
        <meshStandardMaterial
          color="#0d0d1a"
          emissive={new THREE.Color('#1a1a2e')}
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.0}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* 3 vertical bars spaced evenly across the window frame */}
      {[-barSpacing, 0, barSpacing].map((bz, i) => (
        <mesh key={`bar_${i}`} position={[bz, 0, 0.06]}>
          <cylinderGeometry args={[0.03, 0.03, frameH - 0.05, 6]} />
          <primitive object={darkMetal} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// LockedDoor — closed, locked door on front wall, right side
// ---------------------------------------------------------------------------

/**
 * A closed, locked metal door on the front wall (+Z side), right area.
 * Non-interactive — pure atmosphere. Includes a red deadbolt on the left edge.
 * The bear-trap GLB is placed nearby (front-right corner) in FurnitureLayout.
 */
function LockedDoor({room}: {room: BasementStructureProps['room']}) {
  const halfW = room.w / 2;
  const halfD = room.d / 2;

  const doorX = halfW * 0.6;
  const doorZ = halfD - 0.01;
  const doorW = 1.2;
  const doorH = 2.2;
  const doorY = doorH / 2; // bottom of door flush with floor

  return (
    <group position={[doorX, doorY, doorZ]} rotation={[0, Math.PI, 0]}>
      {/* Door frame — dark metal outer shell */}
      <mesh>
        <boxGeometry args={[doorW, doorH, 0.08]} />
        <meshStandardMaterial color="#333333" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Door surface — slightly recessed panel, darker */}
      <mesh position={[0, 0, -0.035]}>
        <boxGeometry args={[doorW - 0.08, doorH - 0.08, 0.04]} />
        <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.6} />
      </mesh>

      {/* Deadbolt on left edge — blood red, locked shut */}
      <mesh position={[-(doorW / 2) + 0.08, 0.1, -0.02]}>
        <boxGeometry args={[0.15, 0.05, 0.08]} />
        <meshStandardMaterial
          color="#8B0000"
          roughness={0.5}
          metalness={0.3}
          emissive={new THREE.Color('#3a0000')}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// FloorDrain — circular grate with cross-bars and dark hole beneath
// ---------------------------------------------------------------------------

/**
 * A floor drain slightly right of center. Has a RingGeometry grate,
 * 4 cross-bar strips (2 directions), and a black circle beneath
 * suggesting a dark hole into the drain.
 */
function FloorDrain({
  room,
  darkMetal,
}: {
  room: BasementStructureProps['room'];
  darkMetal: THREE.MeshStandardMaterial;
}) {
  // center-right: x = room.w * 0.15 from center, z = room.d * 0.1 from center
  const drainX = room.w * 0.15;
  const drainZ = room.d * 0.1;
  const drainY = 0.01;

  return (
    <group position={[drainX, drainY, drainZ]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Dark hole beneath — sits slightly behind grate in render order */}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#000000" roughness={1.0} metalness={0.0} />
      </mesh>

      {/* Grate ring */}
      <mesh>
        <ringGeometry args={[0.15, 0.3, 24]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>

      {/* 4 cross-bars: 2 directions (0° and 90°) */}
      {[0, Math.PI / 2].map((rot, i) => (
        <mesh key={`bar_${i}`} rotation={[0, 0, rot]}>
          <boxGeometry args={[0.6, 0.025, 0.015]} />
          <primitive object={darkMetal} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// BasementStructure — top-level export
// ---------------------------------------------------------------------------

/**
 * Atmospheric basement elements rendered as procedural geometry (no GLBs).
 * Renders inside the `<group>` in GameWorld's SceneContent.
 *
 * Includes ceiling pipe runs, a barred window on the right wall, a locked
 * door on the front wall, and a floor drain. All positions are derived from
 * the room dimensions so they scale proportionally with viewport aspect ratio.
 */
export function BasementStructure({room}: BasementStructureProps): React.ReactElement {
  // Shared dark metal material — created once, reused across all elements
  const darkMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#444444'),
        roughness: 0.7,
        metalness: 0.8,
      }),
    [],
  );

  return (
    <group>
      {/* Ceiling pipe runs along Z — pipe 0 has a 90° elbow and water drip */}
      <CeilingPipes room={room} darkMetal={darkMetal} />

      {/* Barred window — high on right wall, dim moonlight glow */}
      <BarredWindow room={room} darkMetal={darkMetal} />

      {/* Locked door — front wall right side, near bear-trap */}
      <LockedDoor room={room} />

      {/* Floor drain — center-right of room */}
      <FloorDrain room={room} darkMetal={darkMetal} />
    </group>
  );
}
