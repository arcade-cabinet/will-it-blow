import type {MachineConfig} from '../../config/types';
import type {MachineId} from '../types';
import type {CrankConfig, DialConfig, SwitchConfig} from './primitives';
import {plungerSlots} from './primitives';
import {heatMachineSlots, mechanicalMachineSlots, poweredMachineSlots} from './templates';
import type {MachineArchetype, SlotDefinition} from './types';

/**
 * Convert a HousingComponentDef[] from JSON config into SlotDefinition[].
 */
function housingToSlots(housing: MachineConfig['housing']): SlotDefinition[] {
  return housing.map(h => ({
    slotName: h.slot,
    findableTier: h.findableTier,
    components: {
      geometry: {type: h.geometry.type, args: h.geometry.args},
      material: h.material,
      transform: {
        position: h.position,
        rotation: h.rotation ?? [0, 0, 0],
        scale: [1, 1, 1] as [number, number, number],
      },
      ...(h.isStatic ? {isStatic: true as const} : {}),
    },
  }));
}

/**
 * Convert config extras into SlotDefinitions with optional behaviors.
 */
function extrasToSlots(extras: MachineConfig['extras']): SlotDefinition[] {
  return extras.map(e => ({
    slotName: e.slot,
    findableTier: e.findableTier,
    components: {
      geometry: {type: e.geometry.type, args: e.geometry.args},
      material: e.material,
      transform: {
        position: e.position,
        rotation: e.rotation ?? [0, 0, 0],
        scale: [1, 1, 1] as [number, number, number],
      },
      ...(e.isStatic ? {isStatic: true as const} : {}),
      rotation: e.behaviors?.rotation
        ? {axis: e.behaviors.rotation.axis, speed: e.behaviors.rotation.speed, active: false}
        : undefined,
      fillDriven: e.behaviors?.fillDriven,
    },
  }));
}

/**
 * Expand contract binding defs (compact targets array) into individual
 * InputBinding entries and return a single contract SlotDefinition.
 */
function contractToSlot(
  machineId: MachineId,
  contractDefs: MachineConfig['contract'],
): SlotDefinition {
  const bindings = contractDefs.flatMap(def =>
    def.targets.map(t => ({
      source: {entityName: `${machineId}/${def.source.entity}`, field: def.source.field},
      target: {entityName: `${machineId}/${t.entity}`, field: t.field},
      transform: def.transform,
    })),
  );

  return {
    slotName: 'contract',
    components: {
      inputContract: {machineId, bindings},
    },
  };
}

/**
 * Build a MachineArchetype from a JSON MachineConfig.
 *
 * Delegates to the same Tier 1 primitives and Tier 2 templates
 * that the old hardcoded archetype files used.
 */
export function buildMachineArchetype(cfg: MachineConfig): MachineArchetype {
  const housing = housingToSlots(cfg.housing);
  let templateSlots: SlotDefinition[];

  if (cfg.template === 'powered') {
    templateSlots = poweredMachineSlots({
      housing,
      controlType: cfg.control.type as 'switch' | 'dial',
      controlConfig: cfg.control as SwitchConfig | DialConfig,
      vibrationWhenPowered: cfg.vibration!,
    });
  } else if (cfg.template === 'mechanical') {
    templateSlots = mechanicalMachineSlots({
      housing,
      crankConfig: cfg.control as unknown as CrankConfig,
      vibrationProportional: cfg.mechanicalVibration!,
    });
  } else {
    templateSlots = heatMachineSlots({
      housing,
      dialConfig: cfg.control as unknown as DialConfig,
      burner: cfg.burner!,
    });
  }

  const extraSlots = extrasToSlots(cfg.extras);
  const plungerSlotDefs = cfg.plunger
    ? plungerSlots({
        prefix: cfg.plunger.prefix,
        position: cfg.plunger.position,
        axis: cfg.plunger.axis,
        minWorld: cfg.plunger.minWorld,
        maxWorld: cfg.plunger.maxWorld,
        sensitivity: cfg.plunger.sensitivity,
        springBack: cfg.plunger.springBack,
        hitboxGeometry: cfg.plunger.hitbox,
        parts: cfg.plunger.parts,
      })
    : [];
  const contractSlot = contractToSlot(cfg.machineId as MachineId, cfg.contract);

  return {
    machineId: cfg.machineId as MachineId,
    slots: [...templateSlots, ...extraSlots, ...plungerSlotDefs, contractSlot],
  };
}
