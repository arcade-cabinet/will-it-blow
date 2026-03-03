import {despawnMachine, spawnMachine} from '../src/ecs/archetypes/spawnMachine';
import type {MachineArchetype} from '../src/ecs/archetypes/types';
import {world} from '../src/ecs/world';

const testArchetype: MachineArchetype = {
  machineId: 'grinder',
  slots: [
    {
      slotName: 'body',
      components: {
        geometry: {type: 'box', args: [1, 2, 1]},
        material: {type: 'standard', color: 0x888888, roughness: 0.5},
        transform: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        isStatic: true,
      },
    },
    {
      slotName: 'handle',
      removable: true,
      findableTier: 'common',
      components: {
        geometry: {type: 'cylinder', args: [0.1, 0.1, 0.5]},
        material: {type: 'standard', color: 0x444444, metalness: 0.9},
        transform: {
          position: [0.5, 2, 0],
          rotation: [0, 0, Math.PI / 4],
          scale: [1, 1, 1],
        },
        rotation: {axis: 'z', speed: 2, active: false},
      },
    },
    {
      slotName: 'hopper',
      components: {
        geometry: {type: 'cone', args: [0.8, 1, 16]},
        material: {type: 'standard', color: 0xaaaaaa},
        transform: {
          position: [0, 3, 0],
          rotation: [Math.PI, 0, 0],
          scale: [1, 1, 1],
        },
      },
    },
  ],
};

function clearWorld() {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
}

beforeEach(() => {
  clearWorld();
});

describe('spawnMachine', () => {
  it('creates the correct number of entities', () => {
    const entities = spawnMachine(testArchetype);
    expect(entities).toHaveLength(3);
    expect(world.entities).toHaveLength(3);
  });

  it('assigns correct names from machineId and slotName', () => {
    const entities = spawnMachine(testArchetype);
    expect(entities[0].name).toMatch(/^grinder#\d+\/body$/);
    expect(entities[1].name).toMatch(/^grinder#\d+\/handle$/);
    expect(entities[2].name).toMatch(/^grinder#\d+\/hopper$/);
  });

  it('assigns machineSlot with correct machineId and slotName', () => {
    const entities = spawnMachine(testArchetype);
    expect(entities[0].machineSlot).toEqual({
      machineId: 'grinder',
      slotName: 'body',
      removable: undefined,
      findableTier: undefined,
    });
    expect(entities[1].machineSlot).toEqual({
      machineId: 'grinder',
      slotName: 'handle',
      removable: true,
      findableTier: 'common',
    });
  });

  it('copies component data from slot definitions', () => {
    const entities = spawnMachine(testArchetype);
    expect(entities[0].geometry).toEqual({type: 'box', args: [1, 2, 1]});
    expect(entities[0].material?.color).toBe(0x888888);
    expect(entities[0].isStatic).toBe(true);
    expect(entities[1].rotation).toEqual({
      axis: 'z',
      speed: 2,
      active: false,
    });
  });

  it('preserves slot positions as local coordinates (no world offset)', () => {
    const entities = spawnMachine(testArchetype);
    // Positions should be exactly as defined in the archetype —
    // world positioning is handled by the orchestrator's <group>
    expect(entities[0].transform?.position).toEqual([0, 1, 0]);
    expect(entities[1].transform?.position).toEqual([0.5, 2, 0]);
    expect(entities[2].transform?.position).toEqual([0, 3, 0]);
  });

  it('preserves rotation and scale from archetype', () => {
    const entities = spawnMachine(testArchetype);
    expect(entities[1].transform?.rotation).toEqual([0, 0, Math.PI / 4]);
    expect(entities[1].transform?.scale).toEqual([1, 1, 1]);
  });

  it('handles slots without transforms', () => {
    const noTransformArchetype: MachineArchetype = {
      machineId: 'stuffer',
      slots: [
        {
          slotName: 'light',
          components: {
            lightDef: {type: 'point', intensity: 1, distance: 5, color: 0xffffff},
          },
        },
      ],
    };
    const entities = spawnMachine(noTransformArchetype);
    expect(entities).toHaveLength(1);
    expect(entities[0].transform).toBeUndefined();
    expect(entities[0].lightDef).toEqual({
      type: 'point',
      intensity: 1,
      distance: 5,
      color: 0xffffff,
    });
  });

  it('adds entities to the world', () => {
    expect(world.entities).toHaveLength(0);
    spawnMachine(testArchetype);
    expect(world.entities).toHaveLength(3);
  });
});

describe('despawnMachine', () => {
  it('removes all spawned entities from the world', () => {
    const entities = spawnMachine(testArchetype);
    expect(world.entities).toHaveLength(3);
    despawnMachine(entities);
    expect(world.entities).toHaveLength(0);
  });

  it('does not affect other entities in the world', () => {
    const otherEntity = world.add({name: 'other'});
    const entities = spawnMachine(testArchetype);
    expect(world.entities).toHaveLength(4);
    despawnMachine(entities);
    expect(world.entities).toHaveLength(1);
    expect(world.entities[0]).toBe(otherEntity);
  });

  it('handles an empty entity array', () => {
    spawnMachine(testArchetype);
    despawnMachine([]);
    expect(world.entities).toHaveLength(3);
  });
});
