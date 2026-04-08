/**
 * TV — Wall-mounted CRT television with Mr. Sausage "broadcasting" inside.
 *
 * The CRT shader plane sits at the front of the tube. The `mr_sausage.glb`
 * model is placed a few centimeters behind it, vertically centered, so it
 * reads as the character on screen while the shader paints scanlines,
 * phosphor glow, and flicker on top. Mr. Sausage tracks the player's camera
 * direction on Y so he always appears to face the viewer through the glass.
 *
 * Pointing to `createCrtMaterial` keeps the CRT effects on a standalone
 * ShaderMaterial driven by `uTime`.
 */
import {useGLTF} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {asset} from '../../utils/assetPath';
import {createCrtMaterial} from '../effects/CrtShader';

const MR_SAUSAGE_URL = asset('/models/mr_sausage.glb');

/** Make the TV Mr. Sausage glow so the CRT scanlines read as overlaid on a bright subject. */
function prepareTvMrSausage(scene: THREE.Object3D) {
  scene.traverse(obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      // Clone the material so we don't mutate the shared cached one from
      // `useGLTF` (other places in the scene also render Mr. Sausage).
      const original = mesh.material as THREE.MeshStandardMaterial;
      const cloned = original.clone();
      // A subtle warm emissive keeps the character readable through the
      // green CRT phosphor without washing out the existing textures.
      cloned.emissive = new THREE.Color('#552200');
      cloned.emissiveIntensity = 0.35;
      cloned.toneMapped = false;
      mesh.material = cloned;
    }
  });
}

export function TV() {
  const crtMaterial = useMemo(() => createCrtMaterial('crt-tv', {overlay: true}), []);
  const sausageRef = useRef<THREE.Group>(null);
  const {camera} = useThree();

  // Load + clone the Mr. Sausage GLB once. `useGLTF` caches the result, so
  // we clone to keep the TV instance independent of the main kitchen model.
  const {scene: originalSausageScene} = useGLTF(MR_SAUSAGE_URL) as unknown as {
    scene: THREE.Object3D;
  };
  const sausageScene = useMemo(() => {
    const cloned = originalSausageScene.clone(true);
    prepareTvMrSausage(cloned);
    return cloned;
  }, [originalSausageScene]);

  // Scale + re-center the model exactly once. The source GLB is 0.24m tall
  // with feet at y=0. We scale to ~1.4x (≈0.34m tall) so Mr. Sausage's full
  // torso + head read comfortably in the 0.8m screen without cropping his
  // head at the top. Rotation faces +X (out through the CRT glass).
  useLayoutEffect(() => {
    const grp = sausageRef.current;
    if (!grp) return;
    const scale = 1.4;
    grp.scale.setScalar(scale);
    // Feet at local y = -0.17 → head top at +0.17; centered in the 0.8m tube.
    grp.position.set(0.55, -0.17, 0);
    grp.rotation.set(0, Math.PI / 2, 0);
  }, []);

  useFrame(state => {
    const uniforms = (crtMaterial as THREE.ShaderMaterial).uniforms;
    uniforms.uTime.value = state.clock.elapsedTime;

    // Turn Mr. Sausage's head toward the player — the local y rotation is
    // offset by +π/2 so his front always tracks the camera horizontally
    // rather than staring dead ahead through the glass.
    const grp = sausageRef.current;
    if (grp) {
      const dx = camera.position.x - (-2.8 + 0.55);
      const dz = camera.position.z - 0;
      grp.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group position={[-2.8, 1.8, 0]}>
      {/* Wall Mount */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.4, 0.4]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
      </RigidBody>

      {/* CRT TV Body — open-front shell (5 faces: back, top, bottom, left,
          right). The front is left open so Mr. Sausage inside the tube is
          visible through the CRT shader plane rather than being occluded
          by an opaque face. A single parent RigidBody keeps the collider
          roughly cuboid for the player's physics body. */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* Back */}
        <mesh position={[0.025, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 0.8, 1.0]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        {/* Top */}
        <mesh position={[0.4, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 1.0]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        {/* Bottom */}
        <mesh position={[0.4, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.05, 1.0]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        {/* Left (−Z side) */}
        <mesh position={[0.4, 0, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        {/* Right (+Z side) */}
        <mesh position={[0.4, 0, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        {/* Front bezel — thin frame around the screen so the tube edge reads
            as solid casing without occluding the Mr. Sausage inside. */}
        <mesh position={[0.79, 0.375, 0]}>
          <boxGeometry args={[0.04, 0.05, 1.0]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        <mesh position={[0.79, -0.375, 0]}>
          <boxGeometry args={[0.04, 0.05, 1.0]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        <mesh position={[0.79, 0, -0.475]}>
          <boxGeometry args={[0.04, 0.8, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
        <mesh position={[0.79, 0, 0.475]}>
          <boxGeometry args={[0.04, 0.8, 0.05]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* Mr. Sausage broadcasting from inside the tube */}
      <group ref={sausageRef}>
        <primitive object={sausageScene} />
      </group>

      {/* CRT screen shader plane — renders in front of Mr. Sausage with
          scanlines, flicker, phosphor glow and chromatic aberration. */}
      <mesh position={[0.81, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.65, 0.8]} />
        <primitive object={crtMaterial} attach="material" />
      </mesh>

      {/* Green phosphor glow spilling out of the CRT into the kitchen —
          cribbed from the original POC which used a PointLight at the TV
          face. Provides a classic horror CRT vibe when the player walks
          past the wall. */}
      <pointLight position={[1.2, 0, 0]} intensity={8} distance={3.5} color="#44ff55" />
    </group>
  );
}

useGLTF.preload(MR_SAUSAGE_URL);
