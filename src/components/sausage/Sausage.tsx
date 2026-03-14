import {useFrame} from '@react-three/fiber';
import {useRapier} from '@react-three/rapier';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
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

  const gamePhase = useGameStore(state => state.gamePhase);
  const stuffLevel = useGameStore(state => state.stuffLevel);
  const cookLevel = useGameStore(state => state.cookLevel);

  const numBones = links * 5;
  const pSeg = Math.max(200, links * 50);

  // Memoize geometry and materials so they don't rebuild every frame
  const {geometry, bones, skeleton, anchors} = useMemo(() => {
    const curve = new SausageCurve('Coil', 3.0, new THREE.Vector3(0, 0, 0));
    const geo = createSausageGeometry(curve, pSeg, thickness, 32, links, true, numBones);

    const bonesArr: THREE.Bone[] = [];
    const anchorsArr: {
      t: number;
      basePosition: THREE.Vector3;
      currentTarget: THREE.Vector3;
      extruded: boolean;
    }[] = [];
    const boneRoot = new THREE.Group();

    for (let i = 0; i < numBones; i++) {
      const t = i / (numBones - 1);
      const p = curve.getPointAt(t);
      const bone = new THREE.Bone();
      bone.position.copy(p);
      boneRoot.add(bone);
      bonesArr.push(bone);
      anchorsArr.push({t, basePosition: p.clone(), currentTarget: p.clone(), extruded: false});
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
      // Initially, hide bodies high up until extruded
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 100 + i * 0.5, 0)
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
  }, [world, numBones]);

  // Reset extrusion states if game phase changes backwards
  useEffect(() => {
    if (gamePhase === 'SELECT_INGREDIENTS') {
      anchors.forEach(a => (a.extruded = false));
      meatMat.color.setHex(0xffffff);
      meatMat.roughness = 1.0 - greaseLevel * 0.6;
    }
  }, [gamePhase, anchors, meatMat, greaseLevel]);

  useFrame((state, delta) => {
    if (bodies.length === 0) return;

    // Only visible if past grinder phase
    if (!groupRef.current) return;
    if (
      ['SELECT_INGREDIENTS', 'CHOPPING', 'FILL_GRINDER', 'GRINDING', 'MOVE_BOWL'].includes(
        gamePhase,
      )
    ) {
      groupRef.current.visible = false;
      return;
    } else {
      groupRef.current.visible = true;
    }

    const t = state.clock.elapsedTime;
    const isPan = gamePhase === 'COOKING' || gamePhase === 'MOVE_PAN' || gamePhase === 'DONE';
    const isStuffing = gamePhase === 'ATTACH_CASING' || gamePhase === 'STUFFING';

    // Position target based on phase
    const targetOffset = isPan
      ? new THREE.Vector3(2.8, 0.45, 0)
      : isStuffing || gamePhase === 'MOVE_SAUSAGE'
        ? new THREE.Vector3(-2.8, 0.65, 2)
        : new THREE.Vector3(...position);

    // Stuffer Nozzle position (local to stuffer offset)
    const nozzleTipPos = new THREE.Vector3(-2.8, 1.4, 2.5);

    const k = isPan ? 250.0 : 60.0; // Spring stiffness
    const c = isPan ? 15.0 : 8.0; // Damping

    for (let i = 0; i < bodies.length; i++) {
      const anchor = anchors[i];
      const body = bodies[i];
      const bone = bones[i];

      // Extrusion Logic
      if (isStuffing || gamePhase === 'MOVE_SAUSAGE') {
        if (stuffLevel >= anchor.t && !anchor.extruded) {
          anchor.extruded = true;
          bone.scale.setScalar(1);
          body.setTranslation({x: nozzleTipPos.x, y: nozzleTipPos.y, z: nozzleTipPos.z}, true);
          body.setLinvel({x: 0, y: 0, z: 0}, true);
          body.applyImpulse({x: (Math.random() - 0.5) * 0.1, y: 0.3, z: 2.0}, true);
        }
        if (!anchor.extruded) {
          body.setTranslation({x: 0, y: 100 + i * 0.5, z: 0}, true);
          bone.position.copy(nozzleTipPos);
          bone.scale.setScalar(0.0001);
          continue;
        }
      } else {
        // If loaded straight into Pan, they are all extruded
        if (!anchor.extruded) {
          anchor.extruded = true;
          bone.scale.setScalar(1);
          body.setTranslation(
            {
              x: targetOffset.x + anchor.basePosition.x,
              y: targetOffset.y + anchor.basePosition.y + 0.5,
              z: targetOffset.z + anchor.basePosition.z,
            },
            true,
          );
        }
      }

      // Local base position converted to world
      const p = anchor.basePosition.clone().add(targetOffset);

      if (isPan) {
        const shrinkY = 1.0 - cookLevel * 0.25;
        const dist2D = Math.sqrt(anchor.basePosition.x ** 2 + anchor.basePosition.z ** 2);
        p.y = p.y * shrinkY + (dist2D * 0.12) ** 2 * cookLevel * 0.6;
        if (cookLevel > 0.05) {
          p.x += Math.sin(t * 15 + anchor.basePosition.x * 2) * 0.03 * cookLevel;
          p.z += Math.cos(t * 18 + anchor.basePosition.z * 2) * 0.03 * cookLevel;
        }
      }

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

      // Update bone to body position (relative to group, which is at 0,0,0)
      bone.position.set(pos.x, pos.y, pos.z);
    }

    // Update cooking visuals on the material
    if (gamePhase === 'COOKING' || gamePhase === 'DONE') {
      const cL = cookLevel;
      const tC = new THREE.Color();
      if (cL < 0.7) {
        tC.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x8b5a2b), cL / 0.7);
      } else {
        tC.lerpColors(new THREE.Color(0x8b5a2b), new THREE.Color(0x3a1e12), (cL - 0.7) / 0.3);
      }
      meatMat.color.copy(tC);
      meatMat.roughness = Math.min(1.0, 1.0 - greaseLevel * 0.6 + cL * 0.8);
      meatMat.bumpScale = 0.05 + cL * 0.25;
      meatMat.clearcoat = greaseLevel * Math.max(0, 1.0 - cL * 1.2);
      if (groupRef.current) {
        groupRef.current.scale.set(1.0 - cL * 0.15, 1.0, 1.0 - cL * 0.15);
      }
    }
  });

  return (
    <group ref={groupRef} castShadow receiveShadow>
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
