import type {LightBoxDef, MachineConfig} from '../../config/types';
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
 * Supports lightDef for point lights and flicker for animated light behavior.
 */
function extrasToSlots(extras: MachineConfig['extras']): SlotDefinition[] {
  return extras.map(e => {
    const flickerBehavior = e.behaviors?.flicker;
    return {
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
        lightDef: e.lightDef,
        flicker: flickerBehavior
          ? {
              baseIntensity: e.lightDef?.intensity ?? 1,
              dimIntensity: flickerBehavior.dimIntensity,
              intervalMin: flickerBehavior.intervalMin,
              intervalMax: flickerBehavior.intervalMax,
              duration: flickerBehavior.duration,
              active: true,
              nextAt: flickerBehavior.intervalMin + Math.random() * flickerBehavior.intervalMax,
              endAt: 0,
              flickering: false,
            }
          : undefined,
      },
    };
  });
}

/**
 * Expand contract binding defs (compact targets array) into individual
 * InputBinding entries and return a single contract SlotDefinition.
 */
function contractToSlot(
  machineId: MachineId,
  contractDefs: NonNullable<MachineConfig['contract']>,
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
 * Expand a lightBox config into concrete tube + endcap SlotDefinitions.
 * Tube positions are computed from box fractions — not hardcoded.
 *
 * Each tube: cylinder at depthFraction of box depth, length = box width minus inset.
 * Each endcap: small cylinder at each end of the tube.
 */
function expandLightBoxTubes(lightBox: LightBoxDef): SlotDefinition[] {
  const {width, depth, tubeLayout: tl} = lightBox;
  const tubeLength = width * (1 - 2 * tl.wallInsetFraction);
  const halfTube = tubeLength / 2;
  const slots: SlotDefinition[] = [];

  for (let i = 0; i < tl.count; i++) {
    const fraction = tl.depthFractions[i];
    // Map fraction 0-1 to Z position: 0 = -depth/2, 1 = +depth/2
    const z = (fraction - 0.5) * depth;

    // Tube cylinder (rotated 90° on Z to run along X)
    slots.push({
      slotName: `tube-${i}`,
      components: {
        geometry: {type: 'cylinder', args: [tl.radius, tl.radius, tubeLength, 8]},
        material: tl.material,
        transform: {
          position: [0, tl.yOffset, z],
          rotation: [0, 0, 1.5708],
          scale: [1, 1, 1],
        },
      },
    });

    // Left endcap
    slots.push({
      slotName: `endcap-${i}-left`,
      components: {
        geometry: {type: 'cylinder', args: [tl.endcapRadius, tl.endcapRadius, tl.endcapLength, 6]},
        material: tl.endcapMaterial,
        transform: {
          position: [-halfTube, tl.yOffset, z],
          rotation: [0, 0, 1.5708],
          scale: [1, 1, 1],
        },
      },
    });

    // Right endcap
    slots.push({
      slotName: `endcap-${i}-right`,
      components: {
        geometry: {type: 'cylinder', args: [tl.endcapRadius, tl.endcapRadius, tl.endcapLength, 6]},
        material: tl.endcapMaterial,
        transform: {
          position: [halfTube, tl.yOffset, z],
          rotation: [0, 0, 1.5708],
          scale: [1, 1, 1],
        },
      },
    });
  }

  return slots;
}

/**
 * Build a MachineArchetype from a JSON MachineConfig.
 *
 * All templates support optional control, contract, and vibration.
 * A 'bare' machine is just housing + extras — no template-specific
 * composition. Any machine can gain controls or state-driven behaviors
 * later without changing template type.
 */
export function buildMachineArchetype(cfg: MachineConfig): MachineArchetype {
  const housing = housingToSlots(cfg.housing);
  let templateSlots: SlotDefinition[];

  if (cfg.template === 'bare') {
    // Bare: housing only — no template-specific composition
    templateSlots = housing;
  } else if (cfg.template === 'powered') {
    templateSlots = poweredMachineSlots({
      housing,
      controlType: cfg.control!.type as 'switch' | 'dial',
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
  const contractSlots =
    cfg.contract && cfg.contract.length > 0
      ? [contractToSlot(cfg.machineId as MachineId, cfg.contract)]
      : [];
  const lightBoxSlots = cfg.lightBox ? expandLightBoxTubes(cfg.lightBox) : [];

  return {
    machineId: cfg.machineId as MachineId,
    slots: [
      ...templateSlots,
      ...extraSlots,
      ...plungerSlotDefs,
      ...contractSlots,
      ...lightBoxSlots,
    ],
  };
}
