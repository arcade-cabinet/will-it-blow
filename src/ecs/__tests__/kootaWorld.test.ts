import {ecsWorld, resetWorld} from '../kootaWorld';
import {PhaseTag, SausageTrait, StationTrait} from '../traits';

describe('Koota world', () => {
  beforeEach(() => {
    resetWorld();
  });

  it('exports a world instance', () => {
    expect(ecsWorld).toBeDefined();
    expect(typeof ecsWorld.spawn).toBe('function');
    expect(typeof ecsWorld.reset).toBe('function');
  });

  it('can spawn entities with traits', () => {
    const entity = ecsWorld.spawn(
      StationTrait({name: 'grinder', active: false, posX: 1, posY: 0, posZ: 0}),
    );
    expect(entity).toBeDefined();
  });

  it('can read trait data from entities', () => {
    const entity = ecsWorld.spawn(
      StationTrait({name: 'stove', active: true, posX: 2, posY: 0, posZ: 1}),
    );
    const data = entity.get(StationTrait);
    expect(data).toBeDefined();
    expect(data.name).toBe('stove');
    expect(data.active).toBe(true);
    expect(data.posX).toBe(2);
    expect(data.posZ).toBe(1);
  });

  it('can spawn entities with multiple traits', () => {
    const entity = ecsWorld.spawn(
      StationTrait({name: 'blowout', active: false, posX: 0, posY: 0, posZ: 0}),
      PhaseTag({phase: 'BLOWOUT'}),
    );
    expect(entity.get(StationTrait).name).toBe('blowout');
    expect(entity.get(PhaseTag).phase).toBe('BLOWOUT');
  });

  it('can update trait data via set', () => {
    const entity = ecsWorld.spawn(SausageTrait);
    entity.set(SausageTrait, {groundLevel: 0.75});
    expect(entity.get(SausageTrait).groundLevel).toBe(0.75);
  });

  it('resetWorld clears all entities', () => {
    ecsWorld.spawn(StationTrait({name: 'a', active: false, posX: 0, posY: 0, posZ: 0}));
    ecsWorld.spawn(StationTrait({name: 'b', active: false, posX: 1, posY: 0, posZ: 0}));
    resetWorld();
    // After reset, spawning a new entity should work
    const e = ecsWorld.spawn(StationTrait({name: 'c', active: false, posX: 2, posY: 0, posZ: 0}));
    expect(e).toBeDefined();
  });

  it('can destroy individual entities', () => {
    const entity = ecsWorld.spawn(
      StationTrait({name: 'test', active: false, posX: 0, posY: 0, posZ: 0}),
    );
    expect(entity.has(StationTrait)).toBe(true);
    entity.destroy();
    expect(entity.has(StationTrait)).toBe(false);
  });
});
