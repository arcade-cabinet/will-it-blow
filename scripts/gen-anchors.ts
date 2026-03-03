#!/usr/bin/env tsx
/**
 * gen:anchors — Build-time script that validates layout configs with Zod
 * and pre-computes `_anchors` for each hierarchy level.
 *
 * Hierarchy:
 *   Level 0 (room.json)       → 9 anchors per surface = 54 total
 *   Level 1 (rails.json)      → + landmark + container item anchors
 *   Level 2 (placements.json) → + placed object anchors (55 per object)
 *
 * Usage:
 *   pnpm gen:anchors          # validate + write _anchors
 *   pnpm gen:anchors --check  # validate only (CI mode, no writes)
 */

import fs from 'node:fs';
import path from 'node:path';
import {DEFAULT_ROOM, FURNITURE_RULES} from '../src/engine/FurnitureLayout';
import {
  generateObjectAnchors,
  generateSurfaceAnchors,
  getAdhesionOffset,
} from '../src/engine/layout/anchors';
import {generateLandmarks, resolveLandmarkRef} from '../src/engine/layout/landmarks';
import {mergeLayoutConfigs} from '../src/engine/layout/mergeConfigs';
import {resolvePlacement} from '../src/engine/layout/placement';
import {resolveContainer} from '../src/engine/layout/resolveContainer';
import {
  PlacementsConfigSchema,
  RailsConfigSchema,
  RoomConfigSchema,
} from '../src/engine/layout/schema';
import type {Bounds, PlacementsConfig, RailsConfig, RoomConfig} from '../src/engine/layout/types';

type Vec3 = [number, number, number];

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_DIR = path.join(ROOT, 'src/config/layout');
const CHECK_ONLY = process.argv.includes('--check');

/** Round a Vec3 to 4 decimal places for readable JSON */
function roundVec3(v: Vec3): Vec3 {
  return [
    Math.round(v[0] * 10000) / 10000,
    Math.round(v[1] * 10000) / 10000,
    Math.round(v[2] * 10000) / 10000,
  ];
}

/** Sort anchor map keys for deterministic output */
function sortAnchors(anchors: Record<string, Vec3>): Record<string, Vec3> {
  const sorted: Record<string, Vec3> = {};
  for (const key of Object.keys(anchors).sort()) {
    sorted[key] = roundVec3(anchors[key]);
  }
  return sorted;
}

