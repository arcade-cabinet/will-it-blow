import {useGameStore} from '../hooks';
import {resetWorld} from '../kootaWorld';

const getState = () => useGameStore.getState();

beforeEach(() => {
  resetWorld();
});

describe('useGameStore.getState()', () => {
  it('returns initial state with default values', () => {
    const state = getState();
    expect(state.appPhase).toBe('title');
    expect(state.gamePhase).toBe('SELECT_INGREDIENTS');
    expect(state.introActive).toBe(true);
    expect(state.introPhase).toBe(0);
    expect(state.posture).toBe('prone');
    expect(state.idleTime).toBe(0);
    expect(state.difficulty).toBe('medium');
    expect(state.currentRound).toBe(1);
    expect(state.totalRounds).toBe(3);
    expect(state.groundMeatVol).toBe(0);
    expect(state.stuffLevel).toBe(0);
    expect(state.casingTied).toBe(false);
    expect(state.cookLevel).toBe(0);
    expect(state.selectedIngredientIds).toEqual([]);
    expect(state.mrSausageReaction).toBe('idle');
    expect(state.mrSausageDemands).toBeNull();
    expect(state.finalScore).toBeNull();
    expect(state.usedIngredientCombos).toEqual([]);
  });

  it('returns player position defaults', () => {
    const state = getState();
    expect(state.playerPosition).toEqual({x: 0, y: 0, z: 0});
    expect(state.joystick).toEqual({x: 0, y: 0});
    expect(state.lookDelta).toEqual({x: 0, y: 0});
    expect(state.interactPulse).toBe(0);
  });

  it('returns playerDecisions with empty flair points', () => {
    const state = getState();
    expect(state.playerDecisions).toEqual({flairPoints: []});
  });
});

describe('useGameStore.setState()', () => {
  it('updates appPhase', () => {
    useGameStore.setState({appPhase: 'playing'});
    expect(getState().appPhase).toBe('playing');
  });

  it('updates gamePhase', () => {
    useGameStore.setState({gamePhase: 'GRINDING'});
    expect(getState().gamePhase).toBe('GRINDING');
  });

  it('updates introActive', () => {
    useGameStore.setState({introActive: false});
    expect(getState().introActive).toBe(false);
  });

  it('updates introPhase', () => {
    useGameStore.setState({introPhase: 3});
    expect(getState().introPhase).toBe(3);
  });

  it('updates posture', () => {
    useGameStore.setState({posture: 'standing'});
    expect(getState().posture).toBe('standing');
  });

  it('updates idleTime', () => {
    useGameStore.setState({idleTime: 42});
    expect(getState().idleTime).toBe(42);
  });

  it('updates groundMeatVol', () => {
    useGameStore.setState({groundMeatVol: 0.5});
    expect(getState().groundMeatVol).toBe(0.5);
  });

  it('updates stuffLevel', () => {
    useGameStore.setState({stuffLevel: 0.75});
    expect(getState().stuffLevel).toBe(0.75);
  });

  it('updates casingTied', () => {
    useGameStore.setState({casingTied: true});
    expect(getState().casingTied).toBe(true);
  });

  it('updates cookLevel', () => {
    useGameStore.setState({cookLevel: 0.9});
    expect(getState().cookLevel).toBe(0.9);
  });

  it('updates playerPosition', () => {
    useGameStore.setState({playerPosition: {x: 1, y: 2, z: 3}});
    expect(getState().playerPosition).toEqual({x: 1, y: 2, z: 3});
  });

  it('updates mrSausageReaction', () => {
    useGameStore.setState({mrSausageReaction: 'angry'});
    expect(getState().mrSausageReaction).toBe('angry');
  });

  it('supports partial updates without clobbering other state', () => {
    useGameStore.setState({appPhase: 'playing'});
    useGameStore.setState({gamePhase: 'COOKING'});
    const state = getState();
    expect(state.appPhase).toBe('playing');
    expect(state.gamePhase).toBe('COOKING');
  });
});

