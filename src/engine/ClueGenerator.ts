/**
 * @module ClueGenerator
 * The Zoombinis-in-Hell deduction engine (T0.C).
 *
 * Mr. Sausage looks at the remaining fridge inventory, picks a subset
 * of traits that multiple ingredients share, and phrases a cryptic
 * clue. The player must read the clue, deduce which ingredients
 * satisfy those traits, and assemble a matching selection. Correctness
 * is evaluated by `matchSelection`: superset-legal, with a coherence
 * bonus/penalty for cramming.
 *
 * Three clue templates:
 *  1. **literal** — "My tummy rumbles for something <traitA> and <traitB>"
 *  2. **misdirection** — flavour text with underlying trait extraction
 *  3. **shock-me** — "Shock me!" — scored on creativity (diversity)
 *
 * The module is pure (no React, no ECS) so it can be unit-tested and
 * composed into the round manager / dialogue system.
 */
import type {IngredientDef, IngredientTrait} from './IngredientComposition';
import {traitSetOf} from './IngredientComposition';

// --- Types -------------------------------------------------------------------

export type ClueType = 'literal' | 'misdirection' | 'shock-me';

export interface Clue {
  /** Human-readable clue text for SurrealText rendering. */
  readonly text: string;
  /** The trait requirements the player's selection must cover. */
  readonly requiredTraits: readonly IngredientTrait[];
  /** Hint at how many ingredients the player should pick (0 = no hint). */
  readonly ingredientCountHint: number;
  /** Which template generated this clue. */
  readonly type: ClueType;
  /**
   * For misdirection clues, the "true" underlying traits (which may
   * differ from what the flavour text implies). For literal/shock-me
   * clues, same as `requiredTraits`.
   */
  readonly underlyingTraits: readonly IngredientTrait[];
}

export interface MatchResult {
  /** Whether the selection satisfies all required traits. */
  readonly isMatch: boolean;
  /** Which required traits are NOT covered by any selected ingredient. */
  readonly missingTraits: readonly IngredientTrait[];
  /**
   * 0-1 measure of how "coherent" an oversized selection is.
   * High coherence (>0.5) = the extra ingredients thematically fit.
   * Low coherence (<0.5) = incoherent cramming.
   */
  readonly bonusCoherence: number;
}

// --- Clue templates ----------------------------------------------------------

/**
 * Literal clue: "My tummy rumbles for something X and Y".
 * Traits are named directly in the text.
 */
function makeLiteralClue(traits: IngredientTrait[]): Clue {
  const traitList = traits.map(t => t.replace(/-/g, ' ')).join(' and ');
  return {
    text: `My tummy rumbles for something ${traitList}...`,
    requiredTraits: traits,
    ingredientCountHint: traits.length,
    type: 'literal',
    underlyingTraits: traits,
  };
}

/**
 * Misdirection templates — fantasy-flavour text with hidden trait lists.
 * 20+ entries for replayability. Every trait referenced here MUST exist
 * in the VALID_TRAITS set below; the `isValidTrait` filter catches
 * typos at runtime but we aim for zero false hits.
 */