function loadJson(filename: string): unknown {
  const filepath = path.join(LAYOUT_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function writeJson(filename: string, data: unknown): void {
  const filepath = path.join(LAYOUT_DIR, filename);
  fs.writeFileSync(filepath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let errors = 0;
let warnings = 0;

function error(msg: string): void {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function warn(msg: string): void {
  console.warn(`  WARN: ${msg}`);
  warnings++;
}

console.log('gen:anchors — validating layout configs and computing anchors\n');

// --- Level 0: room.json ---
console.log('Level 0: room.json');
const rawRoom = loadJson('room.json');
const roomResult = RoomConfigSchema.safeParse(rawRoom);
if (!roomResult.success) {
  error(`room.json validation failed:\n${roomResult.error.message}`);
  process.exit(1);
}
const roomConfig = roomResult.data as RoomConfig;
console.log(`  Validated: ${Object.keys(roomConfig.surfaces).length} surfaces`);

// Generate surface anchors
const room = DEFAULT_ROOM;
const surfaceAnchors: Record<string, Vec3> = {};
for (const surface of Object.values(roomConfig.surfaces)) {
  const a = generateSurfaceAnchors(surface, room);
  Object.assign(surfaceAnchors, a);
}
console.log(`  Generated: ${Object.keys(surfaceAnchors).length} surface anchors`);

// Validate seam connections
for (const surface of Object.values(roomConfig.surfaces)) {
  if (!surface.seams) continue;
  for (const [edge, seamRef] of Object.entries(surface.seams)) {
    const [targetSurface, targetEdge] = seamRef.split(':');
    if (!roomConfig.surfaces[targetSurface]) {
      error(`Surface "${surface.id}" seam "${edge}" references unknown surface "${targetSurface}"`);
    }
    // Check reciprocity: target surface should seam back
    const target = roomConfig.surfaces[targetSurface];
    if (target?.seams) {
      const reciprocal = target.seams[targetEdge];
      if (reciprocal) {
        const [recSurface] = reciprocal.split(':');
        if (recSurface !== surface.id) {
          warn(
            `Seam asymmetry: ${surface.id}:${edge} → ${seamRef}, but ${targetSurface}:${targetEdge} → ${reciprocal}`,
          );
        }
      }
    }
  }
}

if (!CHECK_ONLY) {
  const roomWithAnchors = {
    ...(rawRoom as Record<string, unknown>),
    _anchors: sortAnchors(surfaceAnchors),
  };
  writeJson('room.json', roomWithAnchors);
  console.log('  Wrote _anchors to room.json');
}

// --- Level 1: rails.json ---
console.log('\nLevel 1: rails.json');
const rawRails = loadJson('rails.json');
const railsResult = RailsConfigSchema.safeParse(rawRails);
if (!railsResult.success) {
  error(`rails.json validation failed:\n${railsResult.error.message}`);
  process.exit(1);
}
const railsConfig = railsResult.data as RailsConfig;
console.log(
  `  Validated: ${Object.keys(railsConfig.customLandmarks ?? {}).length} landmarks, ${railsConfig.containers.length} containers`,
);

// Generate landmarks
const landmarks = generateLandmarks(room);
if (railsConfig.customLandmarks) {
  for (const [id, def] of Object.entries(railsConfig.customLandmarks)) {
    const basePos = resolveLandmarkRef(def.base, landmarks);
    landmarks[id] = {
      position: [
        basePos[0] + def.offset[0],
        basePos[1] + def.offset[1],
        basePos[2] + def.offset[2],
      ],
      label: def.label,
    };
  }
}

const railAnchors: Record<string, Vec3> = {...surfaceAnchors};

// Inject surface anchors into landmarks so rails can reference them as from/to
for (const [id, pos] of Object.entries(surfaceAnchors)) {
  if (!landmarks[id]) {
    landmarks[id] = {position: [...pos], label: id};
  }
}

// Inject landmark positions into anchors
for (const [id, lm] of Object.entries(landmarks)) {
  railAnchors[`landmark:${id}`] = [...lm.position];
}

// Resolve containers (with adhesion when onSurface is set)
let totalRailItems = 0;
for (const container of railsConfig.containers) {
  const items = resolveContainer(container, landmarks);
  totalRailItems += items.length;

  // Apply adhesion offset when container is bound to a surface
  const surfaceId =
    'onSurface' in container ? (container as {onSurface?: string}).onSurface : undefined;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Find the container item def to get actual bounds
    const containerItem = container.items.find(ci => ci.targetName === item.targetName);
    const itemBounds: Bounds = containerItem?.minBounds ?? [
      containerItem?.width ?? 1,
      1,
      containerItem?.depth ?? 1,
    ];

    // Apply adhesion if container is on a surface
    let position = item.position;
    if (surfaceId) {
      const adhesion = getAdhesionOffset(surfaceId, itemBounds);
      position = [
        item.position[0] + adhesion[0],
        item.position[1] + adhesion[1],
        item.position[2] + adhesion[2],
      ];
    }

    const objAnchors = generateObjectAnchors(item.targetName, position, itemBounds, item.rotationY);
    Object.assign(railAnchors, objAnchors);
  }
}
const newRailAnchorCount = Object.keys(railAnchors).length - Object.keys(surfaceAnchors).length;
console.log(
  `  Generated: ${newRailAnchorCount} new anchors (${totalRailItems} rail items + landmarks)`,
);

if (!CHECK_ONLY) {
  // Only store anchors new to this level
  const railLevelAnchors: Record<string, Vec3> = {};
  for (const [key, val] of Object.entries(railAnchors)) {
    if (!surfaceAnchors[key]) {
      railLevelAnchors[key] = val;
    }
  }
  const railsWithAnchors = {
    ...(rawRails as Record<string, unknown>),
    _anchors: sortAnchors(railLevelAnchors),
  };
  writeJson('rails.json', railsWithAnchors);
  console.log('  Wrote _anchors to rails.json');
}

// --- Level 2: placements.json ---
console.log('\nLevel 2: placements.json');
const rawPlacements = loadJson('placements.json');
const placementsResult = PlacementsConfigSchema.safeParse(rawPlacements);
if (!placementsResult.success) {
  error(`placements.json validation failed:\n${placementsResult.error.message}`);
  process.exit(1);
}
const placementsConfig = placementsResult.data as PlacementsConfig;
const placementCount = Object.keys(placementsConfig.placements).length;
console.log(`  Validated: ${placementCount} placements`);

// Build merged config for resolving placements
const mergedConfig = mergeLayoutConfigs(roomConfig, railsConfig, placementsConfig);
const allAnchors: Record<string, Vec3> = {...railAnchors};

// Resolve all placements
let resolvedCount = 0;
for (const [name, placementDef] of Object.entries(placementsConfig.placements)) {
  try {
    const worldPos = resolvePlacement(placementDef, mergedConfig.surfaces, allAnchors, room);
    resolvedCount++;

    // Generate object anchors
    const objAnchors = generateObjectAnchors(
      name,
      worldPos,
      placementDef.minBounds,
      placementDef.rotationY ?? 0,
    );
    Object.assign(allAnchors, objAnchors);
  } catch (err) {
    error(`Placement "${name}" failed: ${(err as Error).message}`);
  }
}

// Verify all FURNITURE_RULES targets exist
const allTargetNames = new Set<string>();

// Collect all target names from rail items + placements
for (const container of railsConfig.containers) {
  const items = resolveContainer(container, landmarks);
  for (const item of items) {
    allTargetNames.add(item.targetName);
  }
}
for (const name of Object.keys(placementsConfig.placements)) {
  allTargetNames.add(name);
}

for (const rule of FURNITURE_RULES) {
  if (!allTargetNames.has(rule.target)) {
    error(`FURNITURE_RULE "${rule.glb}" references target "${rule.target}" not in layout config`);
  }
}

const newPlacementAnchorCount = Object.keys(allAnchors).length - Object.keys(railAnchors).length;
console.log(`  Resolved: ${resolvedCount}/${placementCount} placements`);
console.log(`  Generated: ${newPlacementAnchorCount} new object anchors`);

if (!CHECK_ONLY) {
  // Only store anchors new to this level
  const placementLevelAnchors: Record<string, Vec3> = {};
  for (const [key, val] of Object.entries(allAnchors)) {
    if (!railAnchors[key]) {
      placementLevelAnchors[key] = val;
    }
  }
  const placementsWithAnchors = {
    ...(rawPlacements as Record<string, unknown>),
    _anchors: sortAnchors(placementLevelAnchors),
  };
  writeJson('placements.json', placementsWithAnchors);
  console.log('  Wrote _anchors to placements.json');
}

// --- Spatial sanity checks ---
console.log('\nSpatial sanity checks:');
const halfW = room.w / 2;
const halfD = room.d / 2;

// Build all targets for validation (rail items + placements)
const allTargets: Record<string, {position: Vec3; bounds?: [number, number, number]}> = {};

for (const container of railsConfig.containers) {
  const items = resolveContainer(container, landmarks);
  const surfaceId =
    'onSurface' in container ? (container as {onSurface?: string}).onSurface : undefined;
  for (const item of items) {
    const containerItem = container.items.find(ci => ci.targetName === item.targetName);
    const itemBounds: Bounds = containerItem?.minBounds ?? [
      containerItem?.width ?? 1,
      1,
      containerItem?.depth ?? 1,
    ];
    let position = item.position;
    if (surfaceId) {
      const adhesion = getAdhesionOffset(surfaceId, itemBounds);
      position = [
        item.position[0] + adhesion[0],
        item.position[1] + adhesion[1],
        item.position[2] + adhesion[2],
      ];
    }
    allTargets[item.targetName] = {position, bounds: itemBounds};
  }
}
for (const [name, def] of Object.entries(placementsConfig.placements)) {
  try {
    const pos = resolvePlacement(def, mergedConfig.surfaces, allAnchors, room);
    allTargets[name] = {position: pos, bounds: def.minBounds};
  } catch {
    // already reported above
  }
}

// Check 1: No items below floor (Y < -0.5 accounting for anchor offsets)
for (const [name, t] of Object.entries(allTargets)) {
  const halfH = t.bounds ? t.bounds[1] / 2 : 0.5;
  const bottomY = t.position[1] - halfH;
  if (bottomY < -0.5) {
    warn(
      `"${name}" bottom at Y=${bottomY.toFixed(2)} is below floor (pos Y=${t.position[1].toFixed(2)})`,
    );
  }
}

// Check 2: No items floating unreasonably high (Y > ceiling + margin)
for (const [name, t] of Object.entries(allTargets)) {
  if (t.position[1] > room.h + 0.5) {
    warn(`"${name}" at Y=${t.position[1].toFixed(2)} is above ceiling (h=${room.h})`);
  }
}

// Check 3: No items outside room bounds (X/Z beyond walls + margin)
for (const [name, t] of Object.entries(allTargets)) {
  const [x, , z] = t.position;
  if (Math.abs(x) > halfW + 0.5) {
    warn(`"${name}" at X=${x.toFixed(2)} is outside room width bounds (±${halfW})`);
  }
  if (Math.abs(z) > halfD + 0.5) {
    warn(`"${name}" at Z=${z.toFixed(2)} is outside room depth bounds (±${halfD})`);
  }
}

// Check 4: Items with onSurface should have adhesion applied (center not ON the surface)
for (const container of railsConfig.containers) {
  const surfaceId =
    'onSurface' in container ? (container as {onSurface?: string}).onSurface : undefined;
  if (!surfaceId) continue;
  for (const ci of container.items) {
    if (!ci.minBounds) {
      warn(
        `"${ci.targetName}" in container "${container.id}" has onSurface="${surfaceId}" but no minBounds — adhesion will use fallback [1,1,1]`,
      );
    }
  }
}

// Check 5: Bounding box overlap detection (warn only for significant overlaps)
const targetEntries = Object.entries(allTargets);
for (let i = 0; i < targetEntries.length; i++) {
  const [nameA, tA] = targetEntries[i];
  if (!tA.bounds) continue;
  for (let j = i + 1; j < targetEntries.length; j++) {
    const [nameB, tB] = targetEntries[j];
    if (!tB.bounds) continue;

    const dx = Math.abs(tA.position[0] - tB.position[0]);
    const dy = Math.abs(tA.position[1] - tB.position[1]);
    const dz = Math.abs(tA.position[2] - tB.position[2]);

    const overlapX = (tA.bounds[0] + tB.bounds[0]) / 2 - dx;
    const overlapY = (tA.bounds[1] + tB.bounds[1]) / 2 - dy;
    const overlapZ = (tA.bounds[2] + tB.bounds[2]) / 2 - dz;

    if (overlapX > 0.1 && overlapY > 0.1 && overlapZ > 0.1) {
      warn(
        `Bounding box overlap: "${nameA}" and "${nameB}" (overlap: X=${overlapX.toFixed(2)}, Y=${overlapY.toFixed(2)}, Z=${overlapZ.toFixed(2)})`,
      );
    }
  }
}

console.log(`  Checked ${Object.keys(allTargets).length} targets for spatial sanity`);

// --- Summary ---
console.log(`\nTotal anchors: ${Object.keys(allAnchors).length}`);
console.log(`  Surface: ${Object.keys(surfaceAnchors).length}`);
console.log(`  Rail: ${newRailAnchorCount}`);
console.log(`  Placement: ${newPlacementAnchorCount}`);

if (errors > 0) {
  console.error(`\nFAILED: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}

if (warnings > 0) {
  console.warn(`\nDONE with ${warnings} warning(s)`);
} else {
  console.log('\nDONE — all configs valid');
}
