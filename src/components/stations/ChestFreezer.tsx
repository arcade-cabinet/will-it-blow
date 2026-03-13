import {useGLTF} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';

export function ChestFreezer() {
  const {scene} = useGLTF('/models/fridge.glb') as any;

  // Position: Push to the back-left corner
  return (
    <group position={[-1.5, 0.0, -3.2]} rotation={[0, 0, 0]}>
      {scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={scene.clone()} castShadow receiveShadow />
        </RigidBody>
      )}
    </group>
  );
}

useGLTF.preload('/models/fridge.glb');
