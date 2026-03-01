/**
 * @module dialogue/stuffing
 * Mr. Sausage's commentary lines for the stuffing challenge (challenge 3).
 * The player must fill the sausage casing at the right pressure without bursting it.
 * Lines are fed to the DialogueEngine at challenge start and on completion.
 */
import type {DialogueLine} from '../../engine/DialogueEngine';

/** Opening dialogue when the stuffing challenge begins. Warns about pressure control. */
export const STUFFING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Fill the casing. Gently.',
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Too much pressure and... well, you'll see.",
    reaction: 'nervous',
    choices: [
      {
        text: 'What happens if it bursts?',
        response: {
          speaker: 'sausage',
          text: "Let's just say cleanup is... unpleasant. For everyone involved.",
          reaction: 'laugh',
        },
      },
      {
        text: 'Steady hands. Got it.',
        response: {
          speaker: 'sausage',
          text: "Good. Confidence. I like that. Don't make me regret it.",
          reaction: 'nod',
        },
      },
    ],
  },
];

/** Played when the player fills the casing without tearing it. */
export const STUFFING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Not a single tear. I'm... almost impressed.",
    reaction: 'nod',
  },
];
