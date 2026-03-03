import {INITIAL_GAME_STATE, useGameStore} from '../src/store/gameStore';

const store = () => useGameStore.getState();
const reset = () => useGameStore.setState({...INITIAL_GAME_STATE});

beforeEach(() => reset());

describe('gameStore initial state', () => {
  it('starts with menu status', () => {
    expect(store().gameStatus).toBe('menu');
  });

  it('starts with menu appPhase', () => {
    expect(store().appPhase).toBe('menu');
  });

  it('starts at challenge 0', () => {
    expect(store().currentChallenge).toBe(0);
  });

  it('starts with 0 strikes', () => {
    expect(store().strikes).toBe(0);
  });

  it('starts with 3 hints', () => {
    expect(store().hintsRemaining).toBe(3);
  });

  it('starts with empty challenge scores', () => {
    expect(store().challengeScores).toEqual([]);
  });
});

describe('setAppPhase', () => {
  it('transitions appPhase to loading', () => {
    store().setAppPhase('loading');
    expect(store().appPhase).toBe('loading');
  });

  it('transitions appPhase to playing', () => {
    store().setAppPhase('playing');
    expect(store().appPhase).toBe('playing');
  });

  it('transitions appPhase back to menu', () => {
    store().setAppPhase('playing');
    store().setAppPhase('menu');
    expect(store().appPhase).toBe('menu');
  });
});

describe('startNewGame', () => {
  it('sets status to playing', () => {
    store().startNewGame();
    expect(store().gameStatus).toBe('playing');
  });

  it('sets appPhase to playing', () => {
    store().setAppPhase('loading');
    store().startNewGame();
    expect(store().appPhase).toBe('playing');
  });

  it('resets challenge to 0', () => {
    useGameStore.setState({currentChallenge: 3});
    store().startNewGame();
    expect(store().currentChallenge).toBe(0);
  });

  it('resets strikes and scores', () => {
    useGameStore.setState({strikes: 2, challengeScores: [80, 90]});
    store().startNewGame();
    expect(store().strikes).toBe(0);
    expect(store().challengeScores).toEqual([]);
  });

  it('resets hints to 3', () => {
    useGameStore.setState({hintsRemaining: 0});
    store().startNewGame();
    expect(store().hintsRemaining).toBe(3);
  });

  it('increments totalGamesPlayed', () => {
    expect(store().totalGamesPlayed).toBe(0);
    store().startNewGame();
    expect(store().totalGamesPlayed).toBe(1);
    store().startNewGame();
    expect(store().totalGamesPlayed).toBe(2);
  });
});

describe('continueGame', () => {
  it('sets status to playing without resetting challenge', () => {
    useGameStore.setState({currentChallenge: 3, challengeScores: [80, 90, 70]});
    store().continueGame();
    expect(store().gameStatus).toBe('playing');
    expect(store().currentChallenge).toBe(3);
  });

  it('resets strikes but keeps scores', () => {
    useGameStore.setState({strikes: 2, challengeScores: [80]});
    store().continueGame();
    expect(store().strikes).toBe(0);
    expect(store().challengeScores).toEqual([80]);
  });

  it('sets appPhase to playing', () => {
    useGameStore.setState({appPhase: 'menu'});
    store().continueGame();
    expect(store().appPhase).toBe('playing');
  });
});

describe('completeChallenge', () => {
  it('appends score and advances challenge index', () => {
    store().startNewGame();
    store().completeChallenge(85);
    expect(store().challengeScores).toEqual([85]);
    expect(store().currentChallenge).toBe(1);
  });

  it('sets victory when completing challenge 5 (the last)', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 5,
      challengeScores: [80, 85, 90, 70, 85],
    });
    store().completeChallenge(95);
    expect(store().gameStatus).toBe('victory');
    expect(store().challengeScores).toEqual([80, 85, 90, 70, 85, 95]);
  });

  it('resets strikes on challenge completion', () => {
    useGameStore.setState({gameStatus: 'playing', currentChallenge: 0, strikes: 2});
    store().completeChallenge(75);
    expect(store().strikes).toBe(0);
  });

  it('transitions bowlPosition to grinder-output after challenge 2 (grinding)', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 2,
      bowlPosition: 'grinder',
    });
    store().completeChallenge(80);
    expect(store().bowlPosition).toBe('grinder-output');
  });

  it('transitions bowlPosition to done after challenge 3 (stuffing) and resets sausagePlaced', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 3,
      bowlPosition: 'stuffer',
      sausagePlaced: true,
    });
    store().completeChallenge(70);
    expect(store().bowlPosition).toBe('done');
    expect(store().sausagePlaced).toBe(false);
  });

  it('does not change bowlPosition after challenge 0', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 0,
      bowlPosition: 'fridge',
    });
    store().completeChallenge(90);
    expect(store().bowlPosition).toBe('fridge');
  });
});

