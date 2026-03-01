import {CapsuleCollider, RigidBody} from '@react-three/rapier';
import {Platform} from 'react-native';

interface GrabbableSausageProps {
  position: [number, number, number];
}

const SAUSAGE_RADIUS = 0.07;
const SAUSAGE_HALF_LENGTH = 0.25;

const isWeb = Platform.OS === 'web';

/**
 * GrabbableSausage — a sausage link that spawns at the stuffer output.
 * Player grabs it with GrabSystem and carries it to the stove pan.
 */
export function GrabbableSausage({position}: GrabbableSausageProps) {
  const sausageMesh = (
    <group
      position={isWeb ? undefined : position}
      userData={{grabbable: true, objectType: 'sausage', objectId: 'sausage-link'}}
    >
      {/* Sausage body — capsule shape */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[SAUSAGE_RADIUS, SAUSAGE_HALF_LENGTH * 2, 8, 16]} />
        <meshStandardMaterial color="#c87533" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Twisted ends — darker nubs */}
      <mesh position={[SAUSAGE_HALF_LENGTH + SAUSAGE_RADIUS, 0, 0]}>
        <sphereGeometry args={[SAUSAGE_RADIUS * 0.6, 8, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
      <mesh position={[-(SAUSAGE_HALF_LENGTH + SAUSAGE_RADIUS), 0, 0]}>
        <sphereGeometry args={[SAUSAGE_RADIUS * 0.6, 8, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
    </group>
  );

  if (!isWeb) return sausageMesh;

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CapsuleCollider
        args={[SAUSAGE_HALF_LENGTH, SAUSAGE_RADIUS]}
        rotation={[0, 0, Math.PI / 2]}
      />
      {sausageMesh}
    </RigidBody>
  );
}
