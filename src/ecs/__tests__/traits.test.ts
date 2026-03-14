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
  toJsonArray,
} from '../traits';

describe('Koota traits', () => {
  it('exports all 13 traits', () => {
    const traits = [
      StationTrait,
      SausageTrait,
      GrinderTrait,
      StufferTrait,
      StoveTrait,
      ChopperTrait,
      BlowoutTrait,
      IngredientTrait,
      DemandTrait,
      ScoreTrait,
      RoundTrait,
      PlayerTrait,
      PhaseTag,
    ];
    expect(traits).toHaveLength(13);
    for (const t of traits) {
      expect(t).toBeDefined();
    }
  });

  it('StationTrait has name, active, position fields', () => {
    expect(StationTrait).toBeDefined();
    const configured = StationTrait({name: 'grinder', active: true, posX: 1, posY: 2, posZ: 3});
    expect(configured).toBeDefined();
  });

  it('SausageTrait has assembly pipeline fields', () => {
    const configured = SausageTrait({
      ingredientIdsJson: toJsonArray(['banana', 'steak']),
      groundLevel: 0.5,
      stuffLevel: 0.3,
      cookLevel: 0.7,
      casingTied: true,
      burstOccurred: false,
    });
    expect(configured).toBeDefined();
  });

  it('GrinderTrait tracks grind state', () => {
    const configured = GrinderTrait({
      plungerDisplacement: 0.5,
      grindProgress: 0.8,
      speed: 1.0,
      active: true,
    });
    expect(configured).toBeDefined();
  });

  it('IngredientTrait carries ingredient data', () => {
    const configured = IngredientTrait({
      id: 'banana',
      name: 'Banana',
      category: 'food',
      tasteMod: 4,
      textureMod: 2,
      blowPower: 1,
      tagsJson: toJsonArray(['sweet', 'smooth']),
      selected: false,
    });
    expect(configured).toBeDefined();
  });

  it('PhaseTag tracks current game phase', () => {
    const configured = PhaseTag({phase: 'GRINDING'});
    expect(configured).toBeDefined();
  });

  it('ScoreTrait has all scoring fields', () => {
    const configured = ScoreTrait({
      tasteScore: 10,
      textureScore: 5,
      tagBonus: 25,
      cookBonus: 40,
      blowBonus: 10,
      totalScore: 90,
      rank: 'S',
    });
    expect(configured).toBeDefined();
  });

  it('DemandTrait has preference fields', () => {
    const configured = DemandTrait({
      desiredTagsJson: toJsonArray(['spicy', 'meat']),
      hatedTagsJson: toJsonArray(['sweet']),
      cookPreference: 'well-done',
    });
    expect(configured).toBeDefined();
  });

  it('RoundTrait tracks round progression', () => {
    const configured = RoundTrait({
      currentRound: 3,
      totalRounds: 5,
      roundScoresJson: toJsonArray([70, 85]),
      usedCombosJson: toJsonArray([['banana', 'steak', 'pepper']]),
    });
    expect(configured).toBeDefined();
  });
});

describe('JSON helpers', () => {
  it('toJsonArray serializes arrays', () => {
    expect(toJsonArray(['a', 'b'])).toBe('["a","b"]');
    expect(toJsonArray([1, 2, 3])).toBe('[1,2,3]');
    expect(toJsonArray([])).toBe('[]');
  });

  it('parseJsonArray deserializes arrays', () => {
    expect(parseJsonArray<string>('["a","b"]')).toEqual(['a', 'b']);
    expect(parseJsonArray<number>('[1,2,3]')).toEqual([1, 2, 3]);
    expect(parseJsonArray('[]')).toEqual([]);
  });

  it('parseJsonArray returns empty array on invalid JSON', () => {
    expect(parseJsonArray('not json')).toEqual([]);
    expect(parseJsonArray('')).toEqual([]);
  });

  it('roundtrip: serialize then parse', () => {
    const original = ['sweet', 'savory', 'meat'];
    const json = toJsonArray(original);
    const parsed = parseJsonArray<string>(json);
    expect(parsed).toEqual(original);
  });
});
