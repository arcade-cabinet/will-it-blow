import {useGLTF, useTexture} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

export function PlayerHands() {
  const {camera} = useThree();
  const group = useRef<THREE.Group>(null);
  const posture = useGameStore(state => state.posture);

  // Load the exported GLB
  const {scene: handsScene} = useGLTF('/models/hands.glb') as any;

  // Choose a random texture from the newly integrated HandsPack
  const randomSkin = useMemo(() => {
    const skins = [
      '/textures/hands/SkinTones/1/base.png',
      '/textures/hands/SkinTones/2/base.png',
      '/textures/hands/SkinTones/3/base.png',
      '/textures/hands/Gloves/1/base_2.png',
      '/textures/hands/Werewolf/base.png',
      '/textures/hands/Alien/base.png',
    ];
    return skins[Math.floor(Math.random() * skins.length)];
  }, []);

  const skinTex = useTexture(randomSkin);
  skinTex.flipY = false;
  skinTex.colorSpace = THREE.SRGBColorSpace;

  // Apply texture to all meshes in the scene
  useEffect(() => {
    if (handsScene) {
      handsScene.traverse((child: any) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            map: skinTex,
            roughness: 0.6,
            metalness: 0.1,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [handsScene, skinTex]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // We sync the group's position/rotation to the camera
    // but with some offset and smoothing for a "weighted" feel
    const t = state.clock.elapsedTime;

    // Base camera transform
    const camPos = camera.position.clone();
    const camQuat = camera.quaternion.clone();

    // Offset the hands relative to the camera
    const localOffset = new THREE.Vector3(0, -0.4, -0.6);

    if (posture === 'standing') {
      localOffset.y += Math.sin(t * 2) * 0.02;
      localOffset.x += Math.cos(t * 1.5) * 0.01;
    } else if (posture === 'prone') {
      localOffset.y -= 0.2;
    }

    localOffset.applyQuaternion(camQuat);
    const targetPos = camPos.add(localOffset);

    group.current.position.lerp(targetPos, delta * 15.0);
    group.current.quaternion.slerp(camQuat, delta * 15.0);
  });

  return (
    <group ref={group}>
      <group scale={0.06} position={[0, -0.1, 0.2]} rotation={[0, Math.PI, 0]}>
        <primitive object={handsScene} />
      </group>
    </group>
  );
}

useGLTF.preload('/models/hands.glb');
