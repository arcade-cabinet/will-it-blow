/**
 * Input binding types for the ECS input contract system.
 *
 * An InputBinding connects a source entity field (e.g., dial.currentIndex)
 * to a target entity field (e.g., powerSource.powerLevel) via a transform.
 */

export interface InputBinding {
  source: {entityName: string; field: string};
  target: {entityName: string; field: string};
  transform: BindingTransform;
}

export type BindingTransform =
  | {type: 'segmentMap'; map: Record<string, number | boolean>}
  | {type: 'linear'; scale: number; offset?: number; clamp?: [number, number]}
  | {
      type: 'threshold';
      value: number;
      above: number | boolean;
      below: number | boolean;
    }
  | {type: 'passthrough'};
