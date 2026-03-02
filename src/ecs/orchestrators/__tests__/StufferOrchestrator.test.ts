import {config} from '../../../config';
import {buildMachineArchetype} from '../../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../../archetypes/spawnMachine';
import type {Entity} from '../../types';
import {world} from '../../world';

describe('StufferOrchestrator — ECS lifecycle', () => {
  let entities: Entity[];

  beforeEach(() => {
    entities = spawnMachine(buildMachineArchetype(config.machines.stuffer));
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

  describe('crank entity (crank-handle)', () => {
    it('exists with slotName "crank-handle"', () => {
      const crankEntity = entities.find(e => e.machineSlot?.slotName === 'crank-handle');
      expect(crankEntity).toBeDefined();
    });

    it('has crank component with angularVelocity=0 initially', () => {
      const crankEntity = entities.find(e => e.machineSlot?.slotName === 'crank-handle');
      expect(crankEntity!.crank).toBeDefined();
      expect(crankEntity!.crank!.angularVelocity).toBe(0);
    });

    it('has crank.enabled=true initially', () => {
      const crankEntity = entities.find(e => e.machineSlot?.slotName === 'crank-handle');
      expect(crankEntity!.crank!.enabled).toBe(true);
    });

    it('has crank.isDragging=false initially', () => {
      const crankEntity = entities.find(e => e.machineSlot?.slotName === 'crank-handle');
      expect(crankEntity!.crank!.isDragging).toBe(false);
    });

    it('has crank.angle=0 initially', () => {
      const crankEntity = entities.find(e => e.machineSlot?.slotName === 'crank-handle');
      expect(crankEntity!.crank!.angle).toBe(0);
    });
  });

  describe('plunger-disc entity', () => {
    it('exists with slotName "plunger-disc"', () => {
      const discEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-disc');
      expect(discEntity).toBeDefined();
    });

    it('has fillDriven component with fillLevel=0 initially', () => {
      const discEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-disc');
      expect(discEntity!.fillDriven).toBeDefined();
      expect(discEntity!.fillDriven!.fillLevel).toBe(0);
    });

    it('has fillDriven.minY and maxY set', () => {
      const discEntity = entities.find(e => e.machineSlot?.slotName === 'plunger-disc');
      expect(discEntity!.fillDriven!.minY).toBe(-0.425);
      expect(discEntity!.fillDriven!.maxY).toBe(0.425);
    });
  });

  describe('entity naming', () => {
    it('all entities have "stuffer/" prefixed names', () => {
      for (const entity of entities) {
        expect(entity.name).toMatch(/^stuffer\//);
      }
    });

    it('all entities with machineSlot have machineId "stuffer"', () => {
      for (const entity of entities) {
        if (entity.machineSlot) {
          expect(entity.machineSlot.machineId).toBe('stuffer');
        }
      }
    });
  });

  describe('housing entities', () => {
    it('canister entity exists with vibration component', () => {
      const canister = entities.find(e => e.machineSlot?.slotName === 'canister');
      expect(canister).toBeDefined();
      expect(canister!.vibration).toBeDefined();
      expect(canister!.vibration!.amplitude).toBe(0);
    });

    it('spout entity exists with vibration component', () => {
      const spout = entities.find(e => e.machineSlot?.slotName === 'spout');
      expect(spout).toBeDefined();
      expect(spout!.vibration).toBeDefined();
      expect(spout!.vibration!.amplitude).toBe(0);
    });
  });

  describe('power source entity', () => {
    it('exists with type "manual"', () => {
      const powerSource = entities.find(e => e.machineSlot?.slotName === 'power-source');
      expect(powerSource).toBeDefined();
      expect(powerSource!.powerSource).toBeDefined();
      expect(powerSource!.powerSource!.type).toBe('manual');
      expect(powerSource!.powerSource!.powerLevel).toBe(0);
    });
  });

  describe('input contract entity', () => {
    it('exists with machineId "stuffer"', () => {
      const contract = entities.find(e => e.inputContract);
      expect(contract).toBeDefined();
      expect(contract!.inputContract!.machineId).toBe('stuffer');
    });

    it('has bindings for crank -> power and crank -> vibration', () => {
      const contract = entities.find(e => e.inputContract);
      const bindings = contract!.inputContract!.bindings;
      expect(bindings).toHaveLength(2);
      expect(bindings[0].source.field).toBe('crank.angularVelocity');
      expect(bindings[1].source.field).toBe('crank.angularVelocity');
    });
  });
});
