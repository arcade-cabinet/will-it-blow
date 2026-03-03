import {config} from '../../../config';
import {buildMachineArchetype} from '../../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../archetypes/spawnMachine';
import type {Entity} from '../../types';
import {world} from '../../world';

describe('GrinderOrchestrator — hopper tray config', () => {
  it('grinding config includes hopper chunk parameters', () => {
    const g = config.gameplay.grinding;
    expect(g.hopperChunkCount).toBeGreaterThan(0);
    expect(g.hopperTopY).toBeGreaterThan(g.hopperBottomY);
    expect(g.hopperSpreadX).toBeGreaterThan(0);
    expect(g.hopperSpreadZ).toBeGreaterThan(0);
    expect(g.hopperChunkScale).toBeGreaterThan(0);
  });

  it('grinder archetype includes tray slot', () => {
    const tray = config.machines.grinder.extras.find((e: {slot: string}) => e.slot === 'tray');
    expect(tray).toBeDefined();
    expect(tray!.position[1]).toBeCloseTo(5.6, 0);
  });

  it('hopper tray source uses ingredient decomposition colors', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrinderOrchestrator.tsx'), 'utf8');
    expect(source).toContain('hopperMats');
    expect(source).toContain('HOPPER_CHUNK_COUNT');
    expect(source).toContain('HOPPER_TOP_Y');
    expect(source).toContain('HOPPER_BOTTOM_Y');
    expect(source).toContain('hopperRefs');
  });
});

describe('GrinderOrchestrator — ECS lifecycle', () => {
  let entities: Entity[];

  beforeEach(() => {
    entities = spawnMachine(buildMachineArchetype(config.machines.grinder));
  });

  afterEach(() => {
    despawnMachine(entities);
    entities = [];
  });

  it('spawns 13 entities from archetype', () => {
    expect(entities).toHaveLength(13);
  });

  it('all spawned entities are present in the world', () => {
    for (const entity of entities) {
      expect(world.has(entity)).toBe(true);
    }
  });

  it('removes all entities from world on despawn', () => {
    // Capture references before despawn
    const refs = [...entities];
    despawnMachine(entities);
    entities = []; // prevent afterEach double-despawn

    for (const entity of refs) {
      expect(world.has(entity)).toBe(false);
    }
  });

  describe('toggle entity (switch-body)', () => {
    it('exists with slotName "switch-body"', () => {
      const switchEntity = entities.find(e => e.machineSlot?.slotName === 'switch-body');
      expect(switchEntity).toBeDefined();
    });

    it('has toggle component with isOn=false initially', () => {
      const switchEntity = entities.find(e => e.machineSlot?.slotName === 'switch-body');
      expect(switchEntity!.toggle).toBeDefined();
      expect(switchEntity!.toggle!.isOn).toBe(false);
    });

    it('has toggle.enabled=true initially', () => {
      const switchEntity = entities.find(e => e.machineSlot?.slotName === 'switch-body');
      expect(switchEntity!.toggle!.enabled).toBe(true);
    });

    it('has toggle.pendingTap=false initially', () => {
      const switchEntity = entities.find(e => e.machineSlot?.slotName === 'switch-body');
      expect(switchEntity!.toggle!.pendingTap).toBe(false);
    });
  });

  describe('plunger entity (plunger-hitbox)', () => {
    it('exists with slotName "plunger-hitbox"', () => {
      const plungerEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-hitbox');
      expect(plungerEntity).toBeDefined();
    });

    it('has plunger component with displacement=0 initially', () => {
      const plungerEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-hitbox');
      expect(plungerEntity!.plunger).toBeDefined();
      expect(plungerEntity!.plunger!.displacement).toBe(0);
    });

    it('has plunger.enabled=true initially', () => {
      const plungerEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-hitbox');
      expect(plungerEntity!.plunger!.enabled).toBe(true);
    });

    it('has plunger.axis="y"', () => {
      const plungerEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-hitbox');
      expect(plungerEntity!.plunger!.axis).toBe('y');
    });

    it('has plunger.springBack=true', () => {
      const plungerEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-hitbox');
      expect(plungerEntity!.plunger!.springBack).toBe(true);
    });
  });

  describe('entity naming', () => {
    it('all entities have "grinder/" prefixed names', () => {
      for (const entity of entities) {
        expect(entity.name).toMatch(/^grinder#\d+\//);
      }
    });

    it('all entities have machineId "grinder"', () => {
      for (const entity of entities) {
        expect(entity.machineSlot?.machineId).toBe('grinder');
      }
    });
  });
});