describe('addStrike', () => {
  it('increments strike count', () => {
    store().startNewGame();
    store().addStrike();
    expect(store().strikes).toBe(1);
  });

  it('sets defeat at 3 strikes', () => {
    store().startNewGame();
    store().addStrike();
    store().addStrike();
    store().addStrike();
    expect(store().strikes).toBe(3);
    expect(store().gameStatus).toBe('defeat');
  });
});

describe('returnToMenu', () => {
  it('resets appPhase to menu', () => {
    store().startNewGame();
    useGameStore.setState({
      strikes: 2,
      challengeProgress: 55,
      challengePressure: 80,
      challengeIsPressing: true,
      challengeTemperature: 180,
      challengeHeatLevel: 90,
    });
    expect(store().appPhase).toBe('playing');
    store().returnToMenu();
    expect(store().appPhase).toBe('menu');
    expect(store().gameStatus).toBe('menu');
    expect(store().strikes).toBe(0);
    expect(store().challengeProgress).toBe(0);
    expect(store().challengePressure).toBe(0);
    expect(store().challengeIsPressing).toBe(false);
    expect(store().challengeTemperature).toBe(70);
    expect(store().challengeHeatLevel).toBe(0);
  });
});

describe('useHint', () => {
  it('decrements hints', () => {
    store().startNewGame();
    store().useHint();
    expect(store().hintsRemaining).toBe(2);
  });

  it('does not go below 0', () => {
    useGameStore.setState({hintsRemaining: 0});
    store().useHint();
    expect(store().hintsRemaining).toBe(0);
  });
});

describe('generateDemands', () => {
  it('creates valid demands with all required fields', () => {
    const pool = ['Big Mac', 'Lobster', 'Water', 'Pizza', 'Candy Cane', 'Dirt'];
    store().generateDemands(pool);
    const demands = store().mrSausageDemands;
    expect(demands).not.toBeNull();
    expect(['coil', 'link']).toContain(demands!.preferredForm);
    expect(demands!.desiredLinkCount).toBeGreaterThanOrEqual(2);
    expect(demands!.desiredLinkCount).toBeLessThanOrEqual(5);
    expect(['even', 'any']).toContain(demands!.uniformity);
    expect(demands!.desiredIngredients.length).toBeGreaterThanOrEqual(2);
    expect(demands!.desiredIngredients.length).toBeLessThanOrEqual(3);
    expect(demands!.hatedIngredients.length).toBeGreaterThanOrEqual(1);
    expect(demands!.hatedIngredients.length).toBeLessThanOrEqual(2);
    expect(['rare', 'medium', 'well-done', 'charred']).toContain(demands!.cookPreference);
    expect(['cryptic', 'passive-aggressive', 'manic']).toContain(demands!.moodProfile);
  });

  it('picks desired and hated ingredients from the pool', () => {
    const pool = ['Big Mac', 'Lobster', 'Water', 'Pizza', 'Candy Cane', 'Dirt'];
    store().generateDemands(pool);
    const demands = store().mrSausageDemands!;
    for (const ing of demands.desiredIngredients) {
      expect(pool).toContain(ing);
    }
    for (const ing of demands.hatedIngredients) {
      expect(pool).toContain(ing);
    }
  });

  it('does not overlap desired and hated ingredients', () => {
    const pool = ['Big Mac', 'Lobster', 'Water', 'Pizza', 'Candy Cane', 'Dirt'];
    store().generateDemands(pool);
    const demands = store().mrSausageDemands!;
    const overlap = demands.desiredIngredients.filter(i => demands.hatedIngredients.includes(i));
    expect(overlap).toEqual([]);
  });
});

describe('recordTwist', () => {
  it('adds to twistPoints', () => {
    store().recordTwist(0.25);
    store().recordTwist(0.75);
    expect(store().playerDecisions.twistPoints).toEqual([0.25, 0.75]);
  });
});

describe('recordFormChoice', () => {
  it('derives coil with 0 twists', () => {
    store().recordFormChoice();
    expect(store().playerDecisions.chosenForm).toBe('coil');
  });

  it('derives link with 1+ twists', () => {
    store().recordTwist(0.5);
    store().recordFormChoice();
    expect(store().playerDecisions.chosenForm).toBe('link');
  });
});

