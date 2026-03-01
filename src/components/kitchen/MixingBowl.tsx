import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {CuboidCollider, RigidBody} from '@react-three/rapier';
import {useCallback, useMemo, useRef} from 'react';
import {Platform} from 'react-native';
import type * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {getAssetUrl} from '../../engine/assetUrl';
import {useGameStore} from '../../store/gameStore';

interface MixingBowlProps {
  position: [number, number, number];
}

// GLB bowl is ~0.62 wide, 0.255 tall — scale to fit nicely in scene
const BOWL_SCALE = 0.65;
// Collider dimensions (post-scale, approximate)
const BOWL_RADIUS = 0.31 * BOWL_SCALE;
const BOWL_HEIGHT = 0.255 * BOWL_SCALE;
const MAX_FILL_HEIGHT = BOWL_HEIGHT * 0.6;

const isWeb = Platform.OS === 'web';
const bowlUrl = getAssetUrl('models', 'mixing_bowl.glb');

/**
 * MixingBowl — GLB bowl model where the player drops ingredients.
 * Tracks contents via GrabSystem receiver callback and updates the Zustand store.
 */
export const MixingBowl = ({position}: MixingBowlProps) => {
  const {scene} = useGLTF(bowlUrl);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const fillRef = useRef<THREE.Mesh>(null);
  const bowlContents = useGameStore(s => s.bowlContents);
  const blendColor = useGameStore(s => s.blendColor);
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
    fillRef.current.position.y = h / 2 + 0.01;
  });

  const handleReceive = useCallback(
    (objectType: string, objectId: string) => {
      if (objectType === 'ingredient') {
        addToBowl(objectId);
        audioEngine.playMix();
      }
    },
    [addToBowl],
  );

  const bowlMesh = (
    <group
      position={isWeb ? undefined : position}
      userData={{grabbable: true, objectType: 'bowl', objectId: 'mixing-bowl'}}
    >
      {/* GLB bowl model */}
      <primitive object={clonedScene} scale={BOWL_SCALE} />

      {/* Invisible receiver mesh at bowl opening for GrabSystem drop detection */}
      <mesh
        position={[0, BOWL_HEIGHT * 0.3, 0]}
        userData={{receiver: true, onReceive: handleReceive}}
      >
        <cylinderGeometry args={[BOWL_RADIUS * 0.85, BOWL_RADIUS * 0.85, 0.04, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Fill mass — colored cylinder that grows with contents */}
      {bowlContents.length > 0 && (
        <mesh ref={fillRef} position={[0, 0.01, 0]}>
          <cylinderGeometry args={[BOWL_RADIUS * 0.75, BOWL_RADIUS * 0.55, MAX_FILL_HEIGHT, 16]} />
          <meshStandardMaterial color={blendColor} roughness={0.7} metalness={0.1} />
        </mesh>
      )}
    </group>
  );

  if (!isWeb) return bowlMesh;

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      {/* Bottom collider */}
      <CuboidCollider args={[BOWL_RADIUS * 0.7, 0.01, BOWL_RADIUS * 0.7]} position={[0, 0, 0]} />

      {/* Rim colliders — 4 walls around the opening */}
      <CuboidCollider
        args={[BOWL_RADIUS, BOWL_HEIGHT / 2, 0.01]}
        position={[0, BOWL_HEIGHT / 4, BOWL_RADIUS]}
      />
      <CuboidCollider
        args={[BOWL_RADIUS, BOWL_HEIGHT / 2, 0.01]}
        position={[0, BOWL_HEIGHT / 4, -BOWL_RADIUS]}
      />
      <CuboidCollider
        args={[0.01, BOWL_HEIGHT / 2, BOWL_RADIUS]}
        position={[BOWL_RADIUS, BOWL_HEIGHT / 4, 0]}
      />
      <CuboidCollider
        args={[0.01, BOWL_HEIGHT / 2, BOWL_RADIUS]}
        position={[-BOWL_RADIUS, BOWL_HEIGHT / 4, 0]}
      />

      {bowlMesh}
    </RigidBody>
  );
};
