/**
 * @module dialogue/chopping
 * Mr. Sausage's commentary lines for the chopping challenge (challenge 2).
 * The player chops selected ingredients on the cutting board in rhythm.
 * Lines are fed to the DialogueEngine at challenge start and on completion.
 */
import type {DialogueLine} from '../../engine/DialogueEngine';

/** Opening dialogue when the chopping challenge begins. */
export const CHOPPING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Now... CHOP. Every piece must be perfect.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'Time your cuts. Feel the rhythm of the blade.',
    reaction: 'talk',
    choices: [
      {
        text: "I've never chopped before.",
        response: {
          speaker: 'sausage',
          text: "Then you'll learn fast. Or you won't.",
          reaction: 'laugh',
        },
        effect: 'taunt',
      },
      {
        text: 'Consider it done.',
        response: {
          speaker: 'sausage',
          text: 'Bold words. The blade will judge you.',
          reaction: 'nod',
        },
      },
    ],
  },
];

/** Played when the player completes all chops in time. */
export const CHOPPING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Acceptable knife work. The ingredients are ready.',
    reaction: 'nod',
  },
];