describe('recordFlairTwist', () => {
  it('increments flair twist counter', () => {
    expect(store().playerDecisions.flairTwists).toBe(0);
    store().recordFlairTwist();
    expect(store().playerDecisions.flairTwists).toBe(1);
    store().recordFlairTwist();
    expect(store().playerDecisions.flairTwists).toBe(2);
  });
});

describe('recordCookLevel', () => {
  it('records final cook level', () => {
    store().recordCookLevel(0.72);
    expect(store().playerDecisions.finalCookLevel).toBe(0.72);
  });
});

describe('recordHintViewed', () => {
  it('tracks viewed hint IDs', () => {
    store().recordHintViewed('hint-1');
    store().recordHintViewed('hint-2');
    expect(store().playerDecisions.hintsViewed).toEqual(['hint-1', 'hint-2']);
  });
});

describe('recordStageTiming', () => {
  it('records stage duration', () => {
    store().recordStageTiming('fridge', 45.2);
    store().recordStageTiming('grinder', 30.0);
    expect(store().playerDecisions.stageTimings).toEqual({fridge: 45.2, grinder: 30.0});
  });
});

describe('recordFlairPoint', () => {
  it('appends flair bonus entries', () => {
    expect(store().playerDecisions.flairPoints).toEqual([]);
    store().recordFlairPoint('confidence', 5);
    store().recordFlairPoint('showmanship', 3);
    expect(store().playerDecisions.flairPoints).toEqual([
      {reason: 'confidence', points: 5},
      {reason: 'showmanship', points: 3},
    ]);
  });

  it('starts empty and accumulates additively', () => {
    store().recordFlairPoint('precision', 2);
    store().recordFlairPoint('precision', 4);
    const fp = store().playerDecisions.flairPoints;
    expect(fp).toHaveLength(2);
    expect(fp[0]).toEqual({reason: 'precision', points: 2});
    expect(fp[1]).toEqual({reason: 'precision', points: 4});
  });
});

describe('addFridgeSelected', () => {
  it('populates selectedIngredients from fridgePool', () => {
    const pool = [
      {
        name: 'Lobster',
        emoji: '🦞',
        category: 'protein' as const,
        chunkColor: '#cc3333',
        chunkScale: 1,
        fatRatio: 0.2,
        shape: {base: 'elongated' as const, detail: 'claws' as const},
      },
      {
        name: 'Candy Cane',
        emoji: '🍬',
        category: 'wild-card' as const,
        chunkColor: '#ff6666',
        chunkScale: 0.6,
        fatRatio: 0.1,
        shape: {base: 'cylinder' as const},
      },
    ];
    store().setFridgePool(pool, [0]);
    store().addFridgeSelected(0);
    expect(store().playerDecisions.selectedIngredients).toEqual(['Lobster']);
  });

  it('does not add empty name for out-of-bounds index', () => {
    const pool = [
      {
        name: 'Lobster',
        emoji: '🦞',
        category: 'protein' as const,
        chunkColor: '#cc3333',
        chunkScale: 1,
        fatRatio: 0.2,
        shape: {base: 'elongated' as const, detail: 'claws' as const},
      },
    ];
    store().setFridgePool(pool, [0]);
    store().addFridgeSelected(99);
    expect(store().playerDecisions.selectedIngredients).toEqual([]);
  });
});

describe('startNewGame demand integration', () => {
  it('resets playerDecisions and generates fresh demands', () => {
    // Dirty the state
    store().recordTwist(0.5);
    store().recordFlairTwist();
    store().recordCookLevel(0.8);
    store().recordHintViewed('hint-1');
    store().recordFlairPoint('patience', 7);

    store().startNewGame();

    // playerDecisions should be reset
    const pd = store().playerDecisions;
    expect(pd.twistPoints).toEqual([]);
    expect(pd.flairTwists).toBe(0);
    expect(pd.finalCookLevel).toBe(0);
    expect(pd.hintsViewed).toEqual([]);
    expect(pd.chosenForm).toBeNull();
    expect(pd.stageTimings).toEqual({});
    expect(pd.flairPoints).toEqual([]);

    // demands should be generated
    expect(store().mrSausageDemands).not.toBeNull();
    expect(store().mrSausageDemands!.desiredIngredients.length).toBeGreaterThanOrEqual(2);
  });
});
