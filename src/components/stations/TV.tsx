/**
 * TV — Wall-mounted CRT television with Mr. Sausage "broadcasting" inside.
 *
 * T2.A: Jigsaw Billy upgrade — red phosphor tinting, swivel servo with
 * exponential-decay lerp, head tilt tracking (vertical camera offset),
 * and static bursts keyed to Mr. Sausage's reaction intensity.
 *
 * The CRT shader plane sits at the front of the tube. The `mr_sausage.glb`
 * model is placed a few centimeters behind it, vertically centered, so it
 * reads as the character on screen while the shader paints scanlines,
 * phosphor glow, and flicker on top. Mr. Sausage tracks the player's camera
 * direction on Y (swivel) and X (tilt) so he always appears to face the
 * viewer through the glass.
 *
 * Pointing to `createCrtMaterial` keeps the CRT effects on a standalone
 * ShaderMaterial driven by `uTime`.
 */
import {useGLTF} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {asset} from '../../utils/assetPath';
import {createCrtMaterial} from '../effects/CrtShader';

const MR_SAUSAGE_URL = asset('/models/mr_sausage.glb');

/** TV world position — shared between placement and servo math. */
const TV_POS: [number, number, number] = [-2.8, 1.8, 0];

/**
 * Exponential-decay servo lerp. Smoothly approaches a target angle
 * at a given speed, frame-rate independent.
 */
function servoLerp(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

/** Reaction-to-intensity map (0 = calm, 1 = maximum agitation). */
const REACTION_INTENSITY: Record<string, number> = {
  idle: 0,
  nod: 0.1,
  talk: 0.15,
  eating: 0.1,
  nervous: 0.3,
  flinch: 0.5,
  laugh: 0.4,
  excitement: 0.6,
  disgust: 0.7,
  judging: 0.8,
};

/**
 * Tint Mr. Sausage's materials with a red phosphor emissive so the
 * character reads as being lit by the CRT's red glow. Clones each
 * material to avoid mutating the shared cached version from `useGLTF`.
 */
function prepareTvMrSausage(scene: THREE.Object3D) {
  scene.traverse(obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const original = mesh.material as THREE.MeshStandardMaterial;
      const cloned = original.clone();
      // Red phosphor emissive (T2.A) — replaces the previous warm amber.
      cloned.emissive = new THREE.Color('#ff2200');
      cloned.emissiveIntensity = 0.3;
      cloned.toneMapped = false;
      mesh.material = cloned;
    }
  });
}

export function TV() {
  const crtMaterial = useMemo(() => createCrtMaterial('crt-tv', {overlay: true}), []);
  const sausageRef = useRef<THREE.Group>(null);
  const {camera} = useThree();

  // Servo state: smooth Y-rotation (swivel) and X-rotation (tilt).
  const swivelAngle = useRef(0);
  const tiltAngle = useRef(0);

  // Read Mr. Sausage's current reaction for static burst keying.
  const mrSausageReaction = useGameStore(state => state.mrSausageReaction);
  const reactionIntensity = REACTION_INTENSITY[mrSausageReaction] ?? 0;

  // Load + clone the Mr. Sausage GLB once.
  const {scene: originalSausageScene} = useGLTF(MR_SAUSAGE_URL) as unknown as {
    scene: THREE.Object3D;
  };
  const sausageScene = useMemo(() => {
    const cloned = originalSausageScene.clone(true);
    prepareTvMrSausage(cloned);
    return cloned;
  }, [originalSausageScene]);

  // Scale + re-center the model exactly once.
  useLayoutEffect(() => {
    const grp = sausageRef.current;
    if (!grp) return;
    const scale = 1.4;
    grp.scale.setScalar(scale);
    grp.position.set(0.55, -0.17, 0);
    grp.rotation.set(0, Math.PI / 2, 0);
  }, []);

  useFrame((state, delta) => {
    const uniforms = (crtMaterial as THREE.ShaderMaterial).uniforms;
    uniforms.uTime.value = state.clock.elapsedTime;

    // Feed reaction intensity into the CRT shader for static bursts (T2.A).
    uniforms.uReactionIntensity.value = reactionIntensity;
    // Boost static and flicker proportionally to reaction.
    uniforms.uStaticIntensity.value = 0.06 + reactionIntensity * 0.15;
    uniforms.uFlickerIntensity.value = 1.0 + reactionIntensity * 0.4;

    // --- Swivel servo (T2.A) — smooth Y-rotation toward the player ---
    const grp = sausageRef.current;
    if (grp) {
      // Compute target swivel angle (horizontal tracking).
      const dx = camera.position.x - (TV_POS[0] + 0.55);
      const dz = camera.position.z - TV_POS[2];
      const targetSwivel = Math.atan2(dx, dz);

      // Compute target tilt angle (vertical head tracking).
      const dy = camera.position.y - TV_POS[1];
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      const targetTilt = Math.atan2(dy, Math.max(horizontalDist, 0.1));
      // Clamp tilt to a believable range for a CRT puppet.
      const clampedTilt = Math.max(-0.35, Math.min(0.35, targetTilt));

      // Servo lerp — speed 4 gives ~250ms settling time.
      swivelAngle.current = servoLerp(swivelAngle.current, targetSwivel, 4, delta);
      tiltAngle.current = servoLerp(tiltAngle.current, clampedTilt, 3, delta);

      grp.rotation.y = swivelAngle.current;
      grp.rotation.x = tiltAngle.current;
    }
  });

  return (
    <group position={TV_POS}>
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
        {/* Front bezel — thin frame around the screen */}
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

      {/* Red phosphor glow spilling out of the CRT into the kitchen (T2.A).
          Changed from green (#44ff55) to blood-red (#ff2200) to match the
          Jigsaw Billy horror aesthetic. */}
      <pointLight position={[1.2, 0, 0]} intensity={8} distance={3.5} color={0xff2200} />
    </group>
  );
}

useGLTF.preload(MR_SAUSAGE_URL);
