/**
 * @module PlayerHands
 * First-person hand rendering that follows the camera position with weighted
 * smoothing. Randomly selects a skin/glove texture on mount for visual variety.
 */
import {useGLTF, useTexture} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

/**
 * Renders first-person hands that track the camera with lerp/slerp smoothing.
 * Hands bob gently while standing and drop lower when prone.
 */
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

  const handMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: skinTex,
    roughness: 0.6,
    metalness: 0.1,
  }), [skinTex]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => handMat.dispose();
  }, [handMat]);

  // Apply texture to all meshes in the scene
  useEffect(() => {
    if (handsScene) {
      handsScene.traverse((child: any) => {
        if (child.isMesh) {
          child.material = handMat;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [handsScene, handMat]);

  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const localOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!group.current) return;

    // We sync the group's position/rotation to the camera
    // but with some offset and smoothing for a "weighted" feel
    const t = state.clock.elapsedTime;

    // Offset the hands relative to the camera
    localOffset.set(0, -0.4, -0.6);

    if (posture === 'standing') {
      localOffset.y += Math.sin(t * 2) * 0.02;
      localOffset.x += Math.cos(t * 1.5) * 0.01;
    } else if (posture === 'prone') {
      localOffset.y -= 0.2;
    }

    localOffset.applyQuaternion(camera.quaternion);
    targetPos.copy(camera.position).add(localOffset);

    group.current.position.lerp(targetPos, 1 - Math.pow(0.001, delta));
    group.current.quaternion.slerp(camera.quaternion, 1 - Math.pow(0.001, delta));
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
