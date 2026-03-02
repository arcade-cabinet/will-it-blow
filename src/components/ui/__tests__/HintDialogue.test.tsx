/**
 * @module HintDialogue.test
 * Tests for the HintDialogue hint generation logic and component behavior.
 *
 * Covers:
 * - Hint generation for each mood profile (cryptic, passive-aggressive, manic)
 * - Hint generation for each stage (0-3)
 * - Hints reference actual demand values (ingredients, form, cook preference)
 * - Duplicate hint prevention via attemptIndex rotation
 * - Component renders and auto-dismisses via store integration
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {INITIAL_GAME_STATE, useGameStore} from '../../../store/gameStore';
import type {HintDemands} from '../HintDialogue';
import {generateHint, HintDialogue} from '../HintDialogue';

const store = () => useGameStore.getState();
const reset = () => useGameStore.setState({...INITIAL_GAME_STATE});

/** Reusable test demands with known values for assertion. */
const TEST_DEMANDS: HintDemands = {
  preferredForm: 'LINKS',
  desiredIngredients: ['Lobster', 'Beef Wellington'],
  hatedIngredients: ['Water', 'Dirt'],
  cookPreference: 'medium',
  moodProfile: 'cryptic',
};

beforeEach(() => {
  jest.useFakeTimers();
  reset();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---- generateHint pure function tests ----

describe('generateHint', () => {
  describe('mood profiles', () => {
    it('generates cryptic hints with vague, metaphorical language', () => {
      const hint = generateHint(TEST_DEMANDS, 0, 'cryptic', 0);
      expect(hint.text).toBeTruthy();
      expect(hint.id).toContain('cryptic');
    });

    it('generates passive-aggressive hints', () => {
      const hint = generateHint(TEST_DEMANDS, 0, 'passive-aggressive', 0);
      expect(hint.text).toBeTruthy();
      expect(hint.id).toContain('passive-aggressive');
    });

    it('generates manic hints', () => {
      const hint = generateHint(TEST_DEMANDS, 0, 'manic', 0);
      expect(hint.text).toBeTruthy();
      expect(hint.id).toContain('manic');
    });

    it('falls back to cryptic for unknown mood profiles', () => {
      const hint = generateHint(TEST_DEMANDS, 0, 'unknown-mood', 0);
      expect(hint.id).toContain('cryptic');
    });
  });

  describe('stages', () => {
    it('stage 0 (fridge): generates ingredient-related hints', () => {
      const hint = generateHint(TEST_DEMANDS, 0, 'manic', 0);
      // Manic stage 0 hints should reference desired or hated ingredients
      const referencesIngredient =
        TEST_DEMANDS.desiredIngredients.some(i => hint.text.includes(i)) ||
        TEST_DEMANDS.hatedIngredients.some(i => hint.text.includes(i));
      expect(referencesIngredient).toBe(true);
    });

    it('stage 1 (grinder): generates texture-related hints', () => {
      const hint = generateHint(TEST_DEMANDS, 1, 'cryptic', 0);
      expect(hint.id).toContain('hint-1');
      expect(hint.text).toBeTruthy();
    });

    it('stage 2 (stuffer): generates form-related hints', () => {
      const hint = generateHint(TEST_DEMANDS, 2, 'manic', 0);
      expect(hint.text).toContain('LINKS');
      expect(hint.id).toContain('hint-2');
    });

    it('stage 3 (cooking): generates cook preference hints', () => {
      const hint = generateHint(TEST_DEMANDS, 3, 'passive-aggressive', 0);
      expect(hint.text).toContain('medium');
      expect(hint.id).toContain('hint-3');
    });

    it('clamps out-of-range stages to valid range', () => {
      const hintNeg = generateHint(TEST_DEMANDS, -1, 'cryptic', 0);
      expect(hintNeg.id).toContain('hint-0');

      const hintHigh = generateHint(TEST_DEMANDS, 99, 'cryptic', 0);
      expect(hintHigh.id).toContain('hint-3');
    });
  });

  describe('demand references', () => {
    it('stage 0 cryptic hints reference desired ingredients', () => {
      // Template 0: "The universe whispers of... {desired}..."
      const hint = generateHint(TEST_DEMANDS, 0, 'cryptic', 0);
      expect(hint.text).toContain('Lobster');
    });

    it('stage 0 cryptic hints reference hated ingredients', () => {
      // Template 1: "I sense a disturbance... something {hated}-shaped haunts my dreams..."
      // attemptIndex=1 -> hatedIngredients[1 % 2] = 'Dirt'
      const hint = generateHint(TEST_DEMANDS, 0, 'cryptic', 1);
      expect(hint.text).toContain('Dirt');
    });

    it('stage 0 cryptic template 3 references hated ingredient at index 0', () => {
      // Template 3: "A vision: {hated} in the grinder... no... NO..."
      // attemptIndex=3 -> hatedIngredients[3 % 2] = 'Dirt'
      const hint = generateHint(TEST_DEMANDS, 0, 'cryptic', 3);
      expect(hint.text).toContain('Dirt');
    });

    it('stage 2 hints reference preferred form', () => {
      const hint = generateHint(TEST_DEMANDS, 2, 'cryptic', 0);
      expect(hint.text).toContain('LINKS');
    });

    it('stage 3 hints reference cook preference', () => {
      const hint = generateHint(TEST_DEMANDS, 3, 'cryptic', 0);
      expect(hint.text).toContain('medium');
    });

    it('rotates through ingredients on repeated calls', () => {
      // attemptIndex=0 -> desiredIngredients[0] = 'Lobster'
      const hint0 = generateHint(TEST_DEMANDS, 0, 'cryptic', 0);
      expect(hint0.text).toContain('Lobster');

      // attemptIndex=2 -> template 2 uses {desired}, desiredIngredients[2%2] = 'Lobster'
      const hint2 = generateHint(TEST_DEMANDS, 0, 'cryptic', 2);
      expect(hint2.text).toContain('Lobster');

      // attemptIndex=4 -> template 4 uses {desired}, desiredIngredients[4%2] = 'Lobster'
      const hint4 = generateHint(TEST_DEMANDS, 0, 'cryptic', 4);
      expect(hint4.text).toContain('Lobster');
    });

    it('handles empty desired ingredients gracefully', () => {
      const emptyDemands: HintDemands = {
        ...TEST_DEMANDS,
        desiredIngredients: [],
      };
      const hint = generateHint(emptyDemands, 0, 'cryptic', 0);
      expect(hint.text).toContain('something special');
    });

    it('handles empty hated ingredients gracefully', () => {
      const emptyDemands: HintDemands = {
        ...TEST_DEMANDS,
        hatedIngredients: [],
      };
      const hint = generateHint(emptyDemands, 0, 'cryptic', 1);
      expect(hint.text).toContain('that thing');
    });
  });

  describe('hint IDs', () => {
    it('generates unique IDs based on stage, mood, and template index', () => {
      const h1 = generateHint(TEST_DEMANDS, 0, 'cryptic', 0);
      const h2 = generateHint(TEST_DEMANDS, 0, 'cryptic', 1);
      const h3 = generateHint(TEST_DEMANDS, 1, 'cryptic', 0);
      expect(h1.id).not.toBe(h2.id);
      expect(h1.id).not.toBe(h3.id);
    });

    it('different attempt indices produce different template selections', () => {
      const hints = new Set<string>();
      for (let i = 0; i < 5; i++) {
        hints.add(generateHint(TEST_DEMANDS, 0, 'cryptic', i).id);
      }
      // Should have 5 unique hint IDs (5 templates for stage 0 cryptic)
      expect(hints.size).toBe(5);
    });
  });
});

// ---- Duplicate prevention ----

describe('duplicate prevention', () => {
  it('same attemptIndex produces the same hint ID', () => {
    const h1 = generateHint(TEST_DEMANDS, 0, 'manic', 0);
    const h2 = generateHint(TEST_DEMANDS, 0, 'manic', 0);
    expect(h1.id).toBe(h2.id);
  });

  it('incrementing attemptIndex cycles through all templates before repeating', () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(generateHint(TEST_DEMANDS, 0, 'manic', i).id);
    }
    // First 5 should all be unique (5 templates), then cycle repeats
    const firstFive = new Set(ids.slice(0, 5));
    expect(firstFive.size).toBe(5);
    // IDs at index 0 and 5 should match (wraparound)
    expect(ids[0]).toBe(ids[5]);
  });
});

