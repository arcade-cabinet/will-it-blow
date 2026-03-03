/**
 * @module layout/types
 * Type definitions for the seam-based anchor layout system.
 *
 * Spatial hierarchy:
 *   Surfaces (depth=0) → surface anchors (9 per surface)
 *   Objects (depth>0) → object anchors (from bounding box)
 *   Rails → Containers → Items (unchanged)
 *
 * Surfaces define room boundaries (walls, floor, ceiling). Objects are
 * placed via surface-relative percentages or anchor-to-anchor interpolation.
 * Placed objects auto-generate their own anchors, enabling cascading
 * placement (e.g. bowl on counter's top-center).
 */

/** Named reference point from room geometry. Convention: "back-left:floor" */
export interface Landmark {
  position: [number, number, number];
  label: string;
}

/**
 * Ref to a landmark: bare string or { landmark, offset }.
 *
 * Offsets are FRACTIONAL by default — multiplied by room dimensions
 * [w, h, d] during resolution. This ensures responsive scaling.
 * Use `absolute: true` for fixed-size offsets (human-scale heights,
 * machine-relative offsets that shouldn't scale with room size).
 */
export type LandmarkRef =
  | string
  | {landmark: string; offset: [number, number, number]; absolute?: boolean};

/** Tier 1: invisible line segment between two landmarks */
export interface RailDef {
  id: string;
  from: LandmarkRef;
  to: LandmarkRef;
  facing: 'forward' | 'inward' | 'outward' | number;
  perpendicularOffset?: number;
}

/** Resolved rail with computed world-space geometry */
export interface ResolvedRail {
  id: string;
  worldFrom: [number, number, number];
  worldTo: [number, number, number];
  direction: [number, number, number];
  length: number;
  childRotationY: number;
  perpendicular: [number, number, number];
  perpendicularOffset: number;
}

/** Item placed on a rail at an ordered position */
export interface RailItemDef {
  targetName: string;
  order: number;
  width: number;
  depth?: number;
  /** Full 3D bounding box [width, height, depth]. When present, used for adhesion offset and anchor generation. */
  minBounds?: Bounds;
  perpendicularOffset?: number;
  yOffset?: number;
  rotationY?: number;
  triggerRadius?: number;
  markerY?: number;
}

/** Resolved item position (backward-compatible with Target) */
export interface ResolvedRailItem {
  targetName: string;
  position: [number, number, number];
  rotationY: number;
  triggerRadius: number;
  markerY?: number;
  railId: string;
  railParameter: number;
}

/** Tier 2: Row = horizontal auto-distributing rail */
export interface RowDef extends RailDef {
  type: 'row';
  /** Surface this rail is placed on. When set, items auto-adhere to this surface via minBounds. */
  onSurface?: string;
  items: RailItemDef[];
  gap?: number;
  align?: 'center' | 'start' | 'end' | 'justify';
  overflow?: 'shrink' | 'warn' | 'error';
}

/** Tier 2: Column = vertical auto-distributing rail */
export interface ColumnDef extends RailDef {
  type: 'column';
  /** Surface this rail is placed on. When set, items auto-adhere to this surface via minBounds. */
  onSurface?: string;
  items: RailItemDef[];
  gap?: number;
  align?: 'center' | 'start' | 'end' | 'justify';
  overflow?: 'shrink' | 'warn' | 'error';
}

export type LayoutContainerDef = RowDef | ColumnDef;

// ---------------------------------------------------------------------------
// Seam-based anchor system types
// ---------------------------------------------------------------------------

/** Surface coordinate system orientation: xz for floor/ceiling, xy for walls */
export type SurfaceAxis = 'xz' | 'xy';

/** Whether a surface is vertical (walls) or horizontal (floor/ceiling) */
export type SurfaceAlignment = 'vertical' | 'horizontal';

/** Texture fill instruction for a surface */
export interface SurfaceFill {
  /** ambientCG texture ID (e.g. "Tiles074") */
  material: string;
  /** Coverage fraction 0-1 */
  coverage: number;
  /** UV tiling [x, y] */
  tiling?: [number, number];
}