const MISDIRECTION_TEMPLATES: {text: string; traits: IngredientTrait[]}[] = [
  // --- Original 8 ---
  {text: 'I dream of walrus marinated in sprite...', traits: ['meat', 'fatty', 'sweet', 'sour']},
  {text: 'Bring me something from the deep...', traits: ['wet', 'slimy', 'cold']},
  {text: "A memory of grandmother's kitchen...", traits: ['sweet', 'soft', 'warm']},
  {text: 'The crunch of bones beneath my teeth...', traits: ['brittle', 'hard', 'crunchy']},
  {text: 'Something that screams when you cut it...', traits: ['alive', 'wet', 'natural']},
  {text: 'I want to feel the BURN...', traits: ['spicy', 'dry', 'bright']},
  {text: 'Give me the forbidden fruit...', traits: ['sweet', 'cursed', 'plant']},
  {text: 'Metallic. Industrial. PERFECT.', traits: ['metallic', 'hard', 'processed']},
  // --- 12 new templates for replayability ---
  {text: 'Slippery like a lie...', traits: ['slimy', 'smooth', 'wet']},
  {text: 'I can still hear it mooing...', traits: ['meat', 'raw', 'dead']},
  {text: 'Dust and broken promises.', traits: ['dry', 'brittle', 'dull']},
  {text: 'It tastes like a mistake I made in college.', traits: ['bitter', 'processed', 'cold']},
  {text: 'Something the devil would snack on...', traits: ['cursed', 'spicy', 'unsettling']},
  {text: 'Straight from the garden of sin.', traits: ['plant', 'natural', 'sweet']},
  {text: 'The last meal of a condemned man.', traits: ['umami', 'salty', 'fatty']},
  {text: 'Colder than my ex...', traits: ['cold', 'hard', 'pale']},
  {text: 'Something you found behind a dumpster.', traits: ['absurd', 'dull', 'processed']},
  {text: 'It glows in the dark...', traits: ['shiny', 'bright', 'cursed']},
  {text: 'Chew on this for a while.', traits: ['fibrous', 'chunky', 'hard']},
  {text: 'What even IS that...', traits: ['absurd', 'unsettling', 'squishy']},
  {text: "Smoother than a con man's handshake.", traits: ['smooth', 'shiny', 'soft']},
  {text: 'Like licking a 9-volt battery...', traits: ['metallic', 'bitter', 'dry']},
  {text: 'Something that was alive five minutes ago.', traits: ['alive', 'meat', 'squishy']},
  {text: 'Feed me the tears of the innocent.', traits: ['salty', 'wet', 'bland']},
  {text: 'I crave the VOID.', traits: ['cold', 'dull', 'dry', 'dead']},
  {text: 'Make it fancy. MAKE. IT. FANCY.', traits: ['shiny', 'umami', 'cooked']},
  {text: 'Something you would NOT put in a sausage.', traits: ['absurd', 'hard', 'never-alive']},
  {text: "Grandpa's secret ingredient...", traits: ['bitter', 'once-alive', 'warm']},
];

function makeMisdirectionClue(rng: () => number): Clue {
  const template = MISDIRECTION_TEMPLATES[Math.floor(rng() * MISDIRECTION_TEMPLATES.length)];
  // Filter to only valid IngredientTrait values that exist in the type
  const validTraits = template.traits.filter(t => isValidTrait(t));
  return {
    text: template.text,
    requiredTraits: validTraits,
    ingredientCountHint: 0,
    type: 'misdirection',
    underlyingTraits: validTraits,
  };
}

/** Shock-me: no count hint, scored on creativity (selection size + diversity). */
function makeShockMeClue(): Clue {
  return {
    text: 'SHOCK ME!',
    requiredTraits: [],
    ingredientCountHint: 0,
    type: 'shock-me',
    underlyingTraits: [],
  };
}

// --- Trait helpers ------------------------------------------------------------

/** All valid IngredientTrait values for runtime validation. */
const VALID_TRAITS: ReadonlySet<string> = new Set([
  'squishy',
  'pointy',
  'chunky',
  'smooth',
  'fibrous',
  'brittle',
  'slimy',
  'crunchy',
  'soft',
  'hard',
  'sweet',
  'sour',
  'salty',
  'bitter',
  'umami',
  'metallic',
  'fatty',
  'spicy',
  'bland',
  'wet',
  'dry',
  'shiny',
  'dull',
  'bright',
  'pale',
  'warm',
  'cold',
  'raw',
  'cooked',
  'frozen',
  'meat',
  'alive',
  'dead',
  'once-alive',
  'never-alive',
  'processed',
  'natural',
  'plant',
  'liquid-form',
  'wholesome',
  'unsettling',
  'cursed',
  'absurd',
]);

function isValidTrait(t: string): t is IngredientTrait {
  return VALID_TRAITS.has(t);
}

/**
 * Collect all traits that appear across multiple ingredients in the
 * available pool. These are "interesting" for clue generation because
 * the player has multiple valid ways to satisfy them.
 */
