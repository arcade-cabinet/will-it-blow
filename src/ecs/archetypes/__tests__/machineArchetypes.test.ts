import {config} from '../../../config';
import {buildMachineArchetype} from '../buildMachineArchetype';
import type {MachineArchetype} from '../types';

const GRINDER_ARCHETYPE = buildMachineArchetype(config.machines.grinder);
const STUFFER_ARCHETYPE = buildMachineArchetype(config.machines.stuffer);
const STOVE_ARCHETYPE = buildMachineArchetype(config.machines.stove);

// ---------------------------------------------------------------------------
// Helper: collect all slot names with machineId prefix (as entity names)
// ---------------------------------------------------------------------------

function slotEntityNames(archetype: MachineArchetype): Set<string> {
  return new Set(archetype.slots.map(s => `${archetype.machineId}/${s.slotName}`));
}

/**
 * Verify that every entity name referenced in the input contract bindings
 * corresponds to an actual slot in the archetype.
 */
function validateContractBindings(archetype: MachineArchetype): string[] {
  const names = slotEntityNames(archetype);
  const contractSlot = archetype.slots.find(s => s.components.inputContract);
  if (!contractSlot) return ['No contract slot found'];

  const errors: string[] = [];
  for (const binding of contractSlot.components.inputContract!.bindings) {
    if (!names.has(binding.source.entityName)) {
      errors.push(`Source "${binding.source.entityName}" not found in slots`);
    }
    if (!names.has(binding.target.entityName)) {
      errors.push(`Target "${binding.target.entityName}" not found in slots`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// GRINDER_ARCHETYPE
// ---------------------------------------------------------------------------

describe('GRINDER_ARCHETYPE', () => {
  it('has machineId "grinder"', () => {
    expect(GRINDER_ARCHETYPE.machineId).toBe('grinder');
  });

  it('has the expected total slot count', () => {
    // 3 housing + 2 switch (body+notch) + 1 power-source
    // + 2 extra (faceplate, tray)
    // + 4 plunger (hitbox + shaft + guard + handle)
    // + 1 contract
    // = 13
    expect(GRINDER_ARCHETYPE.slots).toHaveLength(13);
  });

  describe('Tier 2 template slots', () => {
    const slotNames = GRINDER_ARCHETYPE.slots.map(s => s.slotName);

    it('includes power-source slot', () => {
      expect(slotNames).toContain('power-source');
    });

    it('includes switch-body control slot', () => {
      expect(slotNames).toContain('switch-body');
    });

    it('includes switch-notch control slot', () => {
      expect(slotNames).toContain('switch-notch');
    });

    it('power-source has type electric', () => {
      const ps = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'power-source');
      expect(ps!.components.powerSource!.type).toBe('electric');
    });
  });

  describe('housing slots have vibration', () => {
    const housingNames = ['motor-block', 'extruder', 'chute'];

    it.each(housingNames)('%s has vibration component', name => {
      const slot = GRINDER_ARCHETYPE.slots.find(s => s.slotName === name);
      expect(slot).toBeDefined();
      expect(slot!.components.vibration).toBeDefined();
      expect(slot!.components.vibration!.active).toBe(false);
    });
  });

  describe('machine-specific slots', () => {
    const slotNames = GRINDER_ARCHETYPE.slots.map(s => s.slotName);

    it('includes faceplate', () => {
      expect(slotNames).toContain('faceplate');
    });

    it('faceplate has rotation component', () => {
      const fp = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'faceplate');
      expect(fp!.components.rotation).toBeDefined();
      expect(fp!.components.rotation!.axis).toBe('y');
      expect(fp!.components.rotation!.active).toBe(false);
    });

    it('includes tray', () => {
      expect(slotNames).toContain('tray');
    });

    it('tray has isStatic tag', () => {
      const tray = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'tray');
      expect(tray!.components.isStatic).toBe(true);
    });

    it('includes plunger hitbox and parts', () => {
      expect(slotNames).toContain('plunger-hitbox');
      expect(slotNames).toContain('plunger-shaft');
      expect(slotNames).toContain('plunger-guard');
      expect(slotNames).toContain('plunger-handle');
    });

    it('plunger hitbox has plunger component', () => {
      const hitbox = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'plunger-hitbox');
      expect(hitbox!.components.plunger).toBeDefined();
      expect(hitbox!.components.plunger!.axis).toBe('y');
      expect(hitbox!.components.plunger!.springBack).toBe(true);
    });

    it('includes contract slot', () => {
      expect(slotNames).toContain('contract');
    });
  });

  describe('input contract', () => {
    it('contract has machineId "grinder"', () => {
      const contract = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.machineId).toBe('grinder');
    });

    it('has 5 bindings', () => {
      const contract = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.bindings).toHaveLength(5);
    });

    it('all binding entity names reference valid slots', () => {
      const errors = validateContractBindings(GRINDER_ARCHETYPE);
      expect(errors).toEqual([]);
    });

    it('all bindings use passthrough transform', () => {
      const contract = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      for (const binding of contract!.components.inputContract!.bindings) {
        expect(binding.transform.type).toBe('passthrough');
      }
    });
  });

  describe('findable tiers', () => {
    it('motor-block has medium-well tier', () => {
      const slot = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'motor-block');
      expect(slot!.findableTier).toBe('medium-well');
    });

    it('faceplate has medium-well tier', () => {
      const slot = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'faceplate');
      expect(slot!.findableTier).toBe('medium-well');
    });

    it('tray has well-done tier', () => {
      const slot = GRINDER_ARCHETYPE.slots.find(s => s.slotName === 'tray');
      expect(slot!.findableTier).toBe('well-done');
    });
  });
});

