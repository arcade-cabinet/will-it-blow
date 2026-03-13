import {describe, expect, it} from '@jest/globals';
import {useGameStore} from '../gameStore';

describe('gameStore', () => {
  it('starts with default state', () => {
    const state = useGameStore.getState();
    expect(state.introActive).toBe(true);
    expect(state.introPhase).toBe(0);
    expect(state.posture).toBe('prone');
    expect(state.idleTime).toBe(0);
  });

  it('can set posture', () => {
    useGameStore.getState().setPosture('sitting');
    expect(useGameStore.getState().posture).toBe('sitting');
  });

  it('can set idle time', () => {
    useGameStore.getState().setIdleTime(5);
    expect(useGameStore.getState().idleTime).toBe(5);
  });
});
