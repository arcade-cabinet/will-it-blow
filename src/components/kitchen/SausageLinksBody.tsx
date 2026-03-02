/**
 * @module SausageLinksBody
 * R3F component that renders sausage links with Rapier physics.
 *
 * Uses buildSausageLinksGeometry() from SausageBody.ts for the skinned mesh,
 * generateMeatTexture()/createMeatMaterial()/updateCookingAppearance() from
 * MeatTexture.ts for appearance, and @react-three/rapier for per-bone
 * spring-damper physics.
 *
 * Each bone gets its own RigidBody + BallCollider. Spring forces pull bones
 * toward their rest positions on the curve. Extrusion progress controls which
 * links have spawned. Cooking level drives visual appearance and sizzle
 * vibration via applyCookingShrinkage().
 */

import {useFrame} from '@react-three/fiber';
import {BallCollider, type RapierRigidBody, RigidBody} from '@react-three/rapier';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {
  createMeatMaterial,
  generateMeatTexture,
  updateCookingAppearance,
} from '../../engine/MeatTexture';
import {
  applyCookingShrinkage,
  buildSausageLinksGeometry,
  computeSpringImpulse,
} from '../../engine/SausageBody';

export interface SausageLinksBodyProps {
  position: [number, number, number];
  visible: boolean;
  numLinks: number;
  cookLevel: number;
  isCooking: boolean;
  extrusionProgress: number;
  blendColor?: string;
}

export function SausageLinksBody({
  position,
  visible,
  numLinks,
  cookLevel,
  isCooking,
  extrusionProgress,
  blendColor,
}: SausageLinksBodyProps) {
  // --- 1. Geometry ---
  const geoResult = useMemo(
    () =>
      buildSausageLinksGeometry({
        numLinks,
        thickness: 0.5,
        linkLength: 0.8,
        pathSegments: 200,
        radialSegments: 24,
      }),
    [numLinks],
  );

  // --- 2. Meat texture + material ---
  const meatTexture = useMemo(() => {
    try {
      return generateMeatTexture(blendColor ?? '#c85a5a', 0.5);
    } catch {
      return null;
    }
  }, [blendColor]);

  const material = useMemo(() => {
    const mat = createMeatMaterial();
    if (meatTexture) {
      mat.map = meatTexture.map;
      mat.bumpMap = meatTexture.bumpMap;
    }
    return mat;
  }, [meatTexture]);

  // --- 3. Skeleton setup ---
  const {bones, skinnedMesh} = useMemo(() => {
    const _bones: THREE.Bone[] = [];
    const rootBone = new THREE.Bone();

    for (let i = 0; i < geoResult.numBones; i++) {
      const bone = new THREE.Bone();
      bone.position.copy(geoResult.anchors[i].base);
      rootBone.add(bone);
      _bones.push(bone);
    }

    const _skeleton = new THREE.Skeleton(_bones);
    const _mesh = new THREE.SkinnedMesh(geoResult.geometry, material);
    _mesh.add(rootBone);
    _mesh.bind(_skeleton);

    return {bones: _bones, skinnedMesh: _mesh};
  }, [geoResult, material]);

  // --- 4. Rapier rigid body refs ---
  const rigidBodyRefs = useRef<(RapierRigidBody | null)[]>(Array(numLinks).fill(null));

  // Track cook level and cooking state in refs for useFrame
  const cookLevelRef = useRef(cookLevel);
  cookLevelRef.current = cookLevel;
  const isCookingRef = useRef(isCooking);
  isCookingRef.current = isCooking;
  const extrusionRef = useRef(extrusionProgress);
  extrusionRef.current = extrusionProgress;

  // --- 5. useFrame: spring physics + extrusion + cooking ---
  useFrame(({clock}, delta) => {
    if (!visible) return;
    const time = clock.getElapsedTime();
    const currentCookLevel = cookLevelRef.current;
    const currentExtrusion = extrusionRef.current;
    const cooking = isCookingRef.current;

    for (let i = 0; i < geoResult.numBones; i++) {
      const anchor = geoResult.anchors[i];
      const body = rigidBodyRefs.current[i];
      const bone = bones[i];
      if (!body || !bone) continue;

      // Extrusion logic
      const linkThreshold = (i + 1) / numLinks;
      if (currentExtrusion < linkThreshold && !anchor.extruded) {
        bone.scale.setScalar(0);
        continue;
      }

      // First time this link becomes extruded
      if (!anchor.extruded && currentExtrusion >= linkThreshold) {
        anchor.extruded = true;
        bone.scale.setScalar(1);

        body.setTranslation({x: position[0], y: position[1], z: position[2] + anchor.base.z}, true);
        body.setLinvel({x: 0, y: 0, z: 0}, true);
        body.setAngvel({x: 0, y: 0, z: 0}, true);

        body.applyImpulse({x: (Math.random() - 0.5) * 0.1, y: 0.2, z: 1.5}, true);
      }

      // Cooking deformation
      if (currentCookLevel > 0) {
        applyCookingShrinkage(anchor, currentCookLevel, time, i, cooking);
      }

      // Spring physics
      const springTarget = new THREE.Vector3(
        position[0] + anchor.base.x,
        position[1] + anchor.base.y,
        position[2] + anchor.base.z,
      );

      const bodyPos = body.translation();
      const bodyVel = body.linvel();
      const impulse = computeSpringImpulse(springTarget, bodyPos, bodyVel, delta, 80, 10);
      body.applyImpulse(impulse, true);

      // Read body position back to bone
      const pos = body.translation();
      bone.position.set(pos.x - position[0], pos.y - position[1], pos.z - position[2]);
    }

    // Update cooking appearance on material
    if (currentCookLevel > 0) {
      updateCookingAppearance(material, currentCookLevel);
    }
  });

  // --- 6. JSX ---
  return (
    <group position={position} visible={visible}>
      <primitive object={skinnedMesh} />
      {geoResult.anchors.map((_, i) => (
        <RigidBody
          key={i}
          ref={(ref: RapierRigidBody | null) => {
            rigidBodyRefs.current[i] = ref;
          }}
          type="dynamic"
          position={[position[0], 100 + i, position[2]]}
          linearDamping={8}
          angularDamping={5}
          gravityScale={0}
          colliders={false}
        >
          <BallCollider args={[0.15]} mass={1} restitution={0} />
        </RigidBody>
      ))}
    </group>
  );
}
