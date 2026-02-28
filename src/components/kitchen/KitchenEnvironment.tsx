import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import type React from 'react';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';

// --- Room dimensions (slightly larger than 12x12 kitchen GLB to avoid z-fighting) ---
const ROOM_W = 13; // x-axis
const ROOM_D = 13; // z-axis
const ROOM_H = 5.5; // y-axis
const TILE_LINE = 2.4; // height where subway tile meets concrete on walls

// Wall configs: position [x,y,z], rotation Y, and width
const WALL_CONFIGS = [
  {pos: [0, 0, -ROOM_D / 2] as const, rotY: 0, w: ROOM_W}, // Back wall
  {pos: [0, 0, ROOM_D / 2] as const, rotY: Math.PI, w: ROOM_W}, // Front wall
  {pos: [-ROOM_W / 2, 0, 0] as const, rotY: Math.PI / 2, w: ROOM_D}, // Left wall
  {pos: [ROOM_W / 2, 0, 0] as const, rotY: -Math.PI / 2, w: ROOM_D}, // Right wall
];

// Grime drip decal placements (4 dripping grime + 4 baseboard mold)
const GRIME_DRIPS: Array<{
  size: [number, number];
  position: [number, number, number];
  rotY: number;
}> = [
  {size: [6, 4], position: [-2, 3.5, -ROOM_D / 2 + 0.02], rotY: 0},
  {
    size: [5, 3.5],
    position: [-ROOM_W / 2 + 0.02, 3.2, -2],
    rotY: Math.PI / 2,
  },
  {size: [7, 3], position: [2, 3.8, ROOM_D / 2 - 0.02], rotY: Math.PI},
  {
    size: [5, 3],
    position: [ROOM_W / 2 - 0.02, 3.0, 1],
    rotY: -Math.PI / 2,
  },
];

const GRIME_BASES: Array<{
  size: [number, number];
  position: [number, number, number];
  rotY: number;
}> = [
  {size: [ROOM_W, 1.2], position: [0, 0.6, -ROOM_D / 2 + 0.03], rotY: 0},
  {
    size: [ROOM_D, 1.0],
    position: [-ROOM_W / 2 + 0.03, 0.5, 0],
    rotY: Math.PI / 2,
  },
  {
    size: [ROOM_W, 1.1],
    position: [0, 0.55, ROOM_D / 2 - 0.03],
    rotY: Math.PI,
  },
  {
    size: [ROOM_D, 0.9],
    position: [ROOM_W / 2 - 0.03, 0.45, 0],
    rotY: -Math.PI / 2,
  },
];

// Fluorescent tube fixture positions (from Babylon source)
const TUBE_POSITIONS: [number, number, number][] = [
  [-2.5, 4.2, 1.5],
  [1.5, 4.2, -1.0],
  [-2.5, 4.2, -3.0],
];

const BASE_INTENSITY = 2.0;

/** Resolve asset URL accounting for Expo web baseUrl in production */
function getAssetRootUrl(subdir: string): string {
  if (typeof document !== 'undefined') {
    const base = document.querySelector('base');
    if (base?.href) {
      const url = new URL(base.href);
      return `${url.pathname.replace(/\/$/, '')}/${subdir}/`;
    }
  }
  return `/${subdir}/`;
}

// -------------------------------------------------------
// KitchenModel — loads the kitchen.glb and applies material fixes
// -------------------------------------------------------

function KitchenModel() {
  const modelUrl = `${getAssetRootUrl('models')}kitchen.glb`;
  const {scene} = useGLTF(modelUrl);

  useEffect(() => {
    // Per-material overrides to tame direct light on bright surfaces.
    const brightMaterialOverrides: Record<
      string,
      {
        albedo: [number, number, number];
        envMapIntensity: number;
        killEmissive?: boolean;
      }
    > = {
      blancblanc: {albedo: [0.28, 0.27, 0.24], envMapIntensity: 0.05},
      blanccarreaux: {albedo: [0.3, 0.28, 0.24], envMapIntensity: 0.05},
      blancemission: {
        albedo: [0.25, 0.24, 0.2],
        envMapIntensity: 0.05,
        killEmissive: true,
      },
    };

    scene.traverse((child: any) => {
      if (child.isMesh) {
        // Enable backface culling on all loaded meshes
        child.material.side = THREE.FrontSide;

        if (child.material.isMeshStandardMaterial) {
          child.material.envMapIntensity = 0.05;

          const override = brightMaterialOverrides[child.material.name];
          if (override) {
            child.material.color.setRGB(...override.albedo);
            child.material.envMapIntensity = override.envMapIntensity;
            if (override.killEmissive) {
              child.material.emissive.setRGB(0, 0, 0);
              child.material.emissiveIntensity = 0;
            }
          }
        }
      }
    });

    // Signal to e2e tests that the scene is fully loaded
    if (typeof window !== 'undefined' && (window as any).__gov) {
      (window as any).__gov.sceneReady = true;
    }
  }, [scene]);

  return <primitive object={scene} />;
}

// -------------------------------------------------------
// FluorescentTube — single tube fixture mesh + point light
// -------------------------------------------------------

interface FluorescentTubeProps {
  position: [number, number, number];
  lightRef: React.RefObject<THREE.PointLight | null>;
}

