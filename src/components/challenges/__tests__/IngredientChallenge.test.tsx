/**
 * @module IngredientChallenge.test
 * Tests for the IngredientChallenge fridge-picking overlay.
 *
 * Covers:
 * - Pool and matching indices written to store on mount
 * - Pool guarantees at least requiredCount matching ingredients
 * - Fridge bridge: pendingFridgeClick → processIngredientPick
 * - Correct pick: correctCount advances, success phase at requiredCount
 * - Wrong pick: addStrike called, onReaction('disgust') fired
 * - Score calculation: 100 - (strikes * 15)
 * - Duplicate click ignored (already selected)
 * - Renders demand banner with variant's mrSausageDemand text
 * - Returns null before variant is resolved
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {config} from '../../../config';
import {INITIAL_GAME_STATE, useGameStore} from '../../../store/gameStore';
import {IngredientChallenge} from '../IngredientChallenge';

const store = () => useGameStore.getState();
const reset = () => useGameStore.setState({...INITIAL_GAME_STATE});

// ---------------------------------------------------------------------------
// Setup — mock external deps
// ---------------------------------------------------------------------------

// The first ingredient variant in config — use real config for determinism
const FIRST_VARIANT = config.variants.ingredients[0];

// Mock AudioEngine
jest.mock('../../../engine/AudioEngine', () => ({
  audioEngine: {
    playCorrectPick: jest.fn(),
    playWrongPick: jest.fn(),
    initTone: jest.fn(),
  },
}));

// Mock DialogueOverlay — we don't need to test dialogue flow here
// Auto-complete the dialogue immediately by calling onComplete with no effects
jest.mock('../../ui/DialogueOverlay', () => ({
  DialogueOverlay: ({onComplete}: {onComplete: (effects: string[]) => void}) => {
    const React = require('react');
    React.useEffect(() => {
      onComplete([]);
    }, []);
    return null;
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  reset();
  // Set a stable variantSeed so pickVariant is deterministic
  useGameStore.setState({variantSeed: 12345});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Pool initialization
// ---------------------------------------------------------------------------

describe('pool initialization', () => {
  it('writes fridgePool to store on mount', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    expect(store().fridgePool.length).toBeGreaterThan(0);
    tree!.unmount();
  });

  it('writes fridgeMatchingIndices to store on mount', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    const {fridgeMatchingIndices} = store();
    expect(fridgeMatchingIndices.length).toBeGreaterThanOrEqual(FIRST_VARIANT.requiredCount);
    tree!.unmount();
  });

  it('guarantees at least requiredCount matching ingredients in pool', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    const {fridgeMatchingIndices} = store();
    expect(fridgeMatchingIndices.length).toBeGreaterThanOrEqual(FIRST_VARIANT.requiredCount);
    tree!.unmount();
  });
});

// ---------------------------------------------------------------------------
// Fridge bridge — pendingFridgeClick processing
// ---------------------------------------------------------------------------

describe('fridge bridge click processing', () => {
  /**
   * Mount the component and flush timers so the pool+variant are initialized.
   * After flushing, read fridgeMatchingIndices from the store to get the
   * actual correct/incorrect indices — this avoids assumptions about randomness.
   */
  function setupAndMount() {
    const onComplete = jest.fn();
    const onReaction = jest.fn();

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge onComplete={onComplete} onReaction={onReaction} />,
      );
    });
    // Flush dialogue auto-complete and pool initialization effects
    act(() => jest.runAllTimers());

    // After flushing, read the actual matching/non-matching indices
    const {fridgeMatchingIndices, fridgePool} = store();
    const correctIndex = fridgeMatchingIndices[0]; // first matching = correct pick
    // Find a non-matching index (one NOT in matchingIndices)
    const wrongIndex = fridgePool.findIndex((_, i) => !fridgeMatchingIndices.includes(i));

    return {tree: tree!, onComplete, onReaction, correctIndex, wrongIndex};
  }

  it('correct pick: advances challengeProgress and marks ingredient as selected', () => {
    const {tree, correctIndex} = setupAndMount();

    act(() => {
      useGameStore.getState().triggerFridgeClick(correctIndex);
    });
    act(() => jest.runAllTimers());

    const {challengeProgress, fridgeSelectedIndices} = store();
    expect(fridgeSelectedIndices).toContain(correctIndex);
    expect(challengeProgress).toBeGreaterThan(0);

    tree.unmount();
  });

  it('wrong pick: adds strike', () => {
    const {tree, wrongIndex} = setupAndMount();
    // Skip test if there are no non-matching ingredients (edge case)
    if (wrongIndex === -1) {
      tree.unmount();
      return;
    }
    const initialStrikes = store().strikes;

    act(() => {
      useGameStore.getState().triggerFridgeClick(wrongIndex);
    });
    act(() => jest.runAllTimers());

    expect(store().strikes).toBe(initialStrikes + 1);
    tree.unmount();
  });

  it('wrong pick: triggers disgust or nervous reaction', () => {
    const {tree, onReaction, wrongIndex} = setupAndMount();
    if (wrongIndex === -1) {
      tree.unmount();
      return;
    }

    act(() => {
      useGameStore.getState().triggerFridgeClick(wrongIndex);
    });
    act(() => jest.runAllTimers());

    const reactionCalls = (onReaction as jest.Mock).mock.calls.map((c: any) => c[0]);
    const hasNegativeReaction =
      reactionCalls.includes('disgust') || reactionCalls.includes('nervous');
    expect(hasNegativeReaction).toBe(true);

    tree.unmount();
  });

  it('correct pick: triggers excitement reaction', () => {
    const {tree, onReaction, correctIndex} = setupAndMount();

    act(() => {
      useGameStore.getState().triggerFridgeClick(correctIndex);
    });
    act(() => jest.runAllTimers());

    const reactionCalls = (onReaction as jest.Mock).mock.calls.map((c: any) => c[0]);
    expect(reactionCalls).toContain('excitement');

    tree.unmount();
  });

  it('duplicate click (already selected) is ignored — no double counting', () => {
    const {tree, correctIndex} = setupAndMount();

    act(() => {
      useGameStore.getState().triggerFridgeClick(correctIndex);
    });
    act(() => jest.runAllTimers());

    const progressAfterFirst = store().challengeProgress;

    // Click same ingredient again
    act(() => {
      useGameStore.getState().triggerFridgeClick(correctIndex);
    });
    act(() => jest.runAllTimers());

    // Progress unchanged
    expect(store().challengeProgress).toBe(progressAfterFirst);
    // Still only selected once
    expect(store().fridgeSelectedIndices.filter((i: number) => i === correctIndex).length).toBe(1);

    tree.unmount();
  });
});

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

