/**
 * @module stations/__tests__/station-interactions
 * Tests that verify each station's game logic through the ECS store directly.
 * No R3F rendering needed -- we test state transitions only.
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {useGameStore} from '../../../ecs/hooks';
import {resetWorld} from '../../../ecs/kootaWorld';

describe('Station Interactions (ECS state)', () => {
  beforeEach(() => {
    resetWorld();
  });

  describe('SELECT_INGREDIENTS', () => {
    it('starts at SELECT_INGREDIENTS phase', () => {
      expect(useGameStore.getState().gamePhase).toBe('SELECT_INGREDIENTS');
    });

    it('addSelectedIngredientId accumulates ingredients', () => {
      useGameStore.getState().addSelectedIngredientId('banana');
      useGameStore.getState().addSelectedIngredientId('steak');
      const ids = useGameStore.getState().selectedIngredientIds;
      expect(ids).toContain('banana');
      expect(ids).toContain('steak');
      expect(ids).toHaveLength(2);
    });

    it('does not deduplicate ingredients', () => {
      useGameStore.getState().addSelectedIngredientId('banana');
      useGameStore.getState().addSelectedIngredientId('banana');
      expect(useGameStore.getState().selectedIngredientIds).toHaveLength(2);
    });
  });

  describe('CHOPPING -> FILL_GRINDER', () => {
    it('setGroundMeatVol sets absolute value', () => {
      useGameStore.getState().setGamePhase('CHOPPING');
      useGameStore.getState().setGroundMeatVol(1.0);
      expect(useGameStore.getState().groundMeatVol).toBe(1.0);
    });

    it('setGroundMeatVol accepts updater function', () => {
      useGameStore.getState().setGamePhase('CHOPPING');
      useGameStore.getState().setGroundMeatVol(0.3);
      useGameStore.getState().setGroundMeatVol((v: number) => Math.min(1, v + 0.2));
      expect(useGameStore.getState().groundMeatVol).toBeCloseTo(0.5);
    });

    it('doChop pattern increments to cap', () => {
      useGameStore.getState().setGamePhase('CHOPPING');
      for (let i = 0; i < 10; i++) {
        useGameStore.getState().setGroundMeatVol((v: number) => Math.min(1, v + 0.2));
      }
      expect(useGameStore.getState().groundMeatVol).toBe(1.0);
    });
  });

  describe('STUFFING', () => {
    it('stuffLevel increases via absolute value', () => {
      useGameStore.getState().setGamePhase('STUFFING');
      useGameStore.getState().setStuffLevel(0.5);
      expect(useGameStore.getState().stuffLevel).toBe(0.5);
    });

    it('stuffLevel accepts updater function', () => {
      useGameStore.getState().setGamePhase('STUFFING');
      useGameStore.getState().setStuffLevel(0.3);
      useGameStore.getState().setStuffLevel((v: number) => v + 0.2);
      expect(useGameStore.getState().stuffLevel).toBeCloseTo(0.5);
    });

    it('casingTied tracks state', () => {
      useGameStore.getState().setGamePhase('TIE_CASING');
      useGameStore.getState().setCasingTied(true);
      expect(useGameStore.getState().casingTied).toBe(true);
    });
  });

  describe('BLOWOUT scoring', () => {
    it('recordFlairPoint adds to flair points', () => {
      useGameStore.getState().recordFlairPoint('Massive Explosion', 15);
      const flair = useGameStore.getState().playerDecisions.flairPoints;
      expect(flair).toContainEqual({reason: 'Massive Explosion', points: 15});
    });

    it('accumulates multiple flair points', () => {
      useGameStore.getState().recordFlairPoint('Clean Burst', 10);
      useGameStore.getState().recordFlairPoint('Massive Explosion', 15);
      const flair = useGameStore.getState().playerDecisions.flairPoints;
      expect(flair).toHaveLength(2);
    });
  });

  describe('COOKING', () => {
    it('cookLevel tracks cooking progress', () => {
      useGameStore.getState().setGamePhase('COOKING');
      useGameStore.getState().setCookLevel(0.75);
      expect(useGameStore.getState().cookLevel).toBe(0.75);
    });

    it('cookLevel accepts updater function', () => {
      useGameStore.getState().setGamePhase('COOKING');
      useGameStore.getState().setCookLevel(0.3);
      useGameStore.getState().setCookLevel((v: number) => Math.min(1, v + 0.2));
      expect(useGameStore.getState().cookLevel).toBeCloseTo(0.5);
    });
  });

  describe('Round management', () => {
    it('nextRound increments round counter', () => {
      const initialRound = useGameStore.getState().currentRound;
      useGameStore.getState().nextRound();
      expect(useGameStore.getState().currentRound).toBe(initialRound + 1);
    });

    it('nextRound resets station gameplay state', () => {
      useGameStore.getState().setGroundMeatVol(1.0);
      useGameStore.getState().setStuffLevel(0.8);
      useGameStore.getState().setCasingTied(true);
      useGameStore.getState().setCookLevel(0.75);
      useGameStore.getState().nextRound();
      expect(useGameStore.getState().groundMeatVol).toBe(0);
      expect(useGameStore.getState().stuffLevel).toBe(0);
      expect(useGameStore.getState().casingTied).toBe(false);
      expect(useGameStore.getState().cookLevel).toBe(0);
    });

    it('nextRound resets phase to SELECT_INGREDIENTS', () => {
      useGameStore.getState().setGamePhase('DONE');
      useGameStore.getState().nextRound();
      expect(useGameStore.getState().gamePhase).toBe('SELECT_INGREDIENTS');
    });

    it('startNewGame resets everything', () => {
      useGameStore.getState().setGamePhase('COOKING');
      useGameStore.getState().setCookLevel(0.8);
      useGameStore.getState().setGroundMeatVol(1.0);
      useGameStore.getState().addSelectedIngredientId('banana');
      useGameStore.getState().startNewGame();
      expect(useGameStore.getState().gamePhase).toBe('SELECT_INGREDIENTS');
      expect(useGameStore.getState().cookLevel).toBe(0);
      expect(useGameStore.getState().groundMeatVol).toBe(0);
      expect(useGameStore.getState().selectedIngredientIds).toHaveLength(0);
      expect(useGameStore.getState().appPhase).toBe('playing');
    });

    it('returnToMenu resets to title', () => {
      useGameStore.getState().setGamePhase('DONE');
      useGameStore.getState().returnToMenu();
      expect(useGameStore.getState().appPhase).toBe('title');
      expect(useGameStore.getState().gamePhase).toBe('SELECT_INGREDIENTS');
    });
  });

  describe('Scoring', () => {
    it('generateDemands creates demand preferences', () => {
      useGameStore.getState().generateDemands();
      const demands = useGameStore.getState().mrSausageDemands;
      expect(demands).toBeDefined();
      expect(demands).not.toBeNull();
      expect(demands!.desiredTags.length).toBeGreaterThan(0);
      expect(demands!.hatedTags.length).toBeGreaterThan(0);
      expect(['rare', 'medium', 'well-done', 'charred']).toContain(demands!.cookPreference);
    });

    it('calculateFinalScore produces a score after setup', () => {
      // Must have ingredients, demands, and cook level
      useGameStore.getState().addSelectedIngredientId('banana');
      useGameStore.getState().addSelectedIngredientId('steak');
      useGameStore.getState().addSelectedIngredientId('bread');
      useGameStore.getState().generateDemands();
      useGameStore.getState().setCookLevel(0.5);
      useGameStore.getState().calculateFinalScore();
      const score = useGameStore.getState().finalScore;
      expect(score).not.toBeNull();
      expect(score!.calculated).toBe(true);
      expect(typeof score!.totalScore).toBe('number');
      expect(score!.totalScore).toBeGreaterThanOrEqual(0);
      expect(score!.totalScore).toBeLessThanOrEqual(100);
    });

    it('calculateFinalScore without ingredients does nothing', () => {
      useGameStore.getState().generateDemands();
      useGameStore.getState().calculateFinalScore();
      const score = useGameStore.getState().finalScore;
      // Should still be null (no ingredients means early return)
      expect(score).toBeNull();
    });
  });

  describe('Phase transitions', () => {
    it('setGamePhase advances through all 13 phases', () => {
      const phases = [
        'SELECT_INGREDIENTS',
        'CHOPPING',
        'FILL_GRINDER',
        'GRINDING',
        'MOVE_BOWL',
        'ATTACH_CASING',
        'STUFFING',
        'TIE_CASING',
        'BLOWOUT',
        'MOVE_SAUSAGE',
        'MOVE_PAN',
        'COOKING',
        'DONE',
      ] as const;

      for (const phase of phases) {
        useGameStore.getState().setGamePhase(phase);
        expect(useGameStore.getState().gamePhase).toBe(phase);
      }
    });

    it('appPhase transitions correctly', () => {
      expect(useGameStore.getState().appPhase).toBe('title');
      useGameStore.getState().setAppPhase('playing');
      expect(useGameStore.getState().appPhase).toBe('playing');
      useGameStore.getState().setAppPhase('results');
      expect(useGameStore.getState().appPhase).toBe('results');
    });
  });

  describe('Mr. Sausage', () => {
    it('setMrSausageReaction updates reaction', () => {
      useGameStore.getState().setMrSausageReaction('nod');
      expect(useGameStore.getState().mrSausageReaction).toBe('nod');
    });
  });
});