/**
 * Room surface definition — generates 9 auto-anchors (4 corners + 4 edge midpoints + 1 center).
 *
 * Surfaces are depth=0 (flat planes). Objects placed on surfaces have depth>0
 * and auto-generate 6-face anchors from their minBounds.
 */
export interface SurfaceDef {
  id: string;
  axis: SurfaceAxis;
  /** Whether this surface is vertical (wall) or horizontal (floor/ceiling) */
  alignment: SurfaceAlignment;
  /** Depth in world units. 0 for room surfaces, >0 for 3D objects. */
  depth: number;
  /** Texture fill instructions for rendering */
  fill?: SurfaceFill[];
  /** Named seam connections to adjacent surfaces, e.g. "top": "ceiling:left" */
  seams?: Record<string, string>;
}

/** Min bounding box [width, height, depth] for responsive scaling */
export type Bounds = [number, number, number];

/**
 * A placement coordinate: either a simple fraction (0-1) or an
 * interpolation between two named anchors.
 */
export type PlacementCoord = number | {from: string; to: string; t: number};

/**
 * Surface-relative placement definition.
 *
 * **Adhesion** is auto-computed: the object center is offset from the
 * surface along the surface's inward normal by half the `minBounds`
 * extent in that direction. A fridge on `left-wall` with
 * `minBounds: [0.8, 2.0, 0.8]` → center offset +x by 0.4 (half width).
 * The fridge's back panel sits flush against the wall.
 */
export interface PlacementDef {
  /** Parent surface or object ID */
  on: string;
  /**
   * Position as [coord, coord] (surface UV fractions) or { x, y?, z? }
   * (anchor-interpolation for complex positioning).
   *
   * For walls (xy axis): [u-fraction along wall, y-fraction of height]
   * For floor/ceiling (xz axis): [x-fraction of width, z-fraction of depth]
   */
  at:
    | [PlacementCoord, PlacementCoord]
    | {x: PlacementCoord; y?: PlacementCoord; z?: PlacementCoord};
  /**
   * Minimum 3D bounding box [width, height, depth].
   * Defines the minimum space the object occupies.
   * Used for:
   * - Adhesion offset (half-extent along surface normal)
   * - Object anchor generation (face centers, corners, midpoints)
   * - Responsive viewport scaling baseline
   */
  minBounds: Bounds;
  /** Additional in-plane rotation (radians). Added to surface-derived base rotation. */
  rotationY?: number;
  triggerRadius?: number;
  markerY?: number;
}

/** Complete layout config for a room (merged from hierarchy) */
export interface LayoutConfig {
  surfaces: Record<string, SurfaceDef>;
  customLandmarks?: Record<
    string,
    {base: LandmarkRef; offset: [number, number, number]; label: string}
  >;
  containers: LayoutContainerDef[];
  placements: Record<string, PlacementDef>;
}

// ---------------------------------------------------------------------------
// Hierarchical config types — each level inherits from the previous
// ---------------------------------------------------------------------------

/** Level 0: Room surfaces with auto-generated anchors */
export interface RoomConfig {
  surfaces: Record<string, SurfaceDef>;
  /** Auto-computed by gen:anchors — surface corner + midpoint + center anchors */
  _anchors?: Record<string, [number, number, number]>;
}

/** Level 1: Rails that inherit room surfaces and define containers */
export interface RailsConfig {
  inherits: string;
  customLandmarks?: Record<
    string,
    {base: LandmarkRef; offset: [number, number, number]; label: string}
  >;
  containers: LayoutContainerDef[];
  /** Auto-computed by gen:anchors — rail endpoint + item anchors */
  _anchors?: Record<string, [number, number, number]>;
}

/** Level 2: Placements that inherit room + rails and define object positions */
export interface PlacementsConfig {
  inherits: string;
  placements: Record<string, PlacementDef>;
  /** Auto-computed by gen:anchors — placed object anchors */
  _anchors?: Record<string, [number, number, number]>;
}
