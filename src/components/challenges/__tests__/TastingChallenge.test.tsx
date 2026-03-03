/**
 * @module TastingChallenge.test
 * Tests for the TastingChallenge verdict reveal component.
 *
 * Covers:
 * - Demand reveal phases exist and display correct content
 * - Demand breakdown renders in the scores phase
 * - Verdict integrates demandBonus into final score
 * - Graceful fallback when mrSausageDemands is null
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import type {MrSausageDemands, PlayerDecisions} from '../../../store/gameStore';
import {INITIAL_GAME_STATE, useGameStore} from '../../../store/gameStore';
import {TastingChallenge} from '../TastingChallenge';

// Mock DialogueOverlay to avoid typewriter complexity
jest.mock('../../ui/DialogueOverlay', () => ({
  DialogueOverlay: ({onComplete}: {onComplete: (effects: string[]) => void}) => {
    const React = require('react');
    React.useEffect(() => {
      const timer = setTimeout(() => onComplete([]), 10);
      return () => clearTimeout(timer);
    }, [onComplete]);
    return null;
  },
}));

const TEST_DEMANDS: MrSausageDemands = {
  preferredForm: 'link',
  desiredLinkCount: 3,
  uniformity: 'any',
  desiredIngredients: ['Beef', 'Onion'],
  hatedIngredients: ['Dirt'],
  cookPreference: 'medium',
  moodProfile: 'cryptic',
};

const TEST_DECISIONS: PlayerDecisions = {
  selectedIngredients: ['Beef', 'Chicken'],
  twistPoints: [0.3, 0.6],
  chosenForm: 'link',
  finalCookLevel: 0.45,
  hintsViewed: [],
  flairTwists: 1,
  stageTimings: {},
  flairPoints: [{reason: 'twist-combo', points: 3}],
};

/** Serialize tree to string for text assertions. */
function flatText(tree: renderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

/**
 * Helper: advance a phase by the given ms inside act(), flushing pending state.
 * Each step is individually wrapped to ensure React processes all updates.
 */
function advancePhase(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  act(() => {
    useGameStore.setState({...INITIAL_GAME_STATE});
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TastingChallenge', () => {
  it('renders THE TASTING title on mount', () => {
    act(() => {
      useGameStore.setState({challengeScores: [80, 70, 60, 50]});
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    expect(flatText(tree!)).toContain('THE TASTING');
    act(() => tree!.unmount());
  });

  it('progresses through reveal phases when demands exist', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: TEST_DEMANDS,
        playerDecisions: TEST_DECISIONS,
      });
    });

    const onReaction = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} onReaction={onReaction} />);
    });

    // title -> eating (1200ms)
    advancePhase(1300);
    expect(onReaction).toHaveBeenCalledWith('talk');

    // eating -> judging (2000ms)
    advancePhase(2100);
    expect(onReaction).toHaveBeenCalledWith('nervous');

    // judging -> reveal-form (2000ms)
    advancePhase(2100);
    const afterForm = flatText(tree!);
    expect(afterForm).toContain('LINK');

    // reveal-form -> reveal-ingredients (2000ms)
    advancePhase(2100);
    const afterIngredients = flatText(tree!);
    expect(afterIngredients).toContain('Beef');
    expect(afterIngredients).toContain('Onion');

    // reveal-ingredients -> reveal-cook (2000ms)
    advancePhase(2100);
    const afterCook = flatText(tree!);
    expect(afterCook).toContain('MEDIUM');

    act(() => tree!.unmount());
  });

  it('skips reveal phases when mrSausageDemands is null', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: null,
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    // title -> eating (1200ms)
    advancePhase(1300);
    // eating -> judging (2000ms)
    advancePhase(2100);
    // judging -> scores (2000ms) — skips reveal phases
    advancePhase(2100);

    const text = flatText(tree!);
    expect(text).toContain('Ingredients');
    expect(text).toContain('Grinding');

    act(() => tree!.unmount());
  });

  it('displays form MATCH indicator during reveal-form phase', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: TEST_DEMANDS,
        playerDecisions: {...TEST_DECISIONS, chosenForm: 'link'},
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    // title(1300) + eating(2100) + judging(2100) = ~5500
    advancePhase(1300);
    advancePhase(2100);
    advancePhase(2100);

    const text = flatText(tree!);
    expect(text).toContain('MATCH');
    expect(text).toContain('link');

    act(() => tree!.unmount());
  });

  it('displays MISMATCH when form does not match', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: TEST_DEMANDS,
        playerDecisions: {...TEST_DECISIONS, chosenForm: 'coil'},
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    advancePhase(1300);
    advancePhase(2100);
    advancePhase(2100);

    const text = flatText(tree!);
    expect(text).toContain('MISMATCH');

    act(() => tree!.unmount());
  });

  it('shows hated ingredients in reveal-ingredients phase', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: TEST_DEMANDS,
        playerDecisions: {...TEST_DECISIONS, selectedIngredients: ['Dirt', 'Beef']},
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    // title + eating + judging + reveal-form
    advancePhase(1300);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);

    const text = flatText(tree!);
    expect(text).toContain('HATE');
    expect(text).toContain('Dirt');

    act(() => tree!.unmount());
  });

  it('shows demand breakdown section in scores phase when demands exist', () => {
    act(() => {
      useGameStore.setState({
        challengeScores: [80, 70, 60, 50],
        mrSausageDemands: TEST_DEMANDS,
        playerDecisions: TEST_DECISIONS,
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    // title(1300) + eating(2100) + judging(2100) + reveal-form(2100) +
    // reveal-ingredients(2100) + reveal-cook(2100) = ~11800
    advancePhase(1300);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);

    // Now in scores phase — advance score reveals + average + demand section
    // Need to advance enough for all the staggered animations
    advancePhase(5000);

    const text = flatText(tree!);
    expect(text).toContain('Mr. Sausage');
    expect(text).toContain('Form');
    expect(text).toContain('Cook');
    expect(text).toContain('Adjusted Total');

    act(() => tree!.unmount());
  });

  it('integrates demandBonus into verdict calculation', () => {
    // Scores average to 85 (A rank). With big demand bonus should push higher.
    act(() => {
      useGameStore.setState({
        challengeScores: [85, 85, 85, 85],
        mrSausageDemands: {
          ...TEST_DEMANDS,
          desiredIngredients: ['Beef', 'Onion', 'Garlic'],
          hatedIngredients: [],
        },
        playerDecisions: {
          ...TEST_DECISIONS,
          chosenForm: 'link', // +15
          finalCookLevel: 0.45, // +10 (exact medium)
          selectedIngredients: ['Beef', 'Onion'], // +16
          flairPoints: [], // 0
        },
      });
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge onComplete={jest.fn()} />);
    });

    // Total demand bonus: 15 + 10 + 16 + 0 = 41
    // Clamped: min(100, 85 + 41) = 100
    // Advance through all phases to scores phase + reveal all scores
    advancePhase(1300);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(2100);
    advancePhase(5000);

    const text = flatText(tree!);
    expect(text).toContain('100.0'); // Adjusted total clamped at 100

    act(() => tree!.unmount());
  });
});
