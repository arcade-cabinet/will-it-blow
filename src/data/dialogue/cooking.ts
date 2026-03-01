/**
 * @module dialogue/cooking
 * Mr. Sausage's commentary lines for the cooking challenge (challenge 4).
 * The player must cook the sausage to the right temperature on the stove.
 * Lines are fed to the DialogueEngine at challenge start and on completion.
 */
import type {DialogueLine} from '../../engine/DialogueEngine';

/** Opening dialogue when the cooking challenge begins. Includes a choice that can yield a temperature hint. */
export const COOKING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Last step. Cook my sausage to perfection.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Don't you DARE burn my beautiful creation.",
    reaction: 'talk',
    choices: [
      {
        text: 'What temperature?',
        response: {
          speaker: 'sausage',
          text: "You'll know it's right when the skin sings. Listen carefully.",
          reaction: 'nod',
        },
        effect: 'hint',
      },
      {
        text: "I won't let you down.",
        response: {
          speaker: 'sausage',
          text: 'Famous last words. Prove it.',
          reaction: 'talk',
        },
      },
    ],
  },
];

/** Played when the player finishes cooking without burning or undercooking the sausage. */
export const COOKING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Done. Now bring it to me.',
    reaction: 'talk',
  },
];
