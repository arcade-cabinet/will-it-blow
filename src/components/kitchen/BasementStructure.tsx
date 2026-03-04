/**
 * @module BasementStructure
 * Procedural atmospheric basement elements — ceiling pipes, barred window,
 * and floor drain — rendered as primitive Three.js geometry (no GLBs).
 * All positions use proportional fractions of room dimensions so they
 * scale correctly for any aspect ratio derived by computeRoom().
 *
 * The room is sealed — accessible only through the ceiling trap door
 * (rendered by TrapDoorMount). No doors.
 *
 * Elements:
 * - 3 ceiling pipe runs along Z-axis, one with a 90° elbow and a water drip
 * - Barred window high on the right wall (too small to escape through)
 * - Floor drain with grate cross-bars and dark hole beneath
 */

import {useFrame} from '@react-three/fiber';
import type React from 'react';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';

const bc = config.scene.basement;

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
  const pipeY = room.h - bc.pipes.yOffsetFromCeiling;
  const pipeLen = room.d * bc.pipes.lengthFraction;

  // Pipe X positions from config fractions of room width from left wall
  const pipeXPositions = bc.pipes.xFractions.map(f => -halfW + room.w * f);

  // Water drip animation: slowly grows, resets (drop falls) when full
  const dropRef = useRef<THREE.Mesh>(null);
  const dripState = useRef({scale: 0.01});

  useFrame((_, delta) => {
    const drop = dropRef.current;
    if (!drop) return;
    const dt = Math.min(delta, 0.1);
    const d = dripState.current;
    d.scale += dt * bc.pipes.dripGrowRate;
    if (d.scale >= 1.0) {
      d.scale = 0.01; // reset — drop falls and reforms
    }
    drop.scale.setScalar(d.scale);
  });

  // Elbow on pipe at configured index: short cylinder segment running along X-axis
  const elbowPipeX = pipeXPositions[bc.pipes.elbowPipeIndex];
  const elbowPipeZ = halfD * bc.pipes.elbowZFraction;
  const elbowLen = room.w * bc.pipes.elbowLengthFraction;

  return (
    <group>
      {/* Three main pipe runs — each group rotated to align cylinder along Z */}
      {pipeXPositions.map((px, i) => (
        <group key={`pipe_${i}`} position={[px, pipeY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[bc.pipes.radius, bc.pipes.radius, pipeLen, 8]} />
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
          <cylinderGeometry args={[bc.pipes.radius, bc.pipes.radius, elbowLen, 8]} />
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
  const winX = halfW - bc.window.xEdgeOffset;
  const winY = room.h * bc.window.yFraction;

  const frameW = bc.window.frameWidth;
  const frameH = bc.window.frameHeight;
  const barSpacing = frameW / (bc.window.barCount + 1);

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

      {/* Vertical bars spaced evenly across the window frame */}
      {Array.from(
        {length: bc.window.barCount},
        (_, i) => (i - (bc.window.barCount - 1) / 2) * barSpacing,
      ).map((bz, i) => (
        <mesh key={`bar_${i}`} position={[bz, 0, 0.06]}>
          <cylinderGeometry args={[bc.window.barRadius, bc.window.barRadius, frameH - 0.05, 6]} />
          <primitive object={darkMetal} attach="material" />
        </mesh>
      ))}
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
  // center-right: x and z from config fractions of room dimensions
  const drainX = room.w * bc.drain.xFraction;
  const drainZ = room.d * bc.drain.zFraction;
  const drainY = 0.01;

  return (
    <group position={[drainX, drainY, drainZ]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Dark hole beneath — sits slightly behind grate in render order */}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[bc.drain.innerRadius, 16]} />
        <meshStandardMaterial color="#000000" roughness={1.0} metalness={0.0} />
      </mesh>

      {/* Grate ring */}
      <mesh>
        <ringGeometry args={[bc.drain.innerRadius, bc.drain.outerRadius, 24]} />
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
// BoardedDoorway — sealed doorframe with crossed wooden planks on front wall
// ---------------------------------------------------------------------------

/**
 * A boarded-up doorway on the front wall (+Z side). Sells the horror
 * "sealed room" atmosphere — the player can see there WAS a door here
 * but it's been nailed shut with planks. Procedural geometry: metal
 * doorframe, dark recessed void, and angled wooden boards.
 */
function BoardedDoorway({
  room,
  darkMetal,
}: {
  room: BasementStructureProps['room'];
  darkMetal: THREE.MeshStandardMaterial;
}) {
  const halfD = room.d / 2;
  const dw = bc.doorway;
  const doorX = dw.xOffset;
  const doorZ = halfD - 0.01; // flush against front wall interior

  // Wood material for the planks — brownish, rough
  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4a3728'),
        roughness: 0.9,
        metalness: 0.05,
      }),
    [],
  );

  const halfW = dw.width / 2;
  const halfH = dw.height / 2;
  const ft = dw.frameThickness;

  // Plank angles — alternating diagonals for a crossed-boards look
  const plankAngles = useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < dw.plankCount; i++) {
      angles.push(i % 2 === 0 ? 0.25 : -0.2);
    }
    return angles;
  }, []);

  return (
    <group position={[doorX, 0, doorZ]} rotation={[0, Math.PI, 0]}>
      {/* Dark void behind the door — suggests a sealed passage */}
      <mesh position={[0, halfH, -0.03]}>
        <planeGeometry args={[dw.width - ft, dw.height - ft]} />
        <meshStandardMaterial color="#050505" roughness={1.0} metalness={0.0} />
      </mesh>

      {/* Doorframe — 4 metal bars forming a rectangle */}
      {/* Top bar */}
      <mesh position={[0, dw.height, 0]}>
        <boxGeometry args={[dw.width + ft, ft, ft]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>
      {/* Bottom bar (threshold) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[dw.width + ft, ft, ft]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>
      {/* Left jamb */}
      <mesh position={[-halfW, halfH, 0]}>
        <boxGeometry args={[ft, dw.height, ft]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>
      {/* Right jamb */}
      <mesh position={[halfW, halfH, 0]}>
        <boxGeometry args={[ft, dw.height, ft]} />
        <primitive object={darkMetal} attach="material" />
      </mesh>

      {/* Wooden planks nailed across — alternating angles */}
      {plankAngles.map((angle, i) => {
        const yFrac = (i + 0.5) / dw.plankCount;
        const plankY = dw.height * yFrac;
        return (
          <mesh key={`plank_${i}`} position={[0, plankY, 0.02]} rotation={[0, 0, angle]}>
            <boxGeometry args={[dw.width * 1.1, dw.plankWidth, dw.plankThickness]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
        );
      })}
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
 * Includes ceiling pipe runs, a barred window on the right wall, and a
 * floor drain. The room is sealed — only accessible through the ceiling
 * trap door (rendered separately by TrapDoorMount). All positions are
 * derived from room dimensions so they scale proportionally.
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

      {/* Floor drain — center-right of room */}
      <FloorDrain room={room} darkMetal={darkMetal} />

      {/* Boarded doorway — sealed exit on front wall */}
      <BoardedDoorway room={room} darkMetal={darkMetal} />
    </group>
  );
}
