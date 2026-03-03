import type {Entity, MachineId} from '../types';

/**
 * One slot in a machine archetype.
 *
 * All transform positions/rotations are in LOCAL coordinates —
 * relative to the furniture surface the machine sits on, not
 * world space. The orchestrator's R3F `<group>` provides the
 * world transform via the Three.js scene graph.
 */
export interface SlotDefinition {
  slotName: string;
  /** Phase 2: can be hidden for hidden-object mode */
  removable?: boolean;
  /** Phase 2: difficulty tier for finding this slot */
  findableTier?: string;
  /** Entity components for this slot (positions are LOCAL to furniture) */
  components: Omit<Entity, 'machineSlot' | 'three' | 'name'>;
}

/**
 * A machine is a named collection of slots defining a compositional
 * system (grinder, stuffer, stove) that mounts on furniture.
 *
 * Spatial model: Scene geometry → Furniture → Machine
 * - Scene geometry: walls, floor, ceiling with PBR textures
 * - Furniture: counters, shelves, wall mounts — each its own local space
 * - Machine: slots with LOCAL coordinates relative to furniture surface
 */
export interface MachineArchetype {
  machineId: MachineId;
  slots: SlotDefinition[];
}
