import type {DialogueLine} from '../../engine/DialogueEngine';

export const VERDICT_S: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: '...',
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: '*chews slowly*',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'This... this is PERFECT.',
    reaction: 'excitement',
  },
  {
    speaker: 'sausage',
    text: 'The snap. The juice. The FLAVOR.',
    reaction: 'excitement',
  },
  {
    speaker: 'sausage',
    text: "I haven't tasted anything like this since... since I was human.",
    reaction: 'nervous',
  },
  {
    speaker: 'sausage',
    text: "THE SAUSAGE KING. You've earned it. Now get out before I change my mind.",
    reaction: 'nod',
  },
];

export const VERDICT_A: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: '...',
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: '*chews thoughtfully*',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Hmm. It's... acceptable.",
    reaction: 'nod',
  },
  {
    speaker: 'sausage',
    text: "But 'acceptable' doesn't cut it in MY kitchen.",
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: 'Close. So painfully close. Again.',
    reaction: 'talk',
  },
];

export const VERDICT_B: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: '...',
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: '*spits into napkin*',
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: 'Mediocre. The texture of wet cardboard. The flavor of regret.',
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: "I've eaten gas station sausages with more soul than this.",
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'Do you know what happens to mediocre sausage makers in this kitchen?',
    reaction: 'nervous',
  },
  {
    speaker: 'sausage',
    text: "...Don't look in the freezer.",
    reaction: 'laugh',
  },
];

export const VERDICT_F: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: '...',
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: '*violent gagging*',
    reaction: 'flinch',
  },
  {
    speaker: 'sausage',
    text: 'UNACCEPTABLE.',
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: "This isn't sausage. This is a CRIME AGAINST MEAT.",
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: "You know what? I've been patient. I've been reasonable.",
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'But the grinder is hungry. And YOU look like you have the right fat content.',
    reaction: 'laugh',
  },
  {
    speaker: 'sausage',
    text: 'You are the sausage now.',
    reaction: 'laugh',
  },
];
