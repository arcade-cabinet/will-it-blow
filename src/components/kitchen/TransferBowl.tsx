/**
 * @module TransferBowl
 * Always-rendered procedural mixing bowl that visually travels between stations
 * as the player progresses through the sausage-making pipeline.
 *
 * Reads bowlPosition and blendColor directly from the Zustand store.
 * Uses damp3 from maath/easing for smooth position interpolation each frame.
 *
 * Bowl positions are derived from resolveTargets (FurnitureLayout), offset
 * slightly so the procedural bowl sits at the correct place relative to each
 * station's machinery.
 */

import {useFrame} from '@react-three/fiber';
import {damp3} from 'maath/easing';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {DEFAULT_ROOM, resolveTargets} from '../../engine/FurnitureLayout';
import type {BowlPosition} from '../../store/gameStore';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Bowl lathe profile — exact from POC L153 (same as GrinderMechanics)
// ---------------------------------------------------------------------------

const BOWL_POINTS = [
  new THREE.Vector2(0.01, 0),
  new THREE.Vector2(3, 0),
  new THREE.Vector2(3.5, 1.5),
  new THREE.Vector2(3.3, 1.6),
  new THREE.Vector2(2.8, 0.2),
  new THREE.Vector2(0.01, 0.2),
];

// ---------------------------------------------------------------------------
// Station positions for the bowl (derived from FurnitureLayout targets)
// ---------------------------------------------------------------------------

const TARGETS = resolveTargets(DEFAULT_ROOM);

const BOWL_POSITIONS: Partial<Record<BowlPosition, [number, number, number]>> = {
  fridge: TARGETS['mixing-bowl'].position,
  grinder: [
    TARGETS.grinder.position[0],
    TARGETS.grinder.position[1],
    TARGETS.grinder.position[2] + 1.5,
  ],
  'grinder-output': TARGETS['grinder-output'].position,
  stuffer: [
    TARGETS.stuffer.position[0],
    TARGETS.stuffer.position[1] - 0.3,
    TARGETS.stuffer.position[2] + 0.5,
  ],
};

// Off-screen position for 'done' / 'carried' states
const HIDDEN_POS: [number, number, number] = [0, -50, 0];

// ---------------------------------------------------------------------------
// TransferBowl
// ---------------------------------------------------------------------------

export const TransferBowl = () => {
  const bowlPosition = useGameStore(s => s.bowlPosition);
  const blendColor = useGameStore(s => s.blendColor);

  const groupRef = useRef<THREE.Group>(null);
  const meatMoundRef = useRef<THREE.Mesh>(null);

  // Geometry (created once)
  const bowlGeo = useMemo(() => new THREE.LatheGeometry(BOWL_POINTS, 32), []);

  // Materials
  const bowlMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
      }),
    [],
  );
  // Memoised meat mound color
  const meatColor = useMemo(() => new THREE.Color(blendColor), [blendColor]);

  // Whether grinding has happened (meat mound should show)
  const hasGround = blendColor !== '#808080' && blendColor !== '#888888';

  // Determine visibility — hide for 'done' and 'carried'
  const isVisible = bowlPosition !== 'done' && bowlPosition !== 'carried';

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetPos = BOWL_POSITIONS[bowlPosition] ?? HIDDEN_POS;
    damp3(groupRef.current.position, targetPos, 0.1, delta);

    // Scale meat mound based on grind state
    if (meatMoundRef.current) {
      const targetScale = hasGround ? 1.0 : 0.001;
      const s = meatMoundRef.current.scale.x;
      const newScale = s + (targetScale - s) * Math.min(1, delta * 5);
      meatMoundRef.current.scale.setScalar(newScale);
    }
  });

  // Start at the correct position immediately
  const initialPos = BOWL_POSITIONS[bowlPosition] ?? HIDDEN_POS;

  return (
    <group ref={groupRef} position={initialPos} visible={isVisible}>
      <mesh castShadow>
        <primitive object={bowlGeo} attach="geometry" />
        <primitive object={bowlMat} attach="material" />
      </mesh>

      {/* Meat mound inside bowl — hemisphere, colored by blendColor */}
      <mesh ref={meatMoundRef} position={[0, 0.2, 0]} scale={[0.001, 0.001, 0.001]}>
        <sphereGeometry args={[2.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={meatColor} roughness={0.6} />
      </mesh>
    </group>
  );
};
