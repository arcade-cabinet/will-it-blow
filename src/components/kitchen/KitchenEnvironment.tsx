/**
 * @module KitchenEnvironment
 * Room enclosure, PBR textures, grime decals, fluorescent lighting, and
 * furniture loader for the horror kitchen scene.
 *
 * Builds the room as a box of plane meshes (floor, ceiling, 4 walls) with
 * tiled PBR textures from ambientCG. Walls have a two-part split: subway
 * tile below TILE_LINE and exposed concrete above. Grime decals (drips +
 * baseboard mold) are alpha-blended transparent planes placed slightly
 * in front of the walls.
 *
 * Lighting uses a combination of:
 * - Hemisphere light (cool sky, warm ground)
 * - Center fill point light
 * - 3 fluorescent tube fixtures with randomized flicker bursts
 * - Red emergency light and under-counter horror glow
 */

import {useTexture} from '@react-three/drei';
import {useMemo} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import {getAssetUrl} from '../../engine/assetUrl';
import {CeilingLightOrchestrator} from './CeilingLightOrchestrator';
import {FurnitureLoader} from './FurnitureLoader';
import {TrapDoorMount} from './TrapDoorMount';

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

/** Resolve asset root URL for a subdirectory (textures, models) */
function getAssetRootUrl(subdir: string): string {
  return getAssetUrl(subdir);
}

// -------------------------------------------------------
// useRoomTextures — loads ambientCG PBR texture sets for the room enclosure
// -------------------------------------------------------

/**
 * Loads and configures all PBR texture sets for the room enclosure.
 * Uses drei's useTexture to load color, normal, roughness, and AO maps
 * in parallel. Applies RepeatWrapping tiling after load.
 */