function findSharedTraits(available: readonly IngredientDef[]): Map<IngredientTrait, number> {
  const counts = new Map<IngredientTrait, number>();
  for (const ing of available) {
    for (const t of ing.traits) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  // Only keep traits present in >=2 ingredients
  for (const [t, c] of counts) {
    if (c < 2) counts.delete(t);
  }
  return counts;
}

// --- Public API --------------------------------------------------------------

/**
 * Generate a clue for the given round from the available ingredient pool.
 *
 * The `round` parameter increases clue complexity: round 1 gets 1-2
 * required traits, round 3+ can get 3-4. The `rng` parameter makes
 * the output deterministic for the current run.
 *
 * @param round — 1-indexed round number
 * @param available — ingredients still in the fridge
 * @param rng — seeded RNG closure
 */
export function generateClue(
  round: number,
  available: readonly IngredientDef[],
  rng: () => number,
): Clue {
  // Decide template based on round + RNG
  const roll = rng();
  if (roll < 0.1 && round >= 2) {
    // 10% chance of shock-me after round 1
    return makeShockMeClue();
  }
  if (roll < 0.3 && round >= 3) {
    // 20% chance of misdirection after round 2
    return makeMisdirectionClue(rng);
  }

  // Default: literal clue
  const shared = findSharedTraits(available);
  if (shared.size === 0) {
    // Edge case: all ingredients are unique — fall back to shock-me
    return makeShockMeClue();
  }

  // Pick 1-4 traits depending on round
  const traitPool = [...shared.keys()];
  const maxTraits = Math.min(1 + Math.floor(round / 2), 4, traitPool.length);
  const numTraits = Math.max(1, Math.min(maxTraits, Math.floor(rng() * maxTraits) + 1));

  // Fisher-Yates partial shuffle to pick numTraits
  const picked: IngredientTrait[] = [];
  const pool = [...traitPool];
  for (let i = 0; i < numTraits && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return makeLiteralClue(picked);
}

/**
 * Evaluate whether a player's ingredient selection satisfies a clue.
 *
 * For each required trait, at least one ingredient in the selection
 * must carry it. Extra ingredients and extra traits are allowed
 * (superset-legal).
 *
 * The `bonusCoherence` metric measures how thematically aligned the
 * extra ingredients are: if every extra ingredient shares at least one
 * trait with the required set, coherence is high (>0.5). If the extras
 * are random padding, coherence is low.
 */
export function matchSelection(selection: readonly IngredientDef[], clue: Clue): MatchResult {
  if (selection.length === 0) {
    return {
      isMatch: false,
      missingTraits: [...clue.requiredTraits],
      bonusCoherence: 0,
    };
  }

  // Shock-me clues always match (scored on diversity instead)
  if (clue.type === 'shock-me') {
    // Coherence for shock-me = tag diversity / max possible diversity
    const allTags = new Set<string>();
    for (const ing of selection) {
      for (const t of ing.traits) allTags.add(t);
    }
    const diversity = allTags.size / VALID_TRAITS.size;
    return {
      isMatch: true,
      missingTraits: [],
      bonusCoherence: Math.min(1, diversity * 2), // scale so 50% coverage = 1.0
    };
  }

  // For each required trait, check if any selected ingredient carries it
  const missing: IngredientTrait[] = [];
  for (const required of clue.requiredTraits) {
    let found = false;
    for (const ing of selection) {
      if (traitSetOf(ing).has(required)) {
        found = true;
        break;
      }
    }
    if (!found) missing.push(required);
  }

  const isMatch = missing.length === 0;

  // Compute coherence of extra ingredients
  let coherent = 0;
  let extras = 0;
  const requiredSet = new Set(clue.requiredTraits);
  for (const ing of selection) {
    const hasRequired = ing.traits.some(t => requiredSet.has(t as IngredientTrait));
    if (!hasRequired) {
      extras++;
      // Check if this ingredient shares any trait with any required ingredient
      const sharesWithRequired = ing.traits.some(t => requiredSet.has(t as IngredientTrait));
      if (sharesWithRequired) coherent++;
    }
  }
  const bonusCoherence = extras > 0 ? coherent / extras : 1.0;

  return {isMatch, missingTraits: missing, bonusCoherence};
}
