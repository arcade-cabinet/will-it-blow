/**
 * Integration test — verifies the Zoombinis deduction loop runs through
 * at least one full round via the Koota store, without mounting React
 * components or R3F.
 *
 * This test exercises: initializeHungerState → generateClue → player
 * picks ingredients → matchSelection evaluates → fridge depletes (or
 * disgust increments). It's the cheapest possible proof that the data
 * pipeline from ingredients.json → ClueGenerator → HungerState → round
 * evaluation is wired end-to-end.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {useGameStore} from '../../ecs/hooks';
import {resetWorld} from '../../ecs/kootaWorld';
import {generateClue, matchSelection} from '../ClueGenerator';
import {INGREDIENTS} from '../IngredientComposition';
import {createRunRngOrFallback} from '../RunSeed';

describe('Zoombinis deduction loop integration', () => {
  afterEach(() => {
    resetWorld();
  });

  it('initializes hunger state with all ingredient IDs in the fridge', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();

    const fridgeIds: string[] = JSON.parse(store.getFridgeInventoryJson());
    expect(fridgeIds.length).toBe(INGREDIENTS.length);
    expect(fridgeIds).toContain('banana');
    expect(fridgeIds).toContain('steak');
    expect(fridgeIds).toContain('arcade');
  });

  it('generates a clue from the fridge inventory', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();

    const fridgeIds: string[] = JSON.parse(store.getFridgeInventoryJson());
    const available = INGREDIENTS.filter(i => fridgeIds.includes(i.id));
    const rng = createRunRngOrFallback('test.clue.1');
    const clue = generateClue(1, available, rng);

    expect(clue.text.length).toBeGreaterThan(0);
    expect(clue.type).toBeDefined();
  });

  it('completes a successful match → depletes fridge', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();
    const initialCount = INGREDIENTS.length;

    // Generate a clue for round 1.
    const fridgeIds: string[] = JSON.parse(store.getFridgeInventoryJson());
    const available = INGREDIENTS.filter(i => fridgeIds.includes(i.id));
    const rng = createRunRngOrFallback('test.match.1');
    const clue = generateClue(1, available, rng);

    // Find an ingredient that satisfies all required traits.
    const satisfying = available.find(ing => {
      const result = matchSelection([ing], clue);
      return result.isMatch;
    });

    // If no single ingredient satisfies (multi-trait clue), try pairs.
    let selection = satisfying ? [satisfying] : [];
    if (!satisfying && clue.requiredTraits.length > 0) {
      for (const a of available) {
        for (const b of available) {
          if (a.id === b.id) continue;
          const result = matchSelection([a, b], clue);
          if (result.isMatch) {
            selection = [a, b];
            break;
          }
        }
        if (selection.length > 0) break;
      }
    }

    // Shock-me clues match anything.
    if (clue.type === 'shock-me' && selection.length === 0) {
      selection = [available[0]];
    }

    expect(selection.length).toBeGreaterThan(0);

    const result = matchSelection(selection, clue);
    expect(result.isMatch).toBe(true);

    // Deplete the matched ingredients from the fridge.
    store.depleteFromFridge(selection.map(i => i.id));

    const afterIds: string[] = JSON.parse(store.getFridgeInventoryJson());
    expect(afterIds.length).toBe(initialCount - selection.length);
  });

  it('increments disgust on a mismatch', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();

    // Generate a literal clue and submit a deliberately wrong selection.
    const rng = createRunRngOrFallback('test.disgust.1');
    const available = [...INGREDIENTS];
    const clue = generateClue(3, available, rng);

    // If it's a shock-me (always matches), skip this test iteration.
    if (clue.type === 'shock-me') return;

    // Pick an ingredient that does NOT satisfy the clue.
    const missingTraitSet = new Set(clue.requiredTraits);
    const wrong = available.find(ing => !ing.traits.some(t => missingTraitSet.has(t as any)));
    if (!wrong) return; // all ingredients share a trait with the clue

    const result = matchSelection([wrong], clue);
    expect(result.isMatch).toBe(false);

    const disgustDelta = result.missingTraits.length * 25;
    store.incrementDisgust(disgustDelta);

    const snap = useGameStore.getState();
    expect(snap.hungerDisgustMeter).toBeGreaterThan(0);
  });

  it('advancing rounds increments the round index', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();
    expect(useGameStore.getState().hungerRoundIndex).toBe(1);

    store.advanceRound();
    expect(useGameStore.getState().hungerRoundIndex).toBe(2);

    store.advanceRound();
    expect(useGameStore.getState().hungerRoundIndex).toBe(3);
  });

  it('depleting all ingredients results in an empty fridge (win condition)', () => {
    const store = useGameStore.getState();
    store.initializeHungerState();

    // Deplete everything in one go.
    store.depleteFromFridge(INGREDIENTS.map(i => i.id));

    const remaining: string[] = JSON.parse(store.getFridgeInventoryJson());
    expect(remaining.length).toBe(0);
  });
});
