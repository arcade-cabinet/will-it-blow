/**
 * @module dialogue/blowout
 * Mr. Sausage's commentary for the blowout challenge.
 * The player must blow the sausage contents onto the cereal box on the dining table.
 */
import type {DialogueLine} from '../../engine/DialogueEngine';

/** Opening dialogue when the blowout challenge begins. */
export const BLOWOUT_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'You tied it. Now comes the moment this whole game is named after.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: 'Aim at MY cereal box. Hold to build pressure. Release to BLOW.',
    reaction: 'talk',
    choices: [
      {
        text: 'Wait — your cereal box?',
        response: {
          speaker: 'sausage',
          text: "Mr. Sausage's Own. Seven stars. You'll ruin it beautifully.",
          reaction: 'laugh',
        },
      },
      {
        text: "Let's do this.",
        response: {
          speaker: 'sausage',
          text: 'Cover it. Every inch.',
          reaction: 'nod',
        },
      },
    ],
  },
];

/** Played when blowout completes successfully. */
export const BLOWOUT_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Look at that. My masterpiece, expressed.',
    reaction: 'nod',
  },
];