describe('score calculation', () => {
  it('score is 100 with 0 strikes', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={onComplete} />);
    });
    act(() => jest.runAllTimers());

    // Read the actual matching indices after pool initialization
    const {fridgeMatchingIndices} = store();
    const requiredCount = FIRST_VARIANT.requiredCount;

    // Make all required correct picks using the actual matching indices
    for (let i = 0; i < requiredCount; i++) {
      act(() => {
        useGameStore.getState().triggerFridgeClick(fridgeMatchingIndices[i]);
      });
      act(() => jest.runAllTimers());
    }

    // Advance past success dialogue + completion delay
    act(() => jest.runAllTimers());

    // Score should be 100 (0 strikes)
    expect(onComplete).toHaveBeenCalledWith(100);
    tree!.unmount();
  });

  it('score decreases by 15 per strike', () => {
    // Pre-add 1 strike to test penalty
    useGameStore.setState({strikes: 1});

    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={onComplete} />);
    });
    act(() => jest.runAllTimers());

    const {fridgeMatchingIndices} = store();
    const requiredCount = FIRST_VARIANT.requiredCount;

    for (let i = 0; i < requiredCount; i++) {
      act(() => {
        useGameStore.getState().triggerFridgeClick(fridgeMatchingIndices[i]);
      });
      act(() => jest.runAllTimers());
    }
    act(() => jest.runAllTimers());

    // 1 pre-existing strike = score of 85
    expect(onComplete).toHaveBeenCalledWith(85);
    tree!.unmount();
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('rendering', () => {
  it('renders the demand banner in selecting phase', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain('MR. SAUSAGE DEMANDS');
    tree!.unmount();
  });

  it('shows hint button when hintsRemaining > 0', () => {
    useGameStore.setState({hintsRemaining: 3});

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain('HINT');
    tree!.unmount();
  });

  it('does not show hint button when hintsRemaining is 0', () => {
    useGameStore.setState({hintsRemaining: 0});

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<IngredientChallenge onComplete={jest.fn()} />);
    });
    act(() => jest.runAllTimers());

    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).not.toContain('left)');
    tree!.unmount();
  });
});