/** Configure a texture for tiling: RepeatWrapping + repeat count */
function tileTex(tex: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function useRoomTextures() {
  const root = getAssetRootUrl('textures');

  // Load all PBR maps in parallel via drei's useTexture
  const tileWall = useTexture({
    map: `${root}tile_wall_color.jpg`,
    normalMap: `${root}tile_wall_normal.jpg`,
    roughnessMap: `${root}tile_wall_roughness.jpg`,
    aoMap: `${root}tile_wall_ao.jpg`,
  });
  const concrete = useTexture({
    map: `${root}concrete_color.jpg`,
    normalMap: `${root}concrete_normal.jpg`,
    roughnessMap: `${root}concrete_roughness.jpg`,
  });
  const tileFloor = useTexture({
    map: `${root}tile_floor_color.jpg`,
    normalMap: `${root}tile_floor_normal.jpg`,
    roughnessMap: `${root}tile_floor_roughness.jpg`,
  });
  const grimeDrip = useTexture({
    map: `${root}grime_drip_color.jpg`,
    normalMap: `${root}grime_drip_normal.jpg`,
    roughnessMap: `${root}grime_drip_roughness.jpg`,
    alphaMap: `${root}grime_drip_opacity.jpg`,
  });
  const grimeBase = useTexture({
    map: `${root}grime_base_color.jpg`,
    normalMap: `${root}grime_base_normal.jpg`,
    roughnessMap: `${root}grime_base_roughness.jpg`,
    alphaMap: `${root}grime_base_opacity.jpg`,
  });

  // Apply tiling (run once after load)
  useMemo(() => {
    // Subway tile: ~6.5 tiles across a 13-unit wall, ~2.4 tiles vertically
    for (const t of Object.values(tileWall)) tileTex(t as THREE.Texture, 6, 3);
    // Concrete: ~3 repeats across a 13-unit wall
    for (const t of Object.values(concrete)) tileTex(t as THREE.Texture, 3, 2);
    // Floor tile: ~6 repeats across 13-unit floor
    for (const t of Object.values(tileFloor)) tileTex(t as THREE.Texture, 6, 6);
    // Grime decals: no tiling (they're placed individually, 1:1 mapping)
  }, [tileWall, concrete, tileFloor]);

  return {tileWall, concrete, tileFloor, grimeDrip, grimeBase};
}

// -------------------------------------------------------
// RoomEnclosure — floor, ceiling, walls with PBR textures
// -------------------------------------------------------

/**
 * Floor, ceiling, and four walls rendered as plane meshes with PBR materials.
 * Walls are split at TILE_LINE: subway tile below, exposed concrete above.
 * DoubleSide on walls ensures correct lighting regardless of face winding.
 */
function RoomEnclosure({textures}: {textures: ReturnType<typeof useRoomTextures>}) {
  const upperH = ROOM_H - TILE_LINE;

  return (
    <group>
      {/* Floor (tile) — ground plane facing up */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          {...textures.tileFloor}
          roughness={0.9}
          metalness={0.0}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Ceiling (concrete) — ground plane facing down */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          {...textures.concrete}
          roughness={0.95}
          metalness={0.0}
          side={THREE.FrontSide}
        />
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
              {...textures.tileWall}
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
              {...textures.concrete}
              roughness={0.9}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------
// PBR Grime Decals — textured transparent planes
// -------------------------------------------------------

interface PbrGrimeDecalProps {
  size: [number, number];
  position: [number, number, number];
  rotY: number;
  textures: {
    map: THREE.Texture;
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
    alphaMap: THREE.Texture;
  };
}

function PbrGrimeDecal({size, position, rotY, textures}: PbrGrimeDecalProps) {
  return (
    <mesh position={position} rotation={[0, rotY, 0]} renderOrder={10}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        {...textures}
        transparent
        opacity={0.85}
        depthWrite={false}
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}

// -------------------------------------------------------
// KitchenEnvironment — room enclosure, furniture, lighting, grime
// -------------------------------------------------------

/**
 * Top-level kitchen environment component.
 * Composes room enclosure, PBR grime decals, GLB furniture, and all lighting.
 * Fluorescent tubes randomly flicker using per-frame sine wave intensity.
 *
 * @param props.grinderCranking - Controls grinder crank animation in FurnitureLoader
 */
const lc = config.scene.lighting;

export const KitchenEnvironment = ({grinderCranking = false}: {grinderCranking?: boolean}) => {
  // Load PBR textures for room enclosure
  const textures = useRoomTextures();

  return (
    <group>
      {/* =======================================================
          ROOM ENCLOSURE — floor, ceiling, 4 walls with PBR textures
          ======================================================= */}
      <RoomEnclosure textures={textures} />

      {/* =======================================================
          GRIME DECALS — PBR textured transparent planes
          ======================================================= */}

      {/* Dripping grime decals on walls */}
      {GRIME_DRIPS.map((decal, i) => (
        <PbrGrimeDecal key={`grimeDrip_${i}`} {...decal} textures={textures.grimeDrip} />
      ))}

      {/* Baseboard mold decals along floor line */}
      {GRIME_BASES.map((decal, i) => (
        <PbrGrimeDecal key={`grimeBase_${i}`} {...decal} textures={textures.grimeBase} />
      ))}

      {/* =======================================================
          FURNITURE — GLB segments positioned via FurnitureLayout targets
          ======================================================= */}
      <FurnitureLoader grinderCranking={grinderCranking} />

      {/* =======================================================
          CEILING ELEMENTS — trap door + ECS-driven lighting panels
          ======================================================= */}
      <TrapDoorMount position={[0, ROOM_H, 0]} />
      <CeilingLightOrchestrator />

      {/* Hemisphere light: slightly cooler fluorescent sky color
          with darker ground bounce for horror atmosphere */}
      <hemisphereLight args={['#d9e6d1', '#4d473d', lc.ambient.hemisphere]} />

      {/* Center fill point light at mid-wall height —
          illuminates vertical surfaces the hemisphere misses */}
      <pointLight
        position={[0, 2.0, 0]}
        color="#d9e1cc"
        intensity={lc.ambient.centerFill}
        distance={14}
        decay={2}
      />

      {/* =======================================================
          HORROR ATMOSPHERE LIGHTING
          ======================================================= */}

      {/* Red emergency light near the ceiling trap door — pulsing ominous glow */}
      <pointLight
        position={lc.horror.redEmergency.position}
        color="#ff1a1a"
        intensity={lc.horror.redEmergency.intensity}
        distance={8}
        decay={2}
      />

      {/* Dim under-counter light casting creepy shadows from below */}
      <pointLight
        position={[0, 0.15, 0]}
        color="#443322"
        intensity={lc.horror.underCounter.intensity}
        distance={5}
        decay={2}
      />
    </group>
  );
};
