import {useTexture} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import * as THREE from 'three';

export function BasementRoom() {
  const [
    floorColor,
    floorNormal,
    floorRoughness,
    wallColor,
    wallNormal,
    wallRoughness,
    wallAo,
    ceilingColor,
    ceilingNormal,
    ceilingRoughness,
  ] = useTexture([
    require('../../../public/textures/tile_floor_color.jpg'),
    require('../../../public/textures/tile_floor_normal.jpg'),
    require('../../../public/textures/tile_floor_roughness.jpg'),

    require('../../../public/textures/tile_wall_color.jpg'),
    require('../../../public/textures/tile_wall_normal.jpg'),
    require('../../../public/textures/tile_wall_roughness.jpg'),
    require('../../../public/textures/tile_wall_ao.jpg'),

    require('../../../public/textures/concrete_color.jpg'),
    require('../../../public/textures/concrete_normal.jpg'),
    require('../../../public/textures/concrete_roughness.jpg'),
  ]);

  // Setup repeating for all textures
  // Repeating less means the texture maps to a larger area, making the tiles look bigger
  // and fixing the illusion of the player being too high up.
  [floorColor, floorNormal, floorRoughness].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4); // Was 6x8. Now each tile pattern covers a 2x2 meter area.
  });

  [wallColor, wallNormal, wallRoughness, wallAo].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1.5); // Was 8x3
  });

  [ceilingColor, ceilingNormal, ceilingRoughness].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4); // Was 6x8
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 8]} />
          <meshStandardMaterial
            map={floorColor}
            normalMap={floorNormal}
            roughnessMap={floorRoughness}
            roughness={0.8}
          />
        </mesh>
      </RigidBody>

      {/* Ceiling */}
      <RigidBody type="fixed">
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
          <planeGeometry args={[6, 8]} />
          <meshStandardMaterial
            map={ceilingColor}
            normalMap={ceilingNormal}
            roughnessMap={ceilingRoughness}
          />
        </mesh>
      </RigidBody>

      {/* Back Wall (Z = -4) */}
      <RigidBody type="fixed">
        <mesh position={[0, 1.5, -4]} receiveShadow>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial
            map={wallColor}
            normalMap={wallNormal}
            roughnessMap={wallRoughness}
          />
        </mesh>
      </RigidBody>

      {/* Front Wall (Z = 4) */}
      <RigidBody type="fixed">
        <mesh rotation={[0, Math.PI, 0]} position={[0, 1.5, 4]} receiveShadow>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial
            map={wallColor}
            normalMap={wallNormal}
            roughnessMap={wallRoughness}
          />
        </mesh>
      </RigidBody>

      {/* Left Wall (X = -3) */}
      <RigidBody type="fixed">
        <mesh rotation={[0, Math.PI / 2, 0]} position={[-3, 1.5, 0]} receiveShadow>
          <planeGeometry args={[8, 3]} />
          <meshStandardMaterial
            map={wallColor}
            normalMap={wallNormal}
            roughnessMap={wallRoughness}
          />
        </mesh>
      </RigidBody>

      {/* Right Wall (X = 3) */}
      <RigidBody type="fixed">
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[3, 1.5, 0]} receiveShadow>
          <planeGeometry args={[8, 3]} />
          <meshStandardMaterial
            map={wallColor}
            normalMap={wallNormal}
            roughnessMap={wallRoughness}
          />
        </mesh>
      </RigidBody>

      {/* Box to represent the Mattress the player starts on */}
      <RigidBody type="fixed">
        <mesh position={[2.0, 0.25, 3.0]} receiveShadow castShadow>
          <boxGeometry args={[1.5, 0.5, 2.0]} />
          <meshStandardMaterial color="#443333" roughness={0.9} />
        </mesh>
      </RigidBody>
    </group>
  );
}
