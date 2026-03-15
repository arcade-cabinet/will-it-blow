import {Box, Cylinder, useGLTF} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {asset} from '../../utils/assetPath';

interface PropProps {
  name: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  type?: 'fixed' | 'dynamic';
}

export function Prop({
  name,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  type = 'fixed',
}: PropProps) {
  // Convert uniform scale to vector
  const s = typeof scale === 'number' ? ([scale, scale, scale] as [number, number, number]) : scale;

  const chainsaw = useGLTF(asset('/models/Chainsaw.glb')) as any;
  const cleaver = useGLTF(asset('/models/cleaver.glb')) as any;
  const machete = useGLTF(asset('/models/Machete.glb')) as any;
  const traps = useGLTF(asset('/models/traps.glb')) as any;

  return (
    <RigidBody type={type} position={position} rotation={rotation} colliders="cuboid">
      <group scale={s}>
        {name === 'Saw' && chainsaw.scene && <primitive object={chainsaw.scene.clone()} />}

        {name === 'Cleaver' && cleaver.scene && <primitive object={cleaver.scene.clone()} />}

        {name === 'Machete' && machete.scene && <primitive object={machete.scene.clone()} />}

        {name === 'Trap' && traps.scene && <primitive object={traps.scene.clone()} />}

        {/* Procedural Fallbacks for non-GLB props */}
        {name === 'PS1' && (
          <group>
            <Box args={[0.6, 0.1, 0.4]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#bbb" roughness={0.7} />
            </Box>
            <Cylinder args={[0.15, 0.15, 0.11, 32]} position={[0, 0, 0.05]}>
              <meshStandardMaterial color="#aaa" roughness={0.7} />
            </Cylinder>
            <Cylinder args={[0.02, 0.02, 0.12, 16]} position={[-0.2, 0, -0.1]}>
              <meshStandardMaterial color="#888" />
            </Cylinder>
            <Cylinder args={[0.02, 0.02, 0.12, 16]} position={[0.2, 0, -0.1]}>
              <meshStandardMaterial color="#888" />
            </Cylinder>
          </group>
        )}

        {name === 'Polaroid' && (
          <group>
            <Box args={[0.2, 0.01, 0.25]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#fff" roughness={0.9} />
            </Box>
            <Box args={[0.16, 0.012, 0.16]} position={[0, 0, -0.02]}>
              <meshStandardMaterial color="#111" roughness={0.3} />
            </Box>
          </group>
        )}
      </group>
    </RigidBody>
  );
}

useGLTF.preload(asset('/models/Chainsaw.glb'));
useGLTF.preload(asset('/models/cleaver.glb'));
useGLTF.preload(asset('/models/Machete.glb'));
useGLTF.preload(asset('/models/traps.glb'));