// ---------------------------------------------------------------------------
// STUFFER_ARCHETYPE
// ---------------------------------------------------------------------------

describe('STUFFER_ARCHETYPE', () => {
  it('has machineId "stuffer"', () => {
    expect(STUFFER_ARCHETYPE.machineId).toBe('stuffer');
  });

  it('has the expected total slot count', () => {
    // 2 housing + 2 crank (handle+arm) + 1 power-source
    // + 2 extra (plunger-disc, nozzle)
    // + 1 contract
    // = 8
    expect(STUFFER_ARCHETYPE.slots).toHaveLength(8);
  });

  describe('Tier 2 template slots', () => {
    const slotNames = STUFFER_ARCHETYPE.slots.map(s => s.slotName);

    it('includes power-source slot', () => {
      expect(slotNames).toContain('power-source');
    });

    it('includes crank-handle control slot', () => {
      expect(slotNames).toContain('crank-handle');
    });

    it('includes crank-arm slot', () => {
      expect(slotNames).toContain('crank-arm');
    });

    it('power-source has type manual', () => {
      const ps = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'power-source');
      expect(ps!.components.powerSource!.type).toBe('manual');
    });
  });

  describe('housing slots have vibration', () => {
    const housingNames = ['canister', 'spout'];

    it.each(housingNames)('%s has vibration component', name => {
      const slot = STUFFER_ARCHETYPE.slots.find(s => s.slotName === name);
      expect(slot).toBeDefined();
      expect(slot!.components.vibration).toBeDefined();
      expect(slot!.components.vibration!.amplitude).toBe(0);
      expect(slot!.components.vibration!.active).toBe(false);
    });
  });

  describe('machine-specific slots', () => {
    const slotNames = STUFFER_ARCHETYPE.slots.map(s => s.slotName);

    it('includes plunger-disc', () => {
      expect(slotNames).toContain('plunger-disc');
    });

    it('plunger-disc has fillDriven component', () => {
      const disc = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'plunger-disc');
      expect(disc!.components.fillDriven).toBeDefined();
      expect(disc!.components.fillDriven!.minY).toBe(-0.425);
      expect(disc!.components.fillDriven!.maxY).toBe(0.425);
      expect(disc!.components.fillDriven!.fillLevel).toBe(0);
    });

    it('includes nozzle', () => {
      expect(slotNames).toContain('nozzle');
    });

    it('includes contract slot', () => {
      expect(slotNames).toContain('contract');
    });
  });

  describe('crank configuration', () => {
    it('crank-handle has correct sensitivity and damping', () => {
      const handle = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'crank-handle');
      expect(handle!.components.crank!.sensitivity).toBe(0.5);
      expect(handle!.components.crank!.damping).toBe(3.0);
    });
  });

  describe('input contract', () => {
    it('contract has machineId "stuffer"', () => {
      const contract = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.machineId).toBe('stuffer');
    });

    it('has 2 bindings', () => {
      const contract = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.bindings).toHaveLength(2);
    });

    it('all binding entity names reference valid slots', () => {
      const errors = validateContractBindings(STUFFER_ARCHETYPE);
      expect(errors).toEqual([]);
    });

    it('bindings use linear transforms with clamp', () => {
      const contract = STUFFER_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      for (const binding of contract!.components.inputContract!.bindings) {
        expect(binding.transform.type).toBe('linear');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// STOVE_ARCHETYPE
// ---------------------------------------------------------------------------

describe('STOVE_ARCHETYPE', () => {
  it('has machineId "stove"', () => {
    expect(STOVE_ARCHETYPE.machineId).toBe('stove');
  });

  it('has the expected total slot count', () => {
    // 2 housing + 1 dial body + 1 burner + 1 power-source
    // + 2 extra (pan-body, pan-handle)
    // + 1 contract
    // = 8
    expect(STOVE_ARCHETYPE.slots).toHaveLength(8);
  });

  describe('Tier 2 template slots', () => {
    const slotNames = STOVE_ARCHETYPE.slots.map(s => s.slotName);

    it('includes power-source slot', () => {
      expect(slotNames).toContain('power-source');
    });

    it('includes heat-control-body dial slot', () => {
      expect(slotNames).toContain('heat-control-body');
    });

    it('includes burner slot', () => {
      expect(slotNames).toContain('burner');
    });

    it('power-source has type gas', () => {
      const ps = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'power-source');
      expect(ps!.components.powerSource!.type).toBe('gas');
    });
  });

  describe('housing slots do NOT have vibration', () => {
    const housingNames = ['stovetop', 'grate'];

    it.each(housingNames)('%s has no vibration component', name => {
      const slot = STOVE_ARCHETYPE.slots.find(s => s.slotName === name);
      expect(slot).toBeDefined();
      expect(slot!.components.vibration).toBeUndefined();
    });
  });

  describe('machine-specific slots', () => {
    const slotNames = STOVE_ARCHETYPE.slots.map(s => s.slotName);

    it('includes stovetop', () => {
      expect(slotNames).toContain('stovetop');
    });

    it('stovetop has isStatic tag', () => {
      const slot = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'stovetop');
      expect(slot!.components.isStatic).toBe(true);
    });

    it('includes grate', () => {
      expect(slotNames).toContain('grate');
    });

    it('includes pan-body', () => {
      expect(slotNames).toContain('pan-body');
    });

    it('pan-body has findable tier medium', () => {
      const slot = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'pan-body');
      expect(slot!.findableTier).toBe('medium');
    });

    it('includes pan-handle', () => {
      expect(slotNames).toContain('pan-handle');
    });

    it('includes contract slot', () => {
      expect(slotNames).toContain('contract');
    });
  });

  describe('dial configuration', () => {
    it('dial has 4 segments [off, low, medium, high]', () => {
      const dial = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'heat-control-body');
      expect(dial!.components.dial!.segments).toEqual(['off', 'low', 'medium', 'high']);
    });

    it('dial wraps', () => {
      const dial = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'heat-control-body');
      expect(dial!.components.dial!.wraps).toBe(true);
    });
  });

  describe('burner slot', () => {
    it('burner has torus geometry', () => {
      const burner = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'burner');
      expect(burner!.components.geometry!.type).toBe('torus');
    });

    it('burner has dark ember color', () => {
      const burner = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'burner');
      expect(burner!.components.material!.color).toBe(0x3d0d05);
    });
  });

  describe('input contract', () => {
    it('contract has machineId "stove"', () => {
      const contract = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.machineId).toBe('stove');
    });

    it('has 2 bindings', () => {
      const contract = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.bindings).toHaveLength(2);
    });

    it('all binding entity names reference valid slots', () => {
      const errors = validateContractBindings(STOVE_ARCHETYPE);
      expect(errors).toEqual([]);
    });

    it('first binding uses segmentMap transform', () => {
      const contract = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.bindings[0].transform.type).toBe('segmentMap');
    });

    it('second binding uses threshold transform', () => {
      const contract = STOVE_ARCHETYPE.slots.find(s => s.slotName === 'contract');
      expect(contract!.components.inputContract!.bindings[1].transform.type).toBe('threshold');
    });
  });
});

