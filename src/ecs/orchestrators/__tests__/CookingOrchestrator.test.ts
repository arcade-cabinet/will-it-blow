import {config} from '../../../config';
import {buildMachineArchetype} from '../../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../archetypes/spawnMachine';
import type {Entity} from '../../types';
import {world} from '../../world';

describe('CookingOrchestrator — ECS lifecycle', () => {
  let entities: Entity[];

  beforeEach(() => {
    entities = spawnMachine(buildMachineArchetype(config.machines.stove));
  });

  afterEach(() => {
    despawnMachine(entities);
    entities = [];
  });

  it('spawns 8 entities from archetype', () => {
    expect(entities).toHaveLength(8);
  });

  it('all spawned entities are present in the world', () => {
    for (const entity of entities) {
      expect(world.has(entity)).toBe(true);
    }
  });

  it('removes all entities from world on despawn', () => {
    const refs = [...entities];
    despawnMachine(entities);
    entities = []; // prevent afterEach double-despawn

    for (const entity of refs) {
      expect(world.has(entity)).toBe(false);
    }
  });

  describe('dial entity (heat-control-body)', () => {
    it('exists with slotName "heat-control-body"', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity).toBeDefined();
    });

    it('has dial component with currentIndex=0 initially', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity!.dial).toBeDefined();
      expect(dialEntity!.dial!.currentIndex).toBe(0);
    });

    it('has dial.enabled=true initially', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity!.dial!.enabled).toBe(true);
    });

    it('has dial.pendingTap=false initially', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity!.dial!.pendingTap).toBe(false);
    });

    it('has segments [off, low, medium, high]', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity!.dial!.segments).toEqual(['off', 'low', 'medium', 'high']);
    });

    it('has wraps=true', () => {
      const dialEntity = entities.find(e => e.machineSlot?.slotName === 'heat-control-body');
      expect(dialEntity!.dial!.wraps).toBe(true);
    });
  });

  describe('powerSource entity (power-source)', () => {
    it('exists with slotName "power-source"', () => {
      const powerEntity = entities.find(e => e.machineSlot?.slotName === 'power-source');
      expect(powerEntity).toBeDefined();
    });

    it('has powerSource component with active=false initially', () => {
      const powerEntity = entities.find(e => e.machineSlot?.slotName === 'power-source');
      expect(powerEntity!.powerSource).toBeDefined();
      expect(powerEntity!.powerSource!.active).toBe(false);
    });

    it('has powerSource.powerLevel=0 initially', () => {
      const powerEntity = entities.find(e => e.machineSlot?.slotName === 'power-source');
      expect(powerEntity!.powerSource!.powerLevel).toBe(0);
    });

    it('has powerSource.type="gas"', () => {
      const powerEntity = entities.find(e => e.machineSlot?.slotName === 'power-source');
      expect(powerEntity!.powerSource!.type).toBe('gas');
    });
  });

  describe('entity naming', () => {
    it('all entities have "stove/" prefixed names', () => {
      for (const entity of entities) {
        expect(entity.name).toMatch(/^stove\//);
      }
    });

    it('all entities have machineId "stove"', () => {
      for (const entity of entities) {
        expect(entity.machineSlot?.machineId).toBe('stove');
      }
    });
  });
});
