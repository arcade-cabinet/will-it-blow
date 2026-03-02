import type {Entity, MachineId} from '../types';

export interface SlotDefinition {
  slotName: string;
  removable?: boolean;
  findableTier?: string;
  components: Omit<Entity, 'machineSlot' | 'three' | 'name'>;
}

export interface MachineArchetype {
  machineId: MachineId;
  slots: SlotDefinition[];
}
