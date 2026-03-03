/**
 * @module layout/resolveContainer
 * Resolves Row and Column containers into positioned items.
 *
 * Items are sorted by `order`, then distributed along the rail
 * according to the alignment strategy (center, start, end, justify).
 * Each item produces a ResolvedRailItem with world-space position
 * and rotation — backward-compatible with the Target interface.
 */

import {resolveRail} from './resolveRail';
import type {Landmark, LayoutContainerDef, ResolvedRailItem} from './types';

/**
 * Resolve a container (Row or Column) into positioned rail items.
 */
export function resolveContainer(
  def: LayoutContainerDef,
  landmarks: Record<string, Landmark>,
): ResolvedRailItem[] {
  const rail = resolveRail(def, landmarks);
  const items = [...def.items].sort((a, b) => a.order - b.order);

  if (items.length === 0) return [];

  const gap = def.gap ?? 0.2;
  const totalContentWidth = items.reduce((sum, item) => sum + item.width, 0);
  const totalGapWidth = (items.length - 1) * gap;
  const totalNeeded = totalContentWidth + totalGapWidth;

  // Handle overflow
  let scaleFactor = 1;
  if (totalNeeded > rail.length) {
    if (def.overflow === 'error') {
      throw new Error(
        `Container "${def.id}" overflows: needs ${totalNeeded.toFixed(2)} but rail is ${rail.length.toFixed(2)}`,
      );
    }
    if (def.overflow === 'warn') {
      console.warn(
        `Container "${def.id}" overflows: needs ${totalNeeded.toFixed(2)} but rail is ${rail.length.toFixed(2)}`,
      );
    }
    // 'shrink' (default): scale items to fit
    scaleFactor = rail.length / totalNeeded;
  }

  const effectiveContentWidth = totalContentWidth * scaleFactor;
  const effectiveGap = gap * scaleFactor;
  const effectiveTotal = effectiveContentWidth + (items.length - 1) * effectiveGap;

  // Compute start offset based on alignment
  let startOffset: number;
  let itemGap = effectiveGap;

  const align = def.align ?? 'center';
  switch (align) {
    case 'start':
      startOffset = 0;
      break;
    case 'end':
      startOffset = rail.length - effectiveTotal;
      break;
    case 'justify':
      if (items.length > 1) {
        startOffset = 0;
        itemGap = (rail.length - effectiveContentWidth) / (items.length - 1);
      } else {
        startOffset = (rail.length - effectiveTotal) / 2;
      }
      break;
    default:
      startOffset = (rail.length - effectiveTotal) / 2;
      break;
  }

  // Walk items sequentially along the rail
  let cursor = startOffset;
  const results: ResolvedRailItem[] = [];

  for (const item of items) {
    const scaledWidth = item.width * scaleFactor;
    const railParam = (cursor + scaledWidth / 2) / rail.length;

    // Position along rail direction
    const t = cursor + scaledWidth / 2;
    const px = rail.worldFrom[0] + rail.direction[0] * t;
    const py = rail.worldFrom[1] + rail.direction[1] * t + (item.yOffset ?? 0);
    const pz = rail.worldFrom[2] + rail.direction[2] * t;

    // Apply perpendicular offset (rail-level + item-level)
    const totalPerpOffset = rail.perpendicularOffset + (item.perpendicularOffset ?? 0);
    const finalX = px + rail.perpendicular[0] * totalPerpOffset;
    const finalZ = pz + rail.perpendicular[2] * totalPerpOffset;

    const rotationY = item.rotationY ?? rail.childRotationY;

    results.push({
      targetName: item.targetName,
      position: [finalX, py, finalZ],
      rotationY,
      triggerRadius: item.triggerRadius ?? 0,
      markerY: item.markerY,
      railId: rail.id,
      railParameter: Math.min(Math.max(railParam, 0), 1),
    });

    cursor += scaledWidth + itemGap;
  }

  return results;
}