// ---------------------------------------------------------------------------
// FLUORESCENT_PANEL_ARCHETYPE (lightBox tube expansion)
// ---------------------------------------------------------------------------

const PANEL_ARCHETYPE = buildMachineArchetype(config.machines['fluorescent-panel']);

describe('FLUORESCENT_PANEL_ARCHETYPE', () => {
  it('has machineId "fluorescent-panel"', () => {
    expect(PANEL_ARCHETYPE.machineId).toBe('fluorescent-panel');
  });

  it('expands lightBox tubes from fractions', () => {
    const slotNames = PANEL_ARCHETYPE.slots.map(s => s.slotName);
    expect(slotNames).toContain('tube-0');
    expect(slotNames).toContain('tube-1');
    expect(slotNames).toContain('endcap-0-left');
    expect(slotNames).toContain('endcap-0-right');
    expect(slotNames).toContain('endcap-1-left');
    expect(slotNames).toContain('endcap-1-right');
  });

  it('tube positions computed from depth fractions (25%, 75%)', () => {
    const tube0 = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'tube-0');
    const tube1 = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'tube-1');
    const _depth = 0.46;
    // fraction 0.25 → z = (0.25 - 0.5) * 0.46 = -0.115
    expect(tube0!.components.transform!.position[2]).toBeCloseTo(-0.115, 3);
    // fraction 0.75 → z = (0.75 - 0.5) * 0.46 = 0.115
    expect(tube1!.components.transform!.position[2]).toBeCloseTo(0.115, 3);
  });

  it('tube length computed from box width minus inset', () => {
    const tube0 = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'tube-0');
    const expectedLength = 1.36 * (1 - 2 * 0.05); // 1.224
    // cylinder args: [radiusTop, radiusBottom, height, segments]
    expect(tube0!.components.geometry!.args[2]).toBeCloseTo(expectedLength, 3);
  });

  it('endcaps positioned at tube ends', () => {
    const ecLeft = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'endcap-0-left');
    const ecRight = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'endcap-0-right');
    const halfTube = (1.36 * (1 - 2 * 0.05)) / 2;
    expect(ecLeft!.components.transform!.position[0]).toBeCloseTo(-halfTube, 3);
    expect(ecRight!.components.transform!.position[0]).toBeCloseTo(halfTube, 3);
  });

  it('tube material has emissive properties', () => {
    const tube0 = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'tube-0');
    expect(tube0!.components.material!.emissive).toBe('#e6ffe0');
    expect(tube0!.components.material!.emissiveIntensity).toBe(2.5);
  });

  it('has housing diffuser and downlight extra', () => {
    const slotNames = PANEL_ARCHETYPE.slots.map(s => s.slotName);
    expect(slotNames).toContain('diffuser');
    expect(slotNames).toContain('downlight');
  });

  it('downlight has flicker behavior', () => {
    const dl = PANEL_ARCHETYPE.slots.find(s => s.slotName === 'downlight');
    expect(dl!.components.flicker).toBeDefined();
    expect(dl!.components.flicker!.active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-archetype: unique slot names within each machine
// ---------------------------------------------------------------------------

describe('cross-archetype validation', () => {
  const archetypes: MachineArchetype[] = [GRINDER_ARCHETYPE, STUFFER_ARCHETYPE, STOVE_ARCHETYPE];

  it.each(
    archetypes.map(a => [a.machineId, a] as const),
  )('%s has no duplicate slot names', (_id, archetype) => {
    const names = archetype.slots.map(s => s.slotName);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it.each(
    archetypes.map(a => [a.machineId, a] as const),
  )('%s has exactly one contract slot', (_id, archetype) => {
    const contracts = archetype.slots.filter(s => s.components.inputContract);
    expect(contracts).toHaveLength(1);
  });

  it.each(
    archetypes.map(a => [a.machineId, a] as const),
  )('%s has exactly one power-source slot', (_id, archetype) => {
    const sources = archetype.slots.filter(s => s.components.powerSource);
    expect(sources).toHaveLength(1);
  });
});
