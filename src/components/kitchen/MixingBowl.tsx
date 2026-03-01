import {useFrame} from '@react-three/fiber';
import {CuboidCollider, RigidBody} from '@react-three/rapier';
import {useCallback, useMemo, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';

interface MixingBowlProps {
  position: [number, number, number];
}

const BOWL_RADIUS = 0.2;
const BOWL_HEIGHT = 0.2;
const WALL_THICKNESS = 0.012;
const MAX_FILL_HEIGHT = 0.15;

const isWeb = Platform.OS === 'web';

/**
 * MixingBowl — a metal hemisphere where the player drops ingredients.
 * Tracks contents via a sensor collider and updates the Zustand store.
 */
export const MixingBowl = ({position}: MixingBowlProps) => {
  const fillRef = useRef<THREE.Mesh>(null);
  const bowlContents = useGameStore(s => s.bowlContents);
  const addToBowl = useGameStore(s => s.addToBowl);

  const fillHeight = useMemo(
    () => Math.min(bowlContents.length * 0.025, MAX_FILL_HEIGHT),
    [bowlContents.length],
  );

  // Animate fill level smoothly
  const currentFillRef = useRef(0);
  useFrame((_state, delta) => {
    if (!fillRef.current) return;
    const target = fillHeight;
    currentFillRef.current += (target - currentFillRef.current) * Math.min(delta * 5, 1);
    const h = currentFillRef.current;
    fillRef.current.scale.y = h > 0.001 ? h / MAX_FILL_HEIGHT : 0;
    fillRef.current.position.y = -BOWL_HEIGHT / 2 + WALL_THICKNESS + h / 2;
  });

  const handleSensorEnter = useCallback(
    (payload: any) => {
      const other = payload.rigidBody ?? payload.other?.rigidBody;
      if (!other) return;
      // Read objectId from the colliding body's userData (set by ingredient meshes)
      const userData = other.userData as {objectId?: string; objectType?: string} | undefined;
      if (userData?.objectType === 'ingredient' && userData.objectId) {
        addToBowl(userData.objectId);
      }
    },
    [addToBowl],
  );

  const bowlMesh = (
    <group
      position={isWeb ? undefined : position}
      userData={{grabbable: true, objectType: 'bowl', objectId: 'mixing-bowl'}}
    >
      {/* Bowl shell — hemisphere approximated via lathe */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[BOWL_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#666"
          metalness={0.8}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rim ring — thin torus at the top edge */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[BOWL_RADIUS - WALL_THICKNESS / 2, WALL_THICKNESS, 8, 24]} />
        <meshStandardMaterial color="#777" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Fill mass — colored cylinder that grows with contents */}
      {bowlContents.length > 0 && (
        <mesh ref={fillRef} position={[0, -BOWL_HEIGHT / 2 + WALL_THICKNESS, 0]}>
          <cylinderGeometry args={[BOWL_RADIUS * 0.8, BOWL_RADIUS * 0.6, MAX_FILL_HEIGHT, 16]} />
          <meshStandardMaterial color="#8B4513" roughness={0.7} metalness={0.1} />
        </mesh>
      )}
    </group>
  );

  if (!isWeb) return bowlMesh;

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      {/* Bottom collider — flat disc at base of bowl */}
      <CuboidCollider
        args={[BOWL_RADIUS * 0.7, WALL_THICKNESS / 2, BOWL_RADIUS * 0.7]}
        position={[0, -BOWL_HEIGHT / 2, 0]}
      />

      {/* Rim colliders — 4 walls around the opening */}
      <CuboidCollider
        args={[BOWL_RADIUS, BOWL_HEIGHT / 2, WALL_THICKNESS]}
        position={[0, -BOWL_HEIGHT / 4, BOWL_RADIUS]}
      />
      <CuboidCollider
        args={[BOWL_RADIUS, BOWL_HEIGHT / 2, WALL_THICKNESS]}
        position={[0, -BOWL_HEIGHT / 4, -BOWL_RADIUS]}
      />
      <CuboidCollider
        args={[WALL_THICKNESS, BOWL_HEIGHT / 2, BOWL_RADIUS]}
        position={[BOWL_RADIUS, -BOWL_HEIGHT / 4, 0]}
      />
      <CuboidCollider
        args={[WALL_THICKNESS, BOWL_HEIGHT / 2, BOWL_RADIUS]}
        position={[-BOWL_RADIUS, -BOWL_HEIGHT / 4, 0]}
      />

      {/* Interior sensor — detects ingredient drops */}
      <CuboidCollider
        args={[BOWL_RADIUS * 0.6, BOWL_HEIGHT * 0.4, BOWL_RADIUS * 0.6]}
        position={[0, -BOWL_HEIGHT / 4, 0]}
        sensor
        onIntersectionEnter={handleSensorEnter}
      />

      {bowlMesh}
    </RigidBody>
  );
};
