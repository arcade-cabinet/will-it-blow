import {GRINDER_ARCHETYPE} from '../../archetypes/grinderArchetype';
import {despawnMachine, spawnMachine} from '../../archetypes/spawnMachine';
import type {Entity} from '../../types';
import {world} from '../../world';

describe('GrinderOrchestrator — ECS lifecycle', () => {
  let entities: Entity[];

  beforeEach(() => {
    entities = spawnMachine(GRINDER_ARCHETYPE);
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
        expect(entity.name).toMatch(/^grinder\//);
      }
    });

    it('all entities have machineId "grinder"', () => {
      for (const entity of entities) {
        expect(entity.machineSlot?.machineId).toBe('grinder');
      }
    });
  });
});
