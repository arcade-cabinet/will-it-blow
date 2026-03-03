/**
 * @module layout/resolveLayout
 * Top-level layout orchestrator. Takes a LayoutConfig + RoomDimensions
 * and produces a backward-compatible Record<string, Target>.
 *
 * Flow:
 * 1. Generate surface anchors (9 per surface) → merge into anchor map
 * 2. Generate standard landmarks + merge custom landmarks as anchors
 * 3. Resolve containers (rails) → ResolvedRailItem[] → object anchors
 * 4. Resolve all placements → world positions → object anchors
 * 5. Output { targets, anchors, railItems }
 */

import type {RoomDimensions, Target} from '../FurnitureLayout';
import {generateObjectAnchors, generateSurfaceAnchors, getAdhesionOffset} from './anchors';
import {generateLandmarks, resolveLandmarkRef} from './landmarks';
import {resolvePlacement} from './placement';
import {resolveContainer} from './resolveContainer';
import type {Bounds, Landmark, LayoutConfig, ResolvedRailItem} from './types';

type Vec3 = [number, number, number];

export interface LayoutResult {
  targets: Record<string, Target>;
  railItems: ResolvedRailItem[];
  landmarks: Record<string, Landmark>;
  anchors: Record<string, Vec3>;
}

/**
 * Resolve a complete layout config into positioned targets.
 */
export function resolveLayout(layoutConfig: LayoutConfig, room: RoomDimensions): LayoutResult {
  const anchors: Record<string, Vec3> = {};

  // 1. Generate surface anchors
  for (const surface of Object.values(layoutConfig.surfaces)) {
    const surfaceAnchors = generateSurfaceAnchors(surface, room);
    Object.assign(anchors, surfaceAnchors);
  }

  // 2. Generate standard landmarks + merge custom landmarks
  const landmarks = generateLandmarks(room);

  if (layoutConfig.customLandmarks) {
    for (const [id, def] of Object.entries(layoutConfig.customLandmarks)) {
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

  // Inject surface anchors into landmarks so rails can reference them as from/to
  for (const [id, pos] of Object.entries(anchors)) {
    if (!landmarks[id]) {
      landmarks[id] = {position: [...pos], label: id};
    }
  }

  // Also inject landmark positions into anchor map (for placement cross-referencing)
  for (const [id, lm] of Object.entries(landmarks)) {
    anchors[`landmark:${id}`] = [...lm.position];
  }

  // 3. Resolve all containers → rail items (with adhesion when onSurface is set)
  const allRailItems: ResolvedRailItem[] = [];
  for (const container of layoutConfig.containers) {
    const items = resolveContainer(container, landmarks);

    // Apply adhesion offset when container is bound to a surface
    const surfaceId =
      'onSurface' in container ? (container as {onSurface?: string}).onSurface : undefined;
    if (surfaceId) {
      for (let i = 0; i < items.length; i++) {
        const containerItem = container.items.find(ci => ci.targetName === items[i].targetName);
        const itemBounds: Bounds = containerItem?.minBounds ?? [
          containerItem?.width ?? 1,
          1,
          containerItem?.depth ?? 1,
        ];
        const adhesion = getAdhesionOffset(surfaceId, itemBounds);
        items[i] = {
          ...items[i],
          position: [
            items[i].position[0] + adhesion[0],
            items[i].position[1] + adhesion[1],
            items[i].position[2] + adhesion[2],
          ],
        };
      }
    }

    allRailItems.push(...items);
  }

  // Build target map from rail items + generate object anchors
  const targets: Record<string, Target> = {};
  for (const item of allRailItems) {
    targets[item.targetName] = {
      position: item.position,
      rotationY: item.rotationY,
      triggerRadius: item.triggerRadius,
      markerY: item.markerY,
    };
    // Find the container item to get actual bounds
    let itemBounds: Bounds = [1, 1, 1];
    for (const container of layoutConfig.containers) {
      const ci = container.items.find(i => i.targetName === item.targetName);
      if (ci?.minBounds) {
        itemBounds = ci.minBounds;
        break;
      } else if (ci) {
        itemBounds = [ci.width, 1, ci.depth ?? ci.width];
        break;
      }
    }
    const objAnchors = generateObjectAnchors(
      item.targetName,
      item.position,
      itemBounds,
      item.rotationY,
    );
    Object.assign(anchors, objAnchors);
  }

  // 4. Resolve all placements → world positions
  if (layoutConfig.placements) {
    for (const [name, placementDef] of Object.entries(layoutConfig.placements)) {
      const worldPos = resolvePlacement(placementDef, layoutConfig.surfaces, anchors, room);
      targets[name] = {
        position: worldPos,
        rotationY: placementDef.rotationY ?? 0,
        triggerRadius: placementDef.triggerRadius ?? 0,
        markerY: placementDef.markerY,
      };

      // Generate object anchors for placed objects
      if (placementDef.minBounds) {
        const objAnchors = generateObjectAnchors(
          name,
          worldPos,
          placementDef.minBounds,
          placementDef.rotationY ?? 0,
        );
        Object.assign(anchors, objAnchors);
      }
    }
  }

  return {targets, railItems: allRailItems, landmarks, anchors};
}
