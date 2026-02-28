import type {DialogueLine} from '../../engine/DialogueEngine';

export const GRINDING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Now grind my meat. And grind it WELL.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'Not too fast. Not too slow.',
    reaction: 'talk',
    choices: [
      {
        text: 'This is insane.',
        response: {
          speaker: 'sausage',
          text: "Insane? I prefer 'passionate.' Now grind.",
          reaction: 'laugh',
        },
        effect: 'taunt',
      },
      {
        text: "I'll do my best.",
        response: {
          speaker: 'sausage',
          text: 'Your best had better be enough.',
          reaction: 'nod',
        },
      },
    ],
  },
];

export const GRINDING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Beautiful consistency. Maybe there's hope for you.",
    reaction: 'nod',
  },
];
