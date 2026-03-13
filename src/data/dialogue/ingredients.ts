/**
 * @module dialogue/ingredients
 * Mr. Sausage's commentary lines for the ingredient selection challenge (challenge 1).
 * The player picks ingredients from the fridge to build a sausage recipe.
 * Lines are fed to the DialogueEngine at challenge start and on success/failure.
 */
import type {DialogueLine} from '../../engine/DialogueEngine';

/** Opening dialogue when the ingredient challenge begins. Includes a choice that can yield an ingredient hint. */
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

/** Played when the player picks a well-balanced set of ingredients. */
export const INGREDIENTS_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Good. You're not completely useless.",
    reaction: 'nod',
  },
];

/** Played when the player's ingredient choices are poor or unbalanced. */
export const INGREDIENTS_FAIL: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: 'Disappointing. Truly disappointing.',
    reaction: 'disgust',
  },
];
