import {Box} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';

export function Kitchen() {
  const counterHeight = 4;

  return (
    <group>
      {/* Cabinets */}
      <Box args={[40, counterHeight, 12]} position={[0, counterHeight / 2, 0]} receiveShadow>
        <meshStandardMaterial color="#3d2314" roughness={0.9} />
      </Box>

      {/* Countertop */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[41, 0.4, 13]} position={[0, counterHeight + 0.2, 0]} receiveShadow>
          <meshStandardMaterial color="#dddddd" roughness={0.2} metalness={0.1} />
        </Box>
      </RigidBody>

      {/* Backsplash placeholder */}
      <Box args={[40, 10, 1]} position={[0, counterHeight + 5, -6]} receiveShadow>
        <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
      </Box>
    </group>
  );
}