function FluorescentTube({position, lightRef}: FluorescentTubeProps) {
  return (
    <group position={position}>
      {/* Emissive tube (self-lit, no lighting response) */}
      <mesh>
        <boxGeometry args={[0.12, 0.06, 2.5]} />
        <meshBasicMaterial color="#f2ffe6" />
      </mesh>

      {/* Housing bracket above tube */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.3, 0.08, 2.7]} />
        <meshStandardMaterial color="#808080" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Point light just below tube */}
      <pointLight
        ref={lightRef}
        position={[0, -0.05, 0]}
        color="#f2ffe6"
        intensity={BASE_INTENSITY}
        distance={12}
        decay={2}
      />
    </group>
  );
}

// -------------------------------------------------------
// GrimeDecal — semi-transparent plane for horror aesthetic
// -------------------------------------------------------

interface GrimeDecalProps {
  size: [number, number];
  position: [number, number, number];
  rotY: number;
}

function GrimeDecal({size, position, rotY}: GrimeDecalProps) {
  return (
    <mesh position={position} rotation={[0, rotY, 0]} renderOrder={10}>
      <planeGeometry args={size} />
      <meshBasicMaterial color="#1a1008" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

// -------------------------------------------------------
// KitchenEnvironment — room enclosure, GLB, lighting, grime
// -------------------------------------------------------

export const KitchenEnvironment = () => {
  // Refs for fluorescent tube lights (flicker animation)
  const tubeLight0 = useRef<THREE.PointLight>(null);
  const tubeLight1 = useRef<THREE.PointLight>(null);
  const tubeLight2 = useRef<THREE.PointLight>(null);
  const tubeLightRefs = [tubeLight0, tubeLight1, tubeLight2];

  // Flicker state persisted across frames
  const flickerState = useRef({
    time: 0,
    nextFlickerAt: 2 + Math.random() * 3,
    flickeringTube: -1,
    flickerEnd: 0,
  });

  // =======================================================
  // FLICKER ANIMATION (matches Babylon source logic exactly)
  // =======================================================
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = flickerState.current;
    s.time += dt;

    // Trigger a new flicker burst
    if (s.time > s.nextFlickerAt && s.flickeringTube === -1) {
      s.flickeringTube = Math.floor(Math.random() * TUBE_POSITIONS.length);
      s.flickerEnd = s.time + 0.1 + Math.random() * 0.3;
      s.nextFlickerAt = s.time + 3 + Math.random() * 8;
    }

    // Apply intensity to each tube light
    for (let i = 0; i < tubeLightRefs.length; i++) {
      const light = tubeLightRefs[i].current;
      if (!light) continue;

      if (i === s.flickeringTube && s.time < s.flickerEnd) {
        // Rapid on/off flicker using sine wave
        light.intensity = Math.sin(s.time * 60) > 0 ? 0.4 : BASE_INTENSITY;
      } else {
        light.intensity = BASE_INTENSITY;
      }
    }

    // End flicker burst
    if (s.flickeringTube !== -1 && s.time >= s.flickerEnd) {
      s.flickeringTube = -1;
    }
  });

  const upperH = ROOM_H - TILE_LINE;

  return (
    <group>
      {/* =======================================================
			    ROOM ENCLOSURE — floor, ceiling, 4 walls with PBR
			    ======================================================= */}

      {/* Floor (checkered tiles) — ground plane facing up */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#8c877f" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Ceiling (cracked concrete) — ground plane facing down */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#807a73" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Walls — each wall is TWO planes stacked:
			    lower subway tile + upper exposed concrete.
			    Plane normals face +Z by default; we rotate each wall
			    so normals point inward. DoubleSide for lighting from both directions. */}
      {WALL_CONFIGS.map((cfg, i) => (
        <group key={`wall_${i}`}>
          {/* Lower wall: subway tile (y=0 to TILE_LINE) */}
          <mesh position={[cfg.pos[0], TILE_LINE / 2, cfg.pos[2]]} rotation={[0, cfg.rotY, 0]}>
            <planeGeometry args={[cfg.w, TILE_LINE]} />
            <meshStandardMaterial
              color="#999485"
              roughness={0.85}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Upper wall: concrete (y=TILE_LINE to ROOM_H) */}
          <mesh
            position={[cfg.pos[0], TILE_LINE + upperH / 2, cfg.pos[2]]}
            rotation={[0, cfg.rotY, 0]}
          >
            <planeGeometry args={[cfg.w, upperH]} />
            <meshStandardMaterial
              color="#8c857a"
              roughness={0.9}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* =======================================================
			    GRIME DECALS — transparent planes offset from walls
			    ======================================================= */}

      {/* Dripping grime decals on walls */}
      {GRIME_DRIPS.map((decal, i) => (
        <GrimeDecal key={`grimeDrip_${i}`} {...decal} />
      ))}

      {/* Baseboard mold decals along floor line */}
      {GRIME_BASES.map((decal, i) => (
        <GrimeDecal key={`grimeBase_${i}`} {...decal} />
      ))}

      {/* =======================================================
			    KITCHEN GLB MODEL
			    ======================================================= */}
      <KitchenModel />

      {/* =======================================================
			    LIGHTING — harsh fluorescent overhead
			    ======================================================= */}

      {/* Hemisphere light: slightly cooler fluorescent sky color
			    with darker ground bounce for horror atmosphere */}
      <hemisphereLight args={['#d9e6d1', '#4d473d', 0.6]} />

      {/* Center fill point light at mid-wall height —
			    illuminates vertical surfaces the hemisphere misses */}
      <pointLight position={[0, 2.0, 0]} color="#d9e1cc" intensity={0.8} distance={14} decay={2} />

      {/* Fluorescent tube fixtures with flicker animation */}
      {TUBE_POSITIONS.map((pos, i) => (
        <FluorescentTube key={`tube_${i}`} position={pos} lightRef={tubeLightRefs[i]} />
      ))}
    </group>
  );
};
