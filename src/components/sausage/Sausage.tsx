import {useFrame} from '@react-three/fiber';
import {useRapier} from '@react-three/rapier';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {createSausageGeometry, generateMeatTexture, SausageCurve} from './SausageGeometry';

interface SausageProps {
  position?: [number, number, number];
  links?: number;
  thickness?: number;
  meatType?: 'pork' | 'beef' | 'chicken' | 'chorizo';
  fatRatio?: number;
  greaseLevel?: number;
}

const meatColors = {
  pork: '#c85a5a',
  beef: '#822424',
  chicken: '#d6a9a9',
  chorizo: '#b83b1a',
};

export function Sausage({
  position = [0, 1, 0],
  links = 4,
  thickness = 0.6,
  meatType = 'pork',
  fatRatio = 0.5,
  greaseLevel = 0.8,
}: SausageProps) {
  const {world} = useRapier();
  const groupRef = useRef<THREE.Group>(null);

  const numBones = links * 5;
  const pSeg = Math.max(200, links * 50);

  // Memoize geometry and materials so they don't rebuild every frame
  const {geometry, bones, skeleton, anchors} = useMemo(() => {
    const curve = new SausageCurve(
      'Sausage Rope (Links)',
      Math.min(20, links * 4),
      new THREE.Vector3(0, 0, 0),
    );
    const geo = createSausageGeometry(curve, pSeg, thickness, 32, links, false, numBones);

    const bonesArr: THREE.Bone[] = [];
    const anchorsArr: {basePosition: THREE.Vector3; currentTarget: THREE.Vector3}[] = [];
    const boneRoot = new THREE.Group();

    for (let i = 0; i < numBones; i++) {
      const t = i / (numBones - 1);
      const p = curve.getPointAt(t);
      const bone = new THREE.Bone();
      bone.position.copy(p);
      boneRoot.add(bone);
      bonesArr.push(bone);
      anchorsArr.push({basePosition: p.clone(), currentTarget: p.clone()});
    }

    return {
      geometry: geo,
      bones: bonesArr,
      skeleton: new THREE.Skeleton(bonesArr),
      anchors: anchorsArr,
      boneRoot,
    };
  }, [links, thickness, numBones, pSeg]);

  const meatMat = useMemo(() => {
    const tex = generateMeatTexture(meatColors[meatType], fatRatio);
    return new THREE.MeshPhysicalMaterial({
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 0.05,
      color: 0xffffff,
      roughness: 1.0 - greaseLevel * 0.6,
      clearcoat: greaseLevel,
      clearcoatRoughness: (1.0 - greaseLevel) * 0.3,
    });
  }, [meatType, fatRatio, greaseLevel]);

  // Create physical bodies manually since we need to spring-bind them to the bones
  const [bodies, setBodies] = useState<any[]>([]);

  useEffect(() => {
    if (!world) return;
    const newBodies: any[] = [];
    const RAPIER = (window as any).RAPIER || require('@dimforge/rapier3d-compat');

    for (let i = 0; i < numBones; i++) {
      const p = anchors[i].basePosition.clone().add(new THREE.Vector3(...position));
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(p.x, p.y, p.z)
        .setLinearDamping(8.0)
        .setAngularDamping(5.0);
      const body = world.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.ball(0.15).setMass(1.0).setRestitution(0.0);
      world.createCollider(colliderDesc, body);

      newBodies.push(body);
    }
    setBodies(newBodies);

    return () => {
      newBodies.forEach(b => world.removeRigidBody(b));
    };
  }, [world, numBones, anchors, position]);

  useFrame((state, delta) => {
    if (bodies.length === 0) return;

    const k = 60.0; // Spring stiffness
    const c = 8.0; // Damping

    for (let i = 0; i < bodies.length; i++) {
      const anchor = anchors[i];
      const body = bodies[i];
      const bone = bones[i];

      // Local base position converted to world
      const p = anchor.basePosition.clone().add(new THREE.Vector3(...position));

      const pos = body.translation();
      const vel = body.linvel();

      body.applyImpulse(
        {
          x: ((p.x - pos.x) * k - vel.x * c) * delta,
          y: ((p.y - pos.y) * k - vel.y * c) * delta,
          z: ((p.z - pos.z) * k - vel.z * c) * delta,
        },
        true,
      );

      // Update bone to body position (relative to group)
      bone.position.set(pos.x - position[0], pos.y - position[1], pos.z - position[2]);
    }
  });

  return (
    <group ref={groupRef} position={position} castShadow receiveShadow>
      <primitive object={geometry.userData.boneRoot || bones[0].parent} />
      <skinnedMesh
        geometry={geometry}
        material={meatMat}
        skeleton={skeleton}
        castShadow
        receiveShadow
      />
    </group>
  );
}