// ---- Component rendering tests ----

describe('HintDialogue component', () => {
  it('renders nothing when hintActive is false', () => {
    useGameStore.setState({hintActive: false});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HintDialogue demands={TEST_DEMANDS} />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it('renders nothing when demands are null', () => {
    useGameStore.setState({hintActive: true});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HintDialogue demands={null} />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it('renders a speech bubble when hintActive becomes true', () => {
    useGameStore.setState({hintActive: true, currentChallenge: 0});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HintDialogue demands={TEST_DEMANDS} />);
    });
    const json = tree!.toJSON();
    expect(json).not.toBeNull();

    // Find "MR. SAUSAGE" text in the rendered tree
    const flatText = JSON.stringify(json);
    expect(flatText).toContain('MR. SAUSAGE');
  });

  it('auto-dismisses by setting hintActive to false after timeout', () => {
    useGameStore.setState({hintActive: true, currentChallenge: 0});
    act(() => {
      renderer.create(<HintDialogue demands={TEST_DEMANDS} />);
    });

    // Advance past auto-dismiss timer (4000ms)
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // After the dismiss callback fires, the Animated slide-out starts (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(store().hintActive).toBe(false);
  });

  it('displays different hint text for different stages', () => {
    // Stage 0 with manic mood
    useGameStore.setState({hintActive: true, currentChallenge: 0});
    const manicDemands = {...TEST_DEMANDS, moodProfile: 'manic'};
    let tree0: renderer.ReactTestRenderer;
    act(() => {
      tree0 = renderer.create(<HintDialogue demands={manicDemands} />);
    });
    const text0 = JSON.stringify(tree0!.toJSON());

    // Clean up
    act(() => {
      jest.advanceTimersByTime(4300);
    });
    act(() => {
      tree0!.unmount();
    });

    // Move to stage 2
    useGameStore.setState({hintActive: true, currentChallenge: 2});
    let tree2: renderer.ReactTestRenderer;
    act(() => {
      tree2 = renderer.create(<HintDialogue demands={manicDemands} />);
    });
    const text2 = JSON.stringify(tree2!.toJSON());

    // Stage 2 (manic) references form (LINKS)
    expect(text2).toContain('LINKS');
    // They should not be identical
    expect(text0).not.toBe(text2);

    act(() => {
      tree2!.unmount();
    });
  });

  it('cleans up timer on unmount without throwing', () => {
    useGameStore.setState({hintActive: true, currentChallenge: 0});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HintDialogue demands={TEST_DEMANDS} />);
    });

    // Unmount before timer fires — should not throw
    act(() => {
      tree!.unmount();
    });

    // Advance timers past auto-dismiss — should not throw
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });
});

// ---- All mood x stage coverage ----

describe('coverage: all mood x stage combinations generate valid hints', () => {
  const moods = ['cryptic', 'passive-aggressive', 'manic'];
  const stages = [0, 1, 2, 3];

  for (const mood of moods) {
    for (const stage of stages) {
      it(`${mood} mood at stage ${stage} produces a non-empty hint`, () => {
        const hint = generateHint(TEST_DEMANDS, stage, mood, 0);
        expect(hint.text.length).toBeGreaterThan(0);
        expect(hint.id).toBeTruthy();
      });
    }
  }
});
