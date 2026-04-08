import {useGLTF} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {asset} from '../../utils/assetPath';

interface TrapDoorMountProps {
  position: [number, number, number];
}

export function TrapDoorMount({position}: TrapDoorMountProps) {
  const {nodes} = useGLTF(asset('/models/horror_traps.glb')) as any;

  // Verify the node exists in the specific GLB we're using
  // If not, we fallback to a safe primitive or nothing
  const trapDoorNode =
    nodes.Base || nodes.Trapdoor || nodes.Cube || Object.values(nodes).find((n: any) => n.isMesh);

  return (
    <group position={position} rotation={[Math.PI, 0, 0]}>
      {trapDoorNode && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh geometry={trapDoorNode.geometry} scale={[1.5, 1.0, 1.5]}>
            <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
          </mesh>
        </RigidBody>
      )}
    </group>
  );
}

useGLTF.preload(asset('/models/horror_traps.glb'));
