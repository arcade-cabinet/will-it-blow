/**
 * @module InputRenderer
 *
 * Wires R3F pointer events to ECS input primitive components.
 *
 * Instead of a separate system that attaches events via useEffect,
 * orchestrators use `MachineEntityMesh` to render their machine entities
 * with automatic input wiring based on which input components are present.
 *
 * Supported input primitives:
 * - dial / toggle / button: onClick sets pendingTap = true
 * - crank: drag events set isDragging + dragDelta (vertical movement)
 * - plunger: drag events set isDragging + dragDelta (axis-dependent)
 */

import type {ThreeEvent} from '@react-three/fiber';
import type {Entity} from '../types';
import {GeometryElement, MaterialElement} from './MeshRenderer';

// ---------------------------------------------------------------------------
// Handler builder — exported for testability
// ---------------------------------------------------------------------------

export interface InputHandlers {
  onClick: ((e: ThreeEvent<MouseEvent>) => void) | undefined;
  onPointerDown: ((e: ThreeEvent<PointerEvent>) => void) | undefined;
  onPointerMove: ((e: ThreeEvent<PointerEvent>) => void) | undefined;
  onPointerUp: ((e: ThreeEvent<PointerEvent>) => void) | undefined;
}

/**
 * Build R3F event handlers for an entity based on its input primitive components.
 *
 * Returns `undefined` for any handler slot that has no matching input component,
 * so R3F doesn't register unnecessary listeners.
 */
export function buildInputHandlers(entity: Entity): InputHandlers {
  const hasTap = !!(entity.dial || entity.toggle || entity.button);
  const hasDrag = !!(entity.crank || entity.plunger);

  // ----- onClick: tap-based inputs -----
  const onClick = hasTap
    ? (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (entity.dial?.enabled) entity.dial.pendingTap = true;
        if (entity.toggle?.enabled) entity.toggle.pendingTap = true;
        if (entity.button?.enabled) entity.button.pendingTap = true;
      }
    : undefined;

  // ----- onPointerDown: drag-based inputs -----
  const onPointerDown = hasDrag
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (entity.crank?.enabled) {
          entity.crank.isDragging = true;
          entity.crank.dragDelta = 0;
        }
        if (entity.plunger?.enabled) {
          entity.plunger.isDragging = true;
          entity.plunger.dragDelta = 0;
        }
      }
    : undefined;

  // ----- onPointerMove: drag delta accumulation -----
  const onPointerMove = hasDrag
    ? (e: ThreeEvent<PointerEvent>) => {
        if (entity.crank?.isDragging) {
          e.stopPropagation();
          entity.crank.dragDelta = e.nativeEvent.movementY;
        }
        if (entity.plunger?.isDragging) {
          e.stopPropagation();
          const axis = entity.plunger.axis;
          entity.plunger.dragDelta =
            axis === 'y' ? e.nativeEvent.movementY : e.nativeEvent.movementX;
        }
      }
    : undefined;

  // ----- onPointerUp: end drag -----
  const onPointerUp = hasDrag
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (entity.crank) entity.crank.isDragging = false;
        if (entity.plunger) entity.plunger.isDragging = false;
      }
    : undefined;

  return {onClick, onPointerDown, onPointerMove, onPointerUp};
}

// ---------------------------------------------------------------------------
// MachineEntityMesh — renders a single ECS entity with input event wiring
// ---------------------------------------------------------------------------

interface MachineEntityMeshProps {
  entity: Entity;
  children?: React.ReactNode;
}

/**
 * Renders a single ECS entity as a mesh with input event handlers.
 *
 * Orchestrators use this to render their machine entities instead of
 * raw <mesh> elements, getting automatic input wiring for free.
 *
 * Usage in orchestrators:
 *   <MachineEntityMesh entity={entity} />
 */
export function MachineEntityMesh({entity, children}: MachineEntityMeshProps) {
  const {onClick, onPointerDown, onPointerMove, onPointerUp} = buildInputHandlers(entity);

  return (
    <mesh
      ref={obj => {
        if (obj) entity.three = obj;
      }}
      position={entity.transform?.position}
      rotation={entity.transform?.rotation}
      scale={entity.transform?.scale}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {entity.geometry && <GeometryElement def={entity.geometry} />}
      {entity.material && <MaterialElement def={entity.material} />}
      {children}
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// MachineEntitiesRenderer — batch render for orchestrators
// ---------------------------------------------------------------------------

/**
 * Renders all machine entities that have standard mesh geometry (non-lathe).
 * Orchestrators can use this in their render for a one-liner ECS entity render.
 */
export function MachineEntitiesRenderer({entities}: {entities: Entity[]}) {
  return (
    <>
      {entities.map((entity, i) => {
        if (!entity.geometry || !entity.material || !entity.transform) return null;
        if (entity.geometry.type === 'lathe') return null;
        return <MachineEntityMesh key={entity.name ?? i} entity={entity} />;
      })}
    </>
  );
}
