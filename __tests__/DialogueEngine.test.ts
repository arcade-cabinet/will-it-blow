import type {DialogueLine} from '../src/engine/DialogueEngine';
import {DialogueEngine} from '../src/engine/DialogueEngine';

const sampleDialogue: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Welcome to my kitchen.',
    reaction: 'talk',
    choices: [
      {
        text: 'Where am I?',
        effect: 'stall',
        response: {
          speaker: 'sausage',
          text: "You're exactly where you need to be.",
          reaction: 'laugh',
        },
      },
      {
        text: "Let's get this over with.",
        effect: 'anger',
        response: {
          speaker: 'sausage',
          text: "Impatient? That's a mistake.",
          reaction: 'disgust',
        },
      },
    ],
  },
  {speaker: 'sausage', text: 'Now, open that fridge.', reaction: 'nod'},
];

describe('DialogueEngine', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = new DialogueEngine(sampleDialogue);
  });

  it('starts at first line', () => {
    const line = engine.getCurrentLine();
    expect(line).toBeDefined();
    expect(line!.speaker).toBe('sausage');
    expect(line!.text).toBe('Welcome to my kitchen.');
  });

  it('reports available choices', () => {
    const choices = engine.getChoices();
    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe('Where am I?');
    expect(choices[1].text).toBe("Let's get this over with.");
  });

  it('returns empty choices when line has none', () => {
    engine.advance();
    const choices = engine.getChoices();
    expect(choices).toHaveLength(0);
  });

  it('selectChoice returns the response line', () => {
    const response = engine.selectChoice(0);
    expect(response.speaker).toBe('sausage');
    expect(response.text).toBe("You're exactly where you need to be.");
    expect(response.reaction).toBe('laugh');
  });

  it('selectChoice records the effect', () => {
    engine.selectChoice(1);
    const effects = engine.getEffects();
    expect(effects).toContain('anger');
  });

  it('advance moves to next line', () => {
    engine.advance();
    const line = engine.getCurrentLine();
    expect(line).toBeDefined();
    expect(line!.text).toBe('Now, open that fridge.');
    expect(line!.reaction).toBe('nod');
  });

  it('isComplete returns true past last line', () => {
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(true);
  });

  it('tracks multiple effects', () => {
    engine.selectChoice(0); // stall
    engine.selectChoice(1); // anger
    const effects = engine.getEffects();
    expect(effects).toEqual(['stall', 'anger']);
  });

  it('hasEffect checks for specific effect', () => {
    expect(engine.hasEffect('stall')).toBe(false);
    engine.selectChoice(0); // stall
    expect(engine.hasEffect('stall')).toBe(true);
    expect(engine.hasEffect('anger')).toBe(false);
  });
});
