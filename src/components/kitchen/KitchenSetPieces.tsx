import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export function KitchenSetPieces() {
  const island = useGLTF('/models/island_counter.glb') as any;
  const cabinet1 = useGLTF('/models/kitchen_cabinet1.glb') as any;
  const cabinet2 = useGLTF('/models/kitchen_cabinet2.glb') as any;

  return (
    <group position={[0, 0, 0]}>
      {/* Island Counter placed in middle / right side */}
      {island.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={island.scene.clone()} position={[1.5, 0, -1.0]} scale={1.2} />
        </RigidBody>
      )}

      {/* Wall cabinets placed against back wall */}
      {cabinet1.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={cabinet1.scene.clone()} position={[-1.0, 0, -3.5]} scale={1.2} />
        </RigidBody>
      )}
      
      {cabinet2.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={cabinet2.scene.clone()} position={[0.5, 0, -3.5]} scale={1.2} />
        </RigidBody>
      )}
    </group>
  );
}

useGLTF.preload('/models/island_counter.glb');
useGLTF.preload('/models/kitchen_cabinet1.glb');
useGLTF.preload('/models/kitchen_cabinet2.glb');
