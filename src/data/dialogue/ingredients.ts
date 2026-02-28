import type {DialogueLine} from '../../engine/DialogueEngine';

export const INGREDIENTS_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'First things first. Open that fridge.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'I have specific tastes. Choose wisely.',
    reaction: 'talk',
    choices: [
      {
        text: 'What if I choose wrong?',
        response: {
          speaker: 'sausage',
          text: 'Then we find out what YOU taste like. Just kidding. Maybe.',
          reaction: 'laugh',
        },
      },
      {
        text: 'Give me a hint.',
        response: {
          speaker: 'sausage',
          text: 'Balance. Flavor without recklessness. Think about what goes together.',
          reaction: 'nod',
        },
        effect: 'hint',
      },
    ],
  },
];

export const INGREDIENTS_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Good. You're not completely useless.",
    reaction: 'nod',
  },
];

export const INGREDIENTS_FAIL: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Disappointing. Truly disappointing.',
    reaction: 'disgust',
  },
];
