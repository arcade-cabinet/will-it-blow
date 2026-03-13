/**
 * DialogueEngine tests — covers traversal, branching, effect recording,
 * and the new applyEffects() method that produces observable state changes.
 */

import {DialogueEngine, type DialogueLine} from '../DialogueEngine';

const SIMPLE_LINES: DialogueLine[] = [
  {speaker: 'sausage', text: 'Welcome to the kitchen.', reaction: 'idle'},
  {speaker: 'sausage', text: 'Let us begin.', reaction: 'talk'},
];

const BRANCHING_LINES: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'What do you think of my kitchen?',
    reaction: 'judging',
    choices: [
      {
        text: "It's terrifying.",
        response: {
          speaker: 'sausage',
          text: 'Good. Fear is the first ingredient.',
          reaction: 'laugh',
        },
        effect: 'hint',
      },
      {
        text: "It's fine, I guess.",
        response: {speaker: 'sausage', text: 'Fine?! FINE?!', reaction: 'disgust'},
        effect: 'anger',
      },
      {
        text: 'I love sausages!',
        response: {speaker: 'sausage', text: "Then you'll enjoy this.", reaction: 'excitement'},
        effect: 'taunt',
      },
    ],
  },
  {speaker: 'sausage', text: 'Moving on.'},
];

const MULTI_EFFECT_LINES: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Question one.',
    choices: [
      {text: 'A', response: {speaker: 'sausage', text: 'A!'}, effect: 'hint'},
      {text: 'B', response: {speaker: 'sausage', text: 'B!'}, effect: 'stall'},
    ],
  },
  {
    speaker: 'sausage',
    text: 'Question two.',
    choices: [
      {text: 'C', response: {speaker: 'sausage', text: 'C!'}, effect: 'taunt'},
      {text: 'D', response: {speaker: 'sausage', text: 'D!'}, effect: 'anger'},
    ],
  },
];

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

describe('DialogueEngine — basic traversal', () => {
  it('starts at the first line', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    const line = engine.getCurrentLine();
    expect(line?.text).toBe('Welcome to the kitchen.');
    expect(line?.speaker).toBe('sausage');
  });

  it('advances through lines sequentially', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    engine.advance();
    expect(engine.getCurrentLine()?.text).toBe('Let us begin.');
  });

  it('reports isComplete when past the last line', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(true);
  });

  it('returns undefined for getCurrentLine when complete', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    engine.advance();
    engine.advance();
    expect(engine.getCurrentLine()).toBeUndefined();
  });

  it('handles empty line array', () => {
    const engine = new DialogueEngine([]);
    expect(engine.isComplete()).toBe(true);
    expect(engine.getCurrentLine()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Choices and branching
// ---------------------------------------------------------------------------

describe('DialogueEngine — choices and branching', () => {
  it('getChoices returns choices when present', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    const choices = engine.getChoices();
    expect(choices).toHaveLength(3);
    expect(choices[0].text).toBe("It's terrifying.");
  });

  it('getChoices returns empty array when no choices', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    expect(engine.getChoices()).toEqual([]);
  });

  it('selectChoice returns the response line', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    const response = engine.selectChoice(0);
    expect(response.text).toBe('Good. Fear is the first ingredient.');
    expect(response.reaction).toBe('laugh');
  });

  it('selectChoice throws on invalid index', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    expect(() => engine.selectChoice(-1)).toThrow();
    expect(() => engine.selectChoice(3)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Effect recording
// ---------------------------------------------------------------------------

describe('DialogueEngine — effect recording', () => {
  it('records effect from selectChoice', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0); // 'hint' effect
    expect(engine.getEffects()).toEqual(['hint']);
  });

  it('accumulates multiple effects across choices', () => {
    const engine = new DialogueEngine(MULTI_EFFECT_LINES);
    engine.selectChoice(0); // 'hint'
    engine.advance();
    engine.selectChoice(1); // 'anger'
    expect(engine.getEffects()).toEqual(['hint', 'anger']);
  });

  it('hasEffect returns true for recorded effects', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(1); // 'anger'
    expect(engine.hasEffect('anger')).toBe(true);
    expect(engine.hasEffect('hint')).toBe(false);
  });

  it('getEffects returns a copy (not a reference)', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0);
    const effects = engine.getEffects();
    effects.push('stall');
    expect(engine.getEffects()).toEqual(['hint']);
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('DialogueEngine — reset', () => {
  it('reset clears position and effects', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0);
    engine.advance();
    engine.reset();
    expect(engine.getCurrentLine()?.text).toBe('What do you think of my kitchen?');
    expect(engine.getEffects()).toEqual([]);
    expect(engine.isComplete()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyEffects — the new system that makes effects produce state changes
// ---------------------------------------------------------------------------

describe('DialogueEngine — applyEffects produces state changes', () => {
  it('applyEffects returns a map of effect => state deltas', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0); // 'hint' effect
    const deltas = engine.applyEffects();
    expect(deltas).toBeDefined();
    expect(typeof deltas).toBe('object');
  });

  it('hint effect produces a timeBonusSec delta', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0); // 'hint' effect
    const deltas = engine.applyEffects();
    expect(deltas.timeBonusSec).toBeGreaterThan(0);
  });

  it('taunt effect produces a negative scorePenalty', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(2); // 'taunt' effect
    const deltas = engine.applyEffects();
    expect(deltas.scorePenalty).toBeLessThan(0);
  });

  it('anger effect produces a strikeAdd delta', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(1); // 'anger' effect
    const deltas = engine.applyEffects();
    expect(deltas.strikeAdd).toBeGreaterThanOrEqual(1);
  });

  it('stall effect produces a timeDeductSec delta', () => {
    const engine = new DialogueEngine(MULTI_EFFECT_LINES);
    engine.selectChoice(1); // 'stall' effect
    const deltas = engine.applyEffects();
    expect(deltas.timeDeductSec).toBeGreaterThan(0);
  });

  it('multiple effects accumulate in applyEffects', () => {
    const engine = new DialogueEngine(MULTI_EFFECT_LINES);
    engine.selectChoice(0); // 'hint'
    engine.advance();
    engine.selectChoice(1); // 'anger'
    const deltas = engine.applyEffects();
    expect(deltas.timeBonusSec).toBeGreaterThan(0);
    expect(deltas.strikeAdd).toBeGreaterThanOrEqual(1);
  });

  it('applyEffects returns zeroed deltas when no effects', () => {
    const engine = new DialogueEngine(SIMPLE_LINES);
    const deltas = engine.applyEffects();
    expect(deltas.timeBonusSec).toBe(0);
    expect(deltas.scorePenalty).toBe(0);
    expect(deltas.strikeAdd).toBe(0);
    expect(deltas.timeDeductSec).toBe(0);
  });

  it('applyEffects is idempotent — same result on multiple calls', () => {
    const engine = new DialogueEngine(BRANCHING_LINES);
    engine.selectChoice(0);
    const deltas1 = engine.applyEffects();
    const deltas2 = engine.applyEffects();
    expect(deltas1).toEqual(deltas2);
  });
});
