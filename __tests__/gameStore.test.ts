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

  it('sets victory when completing challenge 4 (the last)', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 4,
      challengeScores: [80, 90, 70, 85],
    });
    store().completeChallenge(95);
    expect(store().gameStatus).toBe('victory');
    expect(store().challengeScores).toEqual([80, 90, 70, 85, 95]);
  });

  it('resets strikes on challenge completion', () => {
    useGameStore.setState({gameStatus: 'playing', currentChallenge: 0, strikes: 2});
    store().completeChallenge(75);
    expect(store().strikes).toBe(0);
  });

  it('transitions bowlPosition to grinder-output after challenge 1', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 1,
      bowlPosition: 'grinder',
    });
    store().completeChallenge(80);
    expect(store().bowlPosition).toBe('grinder-output');
  });

  it('transitions bowlPosition to done after challenge 2 and resets sausagePlaced', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      currentChallenge: 2,
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
