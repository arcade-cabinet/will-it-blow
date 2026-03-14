import {beforeEach, describe, expect, it} from '@jest/globals';
import {gameActions} from '../actions';
import {ecsWorld, resetWorld} from '../kootaWorld';
import {
  BlowoutTrait,
  ChopperTrait,
  DemandTrait,
  GrinderTrait,
  IngredientTrait,
  PhaseTag,
  PlayerTrait,
  parseJsonArray,
  RoundTrait,
  SausageTrait,
  ScoreTrait,
  StationTrait,
  StoveTrait,
  StufferTrait,
} from '../traits';

describe('gameActions', () => {
  beforeEach(() => {
    resetWorld();
  });

  it('spawnStation creates a station entity', () => {
    const entity = gameActions(ecsWorld).spawnStation('grinder', [1, 0, 0]);
    expect(entity.has(StationTrait)).toBe(true);
    expect(entity.get(StationTrait).name).toBe('grinder');
    expect(entity.get(StationTrait).posX).toBe(1);
  });

  it('spawnSausage creates a sausage entity', () => {
    const entity = gameActions(ecsWorld).spawnSausage();
    expect(entity.has(SausageTrait)).toBe(true);
    expect(entity.get(SausageTrait).groundLevel).toBe(0);
  });

  it('spawnGrinder creates a grinder entity', () => {
    const entity = gameActions(ecsWorld).spawnGrinder();
    expect(entity.has(GrinderTrait)).toBe(true);
    expect(entity.get(GrinderTrait).grindProgress).toBe(0);
  });

  it('spawnStuffer creates a stuffer entity', () => {
    const entity = gameActions(ecsWorld).spawnStuffer();
    expect(entity.has(StufferTrait)).toBe(true);
    expect(entity.get(StufferTrait).fillLevel).toBe(0);
  });

  it('spawnStove creates a stove entity', () => {
    const entity = gameActions(ecsWorld).spawnStove();
    expect(entity.has(StoveTrait)).toBe(true);
    expect(entity.get(StoveTrait).cookProgress).toBe(0);
  });

  it('spawnChopper creates a chopper entity with default chops', () => {
    const entity = gameActions(ecsWorld).spawnChopper();
    expect(entity.has(ChopperTrait)).toBe(true);
    expect(entity.get(ChopperTrait).requiredChops).toBe(5);
    expect(entity.get(ChopperTrait).chopCount).toBe(0);
  });

  it('spawnChopper allows custom requiredChops', () => {
    const entity = gameActions(ecsWorld).spawnChopper(10);
    expect(entity.get(ChopperTrait).requiredChops).toBe(10);
  });

  it('spawnBlowout creates a blowout entity', () => {
    const entity = gameActions(ecsWorld).spawnBlowout();
    expect(entity.has(BlowoutTrait)).toBe(true);
    expect(entity.get(BlowoutTrait).burstOccurred).toBe(false);
  });

  it('spawnIngredient creates an ingredient entity', () => {
    const entity = gameActions(ecsWorld).spawnIngredient({
      id: 'banana',
      name: 'Banana',
      category: 'food',
      tasteMod: 4,
      textureMod: 2,
      blowPower: 1,
      tags: ['sweet', 'smooth'],
    });
    expect(entity.has(IngredientTrait)).toBe(true);
    expect(entity.get(IngredientTrait).id).toBe('banana');
    expect(entity.get(IngredientTrait).selected).toBe(false);
    expect(parseJsonArray<string>(entity.get(IngredientTrait).tagsJson)).toEqual([
      'sweet',
      'smooth',
    ]);
  });

  it('spawnDemand creates a demand entity', () => {
    const entity = gameActions(ecsWorld).spawnDemand(['spicy', 'meat'], ['sweet'], 'well-done');
    expect(entity.has(DemandTrait)).toBe(true);
    expect(parseJsonArray<string>(entity.get(DemandTrait).desiredTagsJson)).toEqual([
      'spicy',
      'meat',
    ]);
    expect(entity.get(DemandTrait).cookPreference).toBe('well-done');
  });

  it('spawnScore creates a score entity', () => {
    const entity = gameActions(ecsWorld).spawnScore();
    expect(entity.has(ScoreTrait)).toBe(true);
    expect(entity.get(ScoreTrait).totalScore).toBe(0);
  });

  it('spawnRound creates a round tracking entity', () => {
    const entity = gameActions(ecsWorld).spawnRound(5);
    expect(entity.has(RoundTrait)).toBe(true);
    expect(entity.get(RoundTrait).totalRounds).toBe(5);
    expect(entity.get(RoundTrait).currentRound).toBe(1);
  });

  it('spawnPlayer creates a player entity', () => {
    const entity = gameActions(ecsWorld).spawnPlayer('medium', 5);
    expect(entity.has(PlayerTrait)).toBe(true);
    // difficulty is on RoundTrait, not PlayerTrait
    expect(entity.get(PlayerTrait).maxStrikes).toBe(5);
  });

  it('spawnPhase creates a phase tag entity', () => {
    const entity = gameActions(ecsWorld).spawnPhase('GRINDING');
    expect(entity.has(PhaseTag)).toBe(true);
    expect(entity.get(PhaseTag).phase).toBe('GRINDING');
  });

  it('setGrindLevel clamps to [0, 1]', () => {
    const entity = gameActions(ecsWorld).spawnGrinder();
    gameActions(ecsWorld).setGrindLevel(entity, 1.5);
    expect(entity.get(GrinderTrait).grindProgress).toBe(1);

    gameActions(ecsWorld).setGrindLevel(entity, -0.5);
    expect(entity.get(GrinderTrait).grindProgress).toBe(0);

    gameActions(ecsWorld).setGrindLevel(entity, 0.75);
    expect(entity.get(GrinderTrait).grindProgress).toBe(0.75);
  });

  it('setStuffLevelEntity clamps to [0, 1]', () => {
    const entity = gameActions(ecsWorld).spawnStuffer();
    gameActions(ecsWorld).setStuffLevelEntity(entity, 2.0);
    expect(entity.get(StufferTrait).fillLevel).toBe(1);
  });

  it('setCookLevelEntity clamps to [0, 1]', () => {
    const entity = gameActions(ecsWorld).spawnStove();
    gameActions(ecsWorld).setCookLevelEntity(entity, 0.5);
    expect(entity.get(StoveTrait).cookProgress).toBe(0.5);
  });

  it('addChop increments chop count', () => {
    const entity = gameActions(ecsWorld).spawnChopper();
    gameActions(ecsWorld).addChop(entity);
    expect(entity.get(ChopperTrait).chopCount).toBe(1);
    gameActions(ecsWorld).addChop(entity);
    expect(entity.get(ChopperTrait).chopCount).toBe(2);
  });

  it('selectIngredient marks ingredient as selected', () => {
    const entity = gameActions(ecsWorld).spawnIngredient({
      id: 'steak',
      name: 'Steak',
      category: 'food',
      tasteMod: 5,
      textureMod: 4,
      blowPower: 1,
      tags: ['savory', 'meat'],
    });
    expect(entity.get(IngredientTrait).selected).toBe(false);
    gameActions(ecsWorld).selectIngredient(entity);
    expect(entity.get(IngredientTrait).selected).toBe(true);
  });

  it('setPhase changes the game phase', () => {
    const entity = gameActions(ecsWorld).spawnPhase('SELECT_INGREDIENTS');
    gameActions(ecsWorld).setPhase(entity, 'COOKING');
    expect(entity.get(PhaseTag).phase).toBe('COOKING');
  });
});
