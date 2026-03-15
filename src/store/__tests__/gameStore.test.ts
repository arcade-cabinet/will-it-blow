import {useGameStore} from '../../ecs/hooks';
import {resetWorld} from '../../ecs/kootaWorld';

const getState = () => useGameStore.getState();

beforeEach(() => {
  resetWorld();
});

describe('gameStore (Koota ECS)', () => {
  it('starts with default state', () => {
    const state = getState();
    expect(state.introActive).toBe(true);
    expect(state.introPhase).toBe(0);
    expect(state.posture).toBe('prone');
    expect(state.idleTime).toBe(0);
    expect(state.appPhase).toBe('title');
    expect(state.gamePhase).toBe('SELECT_INGREDIENTS');
  });

  it('can set posture', () => {
    getState().setPosture('sitting');
    expect(getState().posture).toBe('sitting');
  });

  it('can set idle time', () => {
    getState().setIdleTime(5);
    expect(getState().idleTime).toBe(5);
  });

  it('can set app phase', () => {
    getState().setAppPhase('playing');
    expect(getState().appPhase).toBe('playing');
  });

  it('can set game phase', () => {
    getState().setGamePhase('GRINDING');
    expect(getState().gamePhase).toBe('GRINDING');
  });

  describe('returnToMenu', () => {
    it('resets all state to defaults', () => {
      getState().setAppPhase('playing');
      getState().setGamePhase('COOKING');
      getState().setCookLevel(0.8);
      getState().returnToMenu();

      const state = getState();
      expect(state.appPhase).toBe('title');
      expect(state.gamePhase).toBe('SELECT_INGREDIENTS');
      expect(state.cookLevel).toBe(0);
      expect(state.introActive).toBe(true);
    });
  });

  describe('startNewGame', () => {
    it('sets appPhase to playing and resets round state', () => {
      getState().setAppPhase('results');
      getState().setGamePhase('DONE');
      getState().startNewGame();

      const state = getState();
      expect(state.appPhase).toBe('playing');
      expect(state.gamePhase).toBe('SELECT_INGREDIENTS');
      expect(state.currentRound).toBe(1);
      expect(state.introActive).toBe(true);
    });
  });

  describe('nextRound', () => {
    it('advances round and resets per-round state', () => {
      getState().addSelectedIngredientId('banana');
      getState().addSelectedIngredientId('steak');
      getState().setCookLevel(0.9);
      getState().nextRound();

      const state = getState();
      expect(state.currentRound).toBe(2);
      expect(state.cookLevel).toBe(0);
      expect(state.selectedIngredientIds).toEqual([]);
      expect(state.usedIngredientCombos).toHaveLength(1);
    });
  });

  describe('recordFlairPoint', () => {
    it('adds flair points to playerDecisions', () => {
      getState().recordFlairPoint('fast-tie', 5);
      const {playerDecisions} = getState();
      expect(playerDecisions.flairPoints).toHaveLength(1);
      expect(playerDecisions.flairPoints[0]).toEqual({reason: 'fast-tie', points: 5});
    });
  });

  describe('finalScore', () => {
    it('is null by default', () => {
      expect(getState().finalScore).toBeNull();
    });
  });
});
