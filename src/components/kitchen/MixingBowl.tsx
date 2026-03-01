import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useCallback, useMemo, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {getAssetUrl} from '../../engine/assetUrl';
import {useGameStore} from '../../store/gameStore';

interface MixingBowlProps {
  position: [number, number, number];
  receivingIngredients?: boolean;
}

const BOWL_SCALE = 0.65;
const BOWL_RADIUS = 0.31 * BOWL_SCALE;
const BOWL_HEIGHT = 0.255 * BOWL_SCALE;
const MAX_FILL_HEIGHT = BOWL_HEIGHT * 0.6;

const bowlUrl = getAssetUrl('models', 'mixing_bowl.glb');

/**
 * MixingBowl — GLB bowl with optional receiver for ingredient drops
 * and a fill cylinder that grows/colors with contents.
 */
export const MixingBowl = ({position, receivingIngredients = true}: MixingBowlProps) => {
  const {scene} = useGLTF(bowlUrl);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const fillRef = useRef<THREE.Mesh>(null);
  const bowlContents = useGameStore(s => s.bowlContents);
  const blendColor = useGameStore(s => s.blendColor);
  const blendRoughness = useGameStore(s => s.blendRoughness);
  const blendChunkiness = useGameStore(s => s.blendChunkiness);
  const addToBowl = useGameStore(s => s.addToBowl);

  const fillHeight = useMemo(
    () => Math.min(bowlContents.length * 0.025, MAX_FILL_HEIGHT),
    [bowlContents.length],
  );

  const currentFillRef = useRef(0);
  useFrame((_state, delta) => {
    if (!fillRef.current) return;
    currentFillRef.current += (fillHeight - currentFillRef.current) * Math.min(delta * 5, 1);
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

  return (
    <group
      position={position}
      userData={{grabbable: true, objectType: 'bowl', objectId: 'mixing-bowl'}}
    >
      <primitive object={clonedScene} scale={BOWL_SCALE} />

      {receivingIngredients && (
        <mesh
          position={[0, BOWL_HEIGHT * 0.3, 0]}
          userData={{receiver: true, onReceive: handleReceive}}
        >
          <cylinderGeometry args={[BOWL_RADIUS * 0.85, BOWL_RADIUS * 0.85, 0.04, 16]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {bowlContents.length > 0 && (
        <mesh ref={fillRef} position={[0, 0.01, 0]}>
          <cylinderGeometry args={[BOWL_RADIUS * 0.75, BOWL_RADIUS * 0.55, MAX_FILL_HEIGHT, 16]} />
          <meshStandardMaterial
            color={blendColor}
            roughness={blendRoughness}
            metalness={0.1}
            emissiveIntensity={blendChunkiness * 0.15}
          />
        </mesh>
      )}
    </group>
  );
};
