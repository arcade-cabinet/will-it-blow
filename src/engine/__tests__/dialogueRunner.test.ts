/**
 * Tests for the dialogue runner bridge that connects DialogueEngine.applyEffects()
 * to the game store (T2.D). Verifies that effect deltas are correctly translated
 * into ECS state mutations.
 */

import {describe, expect, it} from 'vitest';
import {DialogueEngine, type DialogueLine, type EffectDeltas} from '../DialogueEngine';
import {applyDialogueDeltas} from '../dialogueRunner';

// ---------------------------------------------------------------------------
// applyDialogueDeltas — pure function that maps EffectDeltas to store patches
// ---------------------------------------------------------------------------

describe('applyDialogueDeltas — maps EffectDeltas to store patches (T2.D)', () => {
  it('returns empty patch for zeroed deltas', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 0,
      scorePenalty: 0,
      strikeAdd: 0,
      timeDeductSec: 0,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.timeBonusSec).toBe(0);
    expect(patch.scorePenalty).toBe(0);
    expect(patch.strikeAdd).toBe(0);
    expect(patch.timeDeductSec).toBe(0);
  });

  it('passes through positive timeBonusSec', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 5,
      scorePenalty: 0,
      strikeAdd: 0,
      timeDeductSec: 0,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.timeBonusSec).toBe(5);
  });

  it('passes through negative scorePenalty', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 0,
      scorePenalty: -10,
      strikeAdd: 0,
      timeDeductSec: 0,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.scorePenalty).toBe(-10);
  });

  it('passes through strikeAdd', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 0,
      scorePenalty: 0,
      strikeAdd: 2,
      timeDeductSec: 0,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.strikeAdd).toBe(2);
  });

  it('passes through timeDeductSec', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 0,
      scorePenalty: 0,
      strikeAdd: 0,
      timeDeductSec: 3,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.timeDeductSec).toBe(3);
  });

  it('handles multiple simultaneous deltas', () => {
    const deltas: EffectDeltas = {
      timeBonusSec: 10,
      scorePenalty: -20,
      strikeAdd: 1,
      timeDeductSec: 6,
    };
    const patch = applyDialogueDeltas(deltas);
    expect(patch.timeBonusSec).toBe(10);
    expect(patch.scorePenalty).toBe(-20);
    expect(patch.strikeAdd).toBe(1);
    expect(patch.timeDeductSec).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Integration: DialogueEngine.applyEffects() -> applyDialogueDeltas()
// ---------------------------------------------------------------------------

describe('DialogueEngine -> applyDialogueDeltas integration (T2.D)', () => {
  const DIALOGUE_WITH_EFFECTS: DialogueLine[] = [
    {
      speaker: 'sausage',
      text: 'Choose wisely.',
      choices: [
        {
          text: 'Help me!',
          response: {speaker: 'sausage', text: 'Fine.'},
          effect: 'hint',
        },
        {
          text: 'You stink!',
          response: {speaker: 'sausage', text: 'HOW DARE YOU'},
          effect: 'anger',
        },
      ],
    },
  ];

  it('hint effect produces a positive time bonus via the bridge', () => {
    const engine = new DialogueEngine(DIALOGUE_WITH_EFFECTS);
    engine.selectChoice(0); // hint
    const deltas = engine.applyEffects();
    const patch = applyDialogueDeltas(deltas);
    expect(patch.timeBonusSec).toBeGreaterThan(0);
  });

  it('anger effect produces a strike via the bridge', () => {
    const engine = new DialogueEngine(DIALOGUE_WITH_EFFECTS);
    engine.selectChoice(1); // anger
    const deltas = engine.applyEffects();
    const patch = applyDialogueDeltas(deltas);
    expect(patch.strikeAdd).toBeGreaterThanOrEqual(1);
  });
});
