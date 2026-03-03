export {
  generateObjectAnchors,
  generateSurfaceAnchors,
  getAdhesionOffset,
  getSurfaceNormal,
} from './anchors';
export {generateLandmarks, resolveLandmarkRef} from './landmarks';
export {mergeLayoutConfigs} from './mergeConfigs';
export {resolvePlacement} from './placement';
export {resolveContainer} from './resolveContainer';
export type {LayoutResult} from './resolveLayout';
export {resolveLayout} from './resolveLayout';
export {resolveRail} from './resolveRail';
export {
  PlacementsConfigSchema,
  RailsConfigSchema,
  RoomConfigSchema,
} from './schema';
export type {
  Bounds,
  ColumnDef,
  Landmark,
  LandmarkRef,
  LayoutConfig,
  LayoutContainerDef,
  PlacementCoord,
  PlacementDef,
  PlacementsConfig,
  RailDef,
  RailItemDef,
  RailsConfig,
  ResolvedRail,
  ResolvedRailItem,
  RoomConfig,
  RowDef,
  SurfaceAlignment,
  SurfaceAxis,
  SurfaceDef,
  SurfaceFill,
} from './types';