describe('startNewGame action', () => {
  it('transitions appPhase to playing', () => {
    getState().startNewGame();
    expect(getState().appPhase).toBe('playing');
  });

  it('sets introActive to true (intro sequence plays on new game)', () => {
    getState().startNewGame();
    expect(getState().introActive).toBe(true);
  });

  it('sets posture to prone (player starts lying on mattress)', () => {
    getState().startNewGame();
    expect(getState().posture).toBe('prone');
  });

  it('resets gamePhase to SELECT_INGREDIENTS', () => {
    getState().setGamePhase('COOKING');
    getState().startNewGame();
    expect(getState().gamePhase).toBe('SELECT_INGREDIENTS');
  });

  it('resets round to 1', () => {
    getState().nextRound();
    expect(getState().currentRound).toBe(2);
    getState().startNewGame();
    expect(getState().currentRound).toBe(1);
  });

  it('resets station gameplay state', () => {
    getState().setGroundMeatVol(0.5);
    getState().setStuffLevel(0.8);
    getState().setCasingTied(true);
    getState().setCookLevel(0.9);
    getState().startNewGame();
    const state = getState();
    expect(state.groundMeatVol).toBe(0);
    expect(state.stuffLevel).toBe(0);
    expect(state.casingTied).toBe(false);
    expect(state.cookLevel).toBe(0);
  });

  it('clears selected ingredients', () => {
    getState().addSelectedIngredientId('banana');
    getState().addSelectedIngredientId('steak');
    getState().startNewGame();
    expect(getState().selectedIngredientIds).toEqual([]);
  });
});

describe('returnToMenu action', () => {
  it('resets appPhase to title', () => {
    getState().setAppPhase('playing');
    getState().returnToMenu();
    expect(getState().appPhase).toBe('title');
  });

  it('resets introActive to true', () => {
    getState().setIntroActive(false);
    getState().returnToMenu();
    expect(getState().introActive).toBe(true);
  });

  it('resets all station state', () => {
    getState().setGroundMeatVol(1);
    getState().setCookLevel(0.5);
    getState().returnToMenu();
    expect(getState().groundMeatVol).toBe(0);
    expect(getState().cookLevel).toBe(0);
  });
});

describe('individual actions', () => {
  it('setDifficulty updates difficulty and totalRounds', () => {
    getState().setDifficulty('hard', 7);
    const state = getState();
    expect(state.difficulty).toBe('hard');
    expect(state.totalRounds).toBe(7);
    expect(state.currentRound).toBe(1);
  });

  it('addSelectedIngredientId appends to list', () => {
    getState().addSelectedIngredientId('banana');
    expect(getState().selectedIngredientIds).toEqual(['banana']);
    getState().addSelectedIngredientId('steak');
    expect(getState().selectedIngredientIds).toEqual(['banana', 'steak']);
  });

  it('setGroundMeatVol with function updater', () => {
    getState().setGroundMeatVol(0.5);
    getState().setGroundMeatVol(prev => prev + 0.25);
    expect(getState().groundMeatVol).toBe(0.75);
  });

  it('setStuffLevel with function updater', () => {
    getState().setStuffLevel(0.3);
    getState().setStuffLevel(prev => prev + 0.2);
    expect(getState().stuffLevel).toBeCloseTo(0.5);
  });

  it('setCookLevel with function updater', () => {
    getState().setCookLevel(0.1);
    getState().setCookLevel(prev => prev + 0.4);
    expect(getState().cookLevel).toBeCloseTo(0.5);
  });

  it('nextRound advances round and resets per-round state', () => {
    getState().addSelectedIngredientId('banana');
    getState().setCookLevel(0.9);
    getState().nextRound();
    const state = getState();
    expect(state.currentRound).toBe(2);
    expect(state.cookLevel).toBe(0);
    expect(state.selectedIngredientIds).toEqual([]);
    expect(state.usedIngredientCombos).toHaveLength(1);
  });

  it('recordFlairPoint adds to flair points', () => {
    getState().recordFlairPoint('fast-chop', 10);
    getState().recordFlairPoint('no-waste', 5);
    const {playerDecisions} = getState();
    expect(playerDecisions.flairPoints).toHaveLength(2);
    expect(playerDecisions.flairPoints[0]).toEqual({reason: 'fast-chop', points: 10});
    expect(playerDecisions.flairPoints[1]).toEqual({reason: 'no-waste', points: 5});
  });

  it('generateDemands creates demands', () => {
    expect(getState().mrSausageDemands).toBeNull();
    getState().generateDemands();
    const demands = getState().mrSausageDemands;
    expect(demands).not.toBeNull();
    expect(demands!.desiredTags).toHaveLength(2);
    expect(demands!.hatedTags).toHaveLength(1);
    expect(['rare', 'medium', 'well-done', 'charred']).toContain(demands!.cookPreference);
  });

  it('triggerInteract increments interactPulse', () => {
    expect(getState().interactPulse).toBe(0);
    getState().triggerInteract();
    expect(getState().interactPulse).toBe(1);
    getState().triggerInteract();
    expect(getState().interactPulse).toBe(2);
  });

  it('consumeLookDelta returns accumulated delta and resets', () => {
    getState().addLookDelta(5, 3);
    getState().addLookDelta(2, 1);
    const delta = getState().consumeLookDelta();
    expect(delta).toEqual({x: 7, y: 4});
  });
});
