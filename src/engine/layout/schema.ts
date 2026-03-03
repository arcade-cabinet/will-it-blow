/**
 * @module layout/schema
 * Zod schemas for validating the hierarchical layout config files.
 *
 * Three levels:
 *   RoomConfigSchema   → room.json   (surfaces)
 *   RailsConfigSchema  → rails.json  (customLandmarks + containers)
 *   PlacementsConfigSchema → placements.json (object placements)
 *
 * Used by:
 * - gen:anchors build script (validates before computing anchors)
 * - Tests (schema round-trip verification)
 */

import {z} from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
const BoundsSchema = z.tuple([z.number(), z.number(), z.number()]);
const SurfaceAxisSchema = z.enum(['xz', 'xy']);
const SurfaceAlignmentSchema = z.enum(['vertical', 'horizontal']);

// ---------------------------------------------------------------------------
// Surface types
// ---------------------------------------------------------------------------

const SurfaceFillSchema = z.object({
  material: z.string(),
  coverage: z.number().min(0).max(1),
  tiling: z.tuple([z.number(), z.number()]).optional(),
});

const SurfaceDefSchema = z.object({
  id: z.string(),
  axis: SurfaceAxisSchema,
  alignment: SurfaceAlignmentSchema,
  depth: z.number().min(0),
  fill: z.array(SurfaceFillSchema).optional(),
  seams: z.record(z.string(), z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Landmark refs
// ---------------------------------------------------------------------------

const LandmarkRefSchema: z.ZodType = z.union([
  z.string(),
  z.object({
    landmark: z.string(),
    offset: Vec3Schema,
    absolute: z.boolean().optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Rail items + containers
// ---------------------------------------------------------------------------

const RailItemDefSchema = z.object({
  targetName: z.string(),
  order: z.number(),
  width: z.number(),
  depth: z.number().optional(),
  minBounds: BoundsSchema.optional(),
  perpendicularOffset: z.number().optional(),
  yOffset: z.number().optional(),
  rotationY: z.number().optional(),
  triggerRadius: z.number().optional(),
  markerY: z.number().optional(),
});

const FacingSchema = z.union([
  z.literal('forward'),
  z.literal('inward'),
  z.literal('outward'),
  z.number(),
]);

const AlignSchema = z.enum(['center', 'start', 'end', 'justify']).optional();
const OverflowSchema = z.enum(['shrink', 'warn', 'error']).optional();

const RowDefSchema = z.object({
  id: z.string(),
  type: z.literal('row'),
  from: LandmarkRefSchema,
  to: LandmarkRefSchema,
  facing: FacingSchema,
  onSurface: z.string().optional(),
  perpendicularOffset: z.number().optional(),
  items: z.array(RailItemDefSchema),
  gap: z.number().optional(),
  align: AlignSchema,
  overflow: OverflowSchema,
});

const ColumnDefSchema = z.object({
  id: z.string(),
  type: z.literal('column'),
  from: LandmarkRefSchema,
  to: LandmarkRefSchema,
  facing: FacingSchema,
  onSurface: z.string().optional(),
  perpendicularOffset: z.number().optional(),
  items: z.array(RailItemDefSchema),
  gap: z.number().optional(),
  align: AlignSchema,
  overflow: OverflowSchema,
});

const LayoutContainerDefSchema = z.discriminatedUnion('type', [RowDefSchema, ColumnDefSchema]);

// ---------------------------------------------------------------------------
// Placement types
// ---------------------------------------------------------------------------

const PlacementCoordSchema: z.ZodType = z.union([
  z.number(),
  z.object({from: z.string(), to: z.string(), t: z.number()}),
]);

const PlacementAtArraySchema = z.tuple([PlacementCoordSchema, PlacementCoordSchema]);

const PlacementAtObjectSchema = z.object({
  x: PlacementCoordSchema,
  y: PlacementCoordSchema.optional(),
  z: PlacementCoordSchema.optional(),
});

const PlacementDefSchema = z.object({
  on: z.string(),
  at: z.union([PlacementAtArraySchema, PlacementAtObjectSchema]),
  minBounds: BoundsSchema,
  rotationY: z.number().optional(),
  triggerRadius: z.number().optional(),
  markerY: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Config hierarchy schemas
// ---------------------------------------------------------------------------

/** Level 0: Room config (surfaces only) */
export const RoomConfigSchema = z.object({
  surfaces: z.record(z.string(), SurfaceDefSchema),
  _anchors: z.record(z.string(), Vec3Schema).optional(),
});

/** Custom landmark definition */
const CustomLandmarkSchema = z.object({
  base: LandmarkRefSchema,
  offset: Vec3Schema,
  label: z.string(),
});

/** Level 1: Rails config (inherits room, adds containers) */
export const RailsConfigSchema = z.object({
  inherits: z.literal('room'),
  customLandmarks: z.record(z.string(), CustomLandmarkSchema).optional(),
  containers: z.array(LayoutContainerDefSchema),
  _anchors: z.record(z.string(), Vec3Schema).optional(),
});

/** Level 2: Placements config (inherits rails, adds placements) */
export const PlacementsConfigSchema = z.object({
  inherits: z.literal('rails'),
  placements: z.record(z.string(), PlacementDefSchema),
  _anchors: z.record(z.string(), Vec3Schema).optional(),
});

// Re-export individual schemas for unit tests
export {BoundsSchema, LayoutContainerDefSchema, PlacementDefSchema, SurfaceDefSchema, Vec3Schema};
