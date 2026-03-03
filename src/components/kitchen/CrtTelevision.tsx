/**
 * @module CrtTelevision
 * Wall-mounted CRT television with TSL shader screen and Mr. Sausage inside.
 *
 * Housing geometry is now driven by ECS entities (crt-tv.json bare machine).
 * The CRT shader plane, glass overlay, Mr. Sausage character, and power LED
 * remain as React children — they have unique shader/animation behavior that
 * doesn't fit the ECS data model.
 *
 * Z-layering (front to back): Mr. Sausage [screenZ+0.05] > glass [bezelZ+0.02]
 * > CRT screen [screenZ=0.835] > bezel recess [bezelZ-0.04] > housing [center].
 *
 * @see CrtShader — TSL NodeMaterial that compiles to WGSL/GLSL
 * @see MrSausage3D — procedural character rendered inside the screen
 */

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {config} from '../../config';
import {buildMachineArchetype} from '../../ecs/archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../ecs/archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../../ecs/renderers/ECSScene';
import type {Entity} from '../../ecs/types';
import {MrSausage3D} from '../characters/MrSausage3D';
import type {Reaction} from '../characters/reactions';
import {createCrtMaterial, crtUniforms} from '../effects/CrtShader';

/**
 * All CRT display params (screen geometry, reaction intensity) live in
 * config.machines['crt-tv'].display — same housing as the ECS entities.
 */
const DISPLAY = config.machines['crt-tv'].display!;
const TV = {
  screen: DISPLAY.screen,
  screenZ: DISPLAY.screen.z,
  bezel: DISPLAY.bezel,
  bezelZ: DISPLAY.bezel.z,
  sausageScale: DISPLAY.character.scale,
  sausageYOffset: DISPLAY.character.yOffset,
};
const REACTION_INTENSITY = DISPLAY.reactionIntensity;

const crtArchetype = buildMachineArchetype(config.machines['crt-tv']);

interface CrtTelevisionProps {
  reaction?: Reaction;
  position: [number, number, number];
}

/**
 * Wall-mounted CRT television with ECS-driven housing, TSL shader screen,
 * and Mr. Sausage character inside.
 */
export const CrtTelevision = ({reaction = 'idle', position}: CrtTelevisionProps) => {
  // --- ECS entities for housing geometry ---
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    entitiesRef.current = spawnMachine(crtArchetype);
    return () => {
      despawnMachine(entitiesRef.current);
      entitiesRef.current = [];
    };
  }, []);

  // --- Refs for animated materials ---
  const glassMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ledMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Reaction smoothing state (persisted across frames)
  const animState = useRef({
    time: 0,
    currentReactionIntensity: 0,
  });

  // Keep reaction ref updated for use in useFrame
  const reactionRef = useRef<Reaction>(reaction);
  reactionRef.current = reaction;

  // --- CRT shader material (created once) ---
  const crtMaterial = useMemo(() => createCrtMaterial('tvCrt'), []);

  // --- Animation loop ---
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = animState.current;
    s.time += dt;

    // Update CRT time uniform
    crtUniforms.time.value = s.time;

    // Smooth reaction intensity
    const targetIntensity = REACTION_INTENSITY[reactionRef.current] ?? 0;
    const lerpSpeed = targetIntensity > s.currentReactionIntensity ? 8.0 : 3.0;
    s.currentReactionIntensity +=
      (targetIntensity - s.currentReactionIntensity) * Math.min(lerpSpeed * dt, 1.0);
    crtUniforms.reactionIntensity.value = s.currentReactionIntensity;

    // Blink power LED
    const ledBrightness = 0.5 + 0.5 * Math.sin(s.time * 3);
    if (ledMatRef.current) {
      ledMatRef.current.color.setRGB(ledBrightness, 0.0, 0.0);
    }

    // Glass reflection pulse
    const glassGlow = 0.01 + s.currentReactionIntensity * 0.03;
    if (glassMatRef.current) {
      glassMatRef.current.color.setRGB(
        0.03 + glassGlow * 0.5,
        0.04 + glassGlow,
        0.03 + glassGlow * 0.7,
      );
    }
  });

  return (
    <group position={position}>
      {/* ========== ECS-driven housing geometry ========== */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* ========== CRT Screen (shader plane behind glass) ========== */}
      <mesh position={[0, 0, TV.screenZ]} material={crtMaterial}>
        <planeGeometry args={[TV.screen.width, TV.screen.height]} />
      </mesh>

      {/* ========== Glass bezel (semi-transparent CRT glass surface) ========== */}
      <mesh position={[0, 0, TV.bezelZ + 0.02]}>
        <planeGeometry args={[TV.bezel.width, TV.bezel.height]} />
        <meshBasicMaterial
          ref={glassMatRef}
          color={[0.03, 0.04, 0.03]}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* ========== Power LED ========== */}
      <mesh position={[1.4, -0.5, TV.bezelZ]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial ref={ledMatRef} color={[1.0, 0.0, 0.0]} />
      </mesh>

      {/* ========== Mr. Sausage inside TV ========== */}
      <MrSausage3D
        reaction={reaction}
        position={[0, TV.sausageYOffset, TV.screenZ + 0.05]}
        scale={TV.sausageScale}
        rotationY={Math.PI}
        trackCamera
      />
    </group>
  );
};
