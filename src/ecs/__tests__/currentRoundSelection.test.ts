/**
 * Contract test for the composition-pillar selection plumbing (T0.B).
 *
 * `currentRoundSelection` is the bridge between PhysicsFreezerChest
 * (where the player drags ingredients out) and Stuffer (which reads
 * the selection to drive `compositeMix` and tint the casing). Without
 * this, the composition pillar is not wired end-to-end and the
 * Zoombinis-in-Hell pillar is invisible to the player.
 *
 * This file pins:
 *  - the action surface (addToSelection / removeFromSelection /
 *    clearSelection)
 *  - the derived selector (state.currentRoundSelection returns the
 *    full IngredientDef array for the IDs in selectedIngredientIds)
 *  - that the selection survives `compositeMix()` cleanly (no
 *    null-safety errors)
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {compositeMix} from '../../engine/IngredientComposition';
import {useGameStore} from '../hooks';
import {resetWorld} from '../kootaWorld';

const getState = () => useGameStore.getState();

beforeEach(() => {
  resetWorld();
});

describe('currentRoundSelection', () => {
  it('starts empty', () => {
    expect(getState().currentRoundSelection).toEqual([]);
  });

  it('addToSelection appends an IngredientDef-resolved entry', () => {
    getState().addToSelection('banana');
    const sel = getState().currentRoundSelection;
    expect(sel).toHaveLength(1);
    expect(sel[0].id).toBe('banana');
    // Spot-check the composition profile is wired through
    expect(sel[0].composition).toBeDefined();
    expect(sel[0].composition.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('addToSelection ignores unknown ingredient ids', () => {
    getState().addToSelection('not-a-real-ingredient');
    expect(getState().currentRoundSelection).toEqual([]);
  });

  it('removeFromSelection drops one matching entry', () => {
    getState().addToSelection('banana');
    getState().addToSelection('steak');
    expect(getState().currentRoundSelection.map(d => d.id)).toEqual(['banana', 'steak']);
    getState().removeFromSelection('banana');
    expect(getState().currentRoundSelection.map(d => d.id)).toEqual(['steak']);
  });

  it('clearSelection empties the round', () => {
    getState().addToSelection('banana');
    getState().addToSelection('steak');
    getState().clearSelection();
    expect(getState().currentRoundSelection).toEqual([]);
  });

  it('selection drives compositeMix without errors on common ingredients', () => {
    // Pull two definitely-present ingredients from the roster.
    getState().addToSelection('banana');
    getState().addToSelection('steak');
    const sel = getState().currentRoundSelection;
    // Sanity: the test fixture matches the roster
    expect(sel.length).toBeGreaterThan(0);
    const mix = compositeMix(sel);
    expect(mix.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(mix.density).toBeGreaterThanOrEqual(0);
    expect(mix.density).toBeLessThanOrEqual(1);
    // Decomposition weights sum to 1 (within float tolerance)
    const total = Object.values(mix.decompositionWeights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 4);
  });

  it('selection clears on returnToMenu and startNewGame', () => {
    getState().addToSelection('banana');
    expect(getState().currentRoundSelection).toHaveLength(1);
    getState().returnToMenu();
    expect(getState().currentRoundSelection).toEqual([]);

    getState().addToSelection('banana');
    expect(getState().currentRoundSelection).toHaveLength(1);
    getState().startNewGame();
    expect(getState().currentRoundSelection).toEqual([]);
  });

  it('selection clears on nextRound', () => {
    getState().addToSelection('banana');
    expect(getState().currentRoundSelection).toHaveLength(1);
    getState().nextRound();
    expect(getState().currentRoundSelection).toEqual([]);
  });
});
