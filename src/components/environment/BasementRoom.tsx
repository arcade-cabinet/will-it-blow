/**
 * @module BasementRoom
 * The sealed basement: floor, walls, ceiling, and mattress.
 *
 * E.5: Grime drip textures layered on walls as a second translucent
 * pass for horror atmosphere. The drip color/normal/opacity/roughness
 * maps create a wet-stain effect overlaid on the tile walls. The grime
 * base opacity map adds depth to the ChoppingBlock surface (handled
 * in ChoppingBlock.tsx).
 *
 * The hands_base.png texture is applied in PlayerHands.tsx.
 */
import {useTexture} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useMemo} from 'react';
import * as THREE from 'three';
import {asset} from '../../utils/assetPath';

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
    asset('/textures/tile_floor_color.jpg'),
    asset('/textures/tile_floor_normal.jpg'),
    asset('/textures/tile_floor_roughness.jpg'),

    asset('/textures/tile_wall_color.jpg'),
    asset('/textures/tile_wall_normal.jpg'),
    asset('/textures/tile_wall_roughness.jpg'),
    asset('/textures/tile_wall_ao.jpg'),

    asset('/textures/concrete_color.jpg'),
    asset('/textures/concrete_normal.jpg'),
    asset('/textures/concrete_roughness.jpg'),
  ]);

  // E.5: Grime drip textures for wall overlay (horror atmosphere)
  const [grimeDripColor, grimeDripNormal, grimeDripOpacity, grimeDripRoughness] = useTexture([
    asset('/textures/grime_drip_color.jpg'),
    asset('/textures/grime_drip_normal.jpg'),
    asset('/textures/grime_drip_opacity.jpg'),
    asset('/textures/grime_drip_roughness.jpg'),
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

  // Grime drip repeats: 2x vertically for drip streaks, wider spread horizontally
  [grimeDripColor, grimeDripNormal, grimeDripOpacity, grimeDripRoughness].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
  });

  // E.5: Grime drip overlay material — semi-transparent decal layer.
  // Uses the opacity map as alphaMap so drip stains appear naturally
  // without a hard rectangular edge. The color is darkened toward brown
  // for a dried-blood / moisture-stain look.
  const grimeDripMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: grimeDripColor,
        normalMap: grimeDripNormal,
        roughnessMap: grimeDripRoughness,
        alphaMap: grimeDripOpacity,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        // Render on top of the wall tile layer
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [grimeDripColor, grimeDripNormal, grimeDripRoughness, grimeDripOpacity],
  );

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

      {/* Ceiling — thin slab at the top of the walls (y=3), sized with a
          modest overhang past the 6x8 room footprint so corner rays of the
          view frustum still land on lit geometry (85 max pitch x 75 FOV).
          The previous 20x4x20 slab (1600 m3) was flagged by review as
          wasteful; this 7.5x0.2x9.5 slab is 14.25 m3 -- a 112x reduction. */}
      <RigidBody type="fixed">
        <mesh position={[0, 3.05, 0]} receiveShadow>
          <boxGeometry args={[7.5, 0.2, 9.5]} />
          <meshStandardMaterial
            map={ceilingColor}
            normalMap={ceilingNormal}
            roughnessMap={ceilingRoughness}
            emissive="#666666"
            emissiveIntensity={1.0}
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
        {/* E.5: Grime drip overlay on back wall */}
        <mesh position={[0, 1.5, -3.998]}>
          <planeGeometry args={[6, 3]} />
          <primitive object={grimeDripMat} attach="material" />
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
        {/* E.5: Grime drip overlay on front wall */}
        <mesh rotation={[0, Math.PI, 0]} position={[0, 1.5, 3.998]}>
          <planeGeometry args={[6, 3]} />
          <primitive object={grimeDripMat.clone()} attach="material" />
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
        {/* E.5: Grime drip overlay on left wall */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.998, 1.5, 0]}>
          <planeGeometry args={[8, 3]} />
          <primitive object={grimeDripMat.clone()} attach="material" />
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
        {/* E.5: Grime drip overlay on right wall */}
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[2.998, 1.5, 0]}>
          <planeGeometry args={[8, 3]} />
          <primitive object={grimeDripMat.clone()} attach="material" />
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
