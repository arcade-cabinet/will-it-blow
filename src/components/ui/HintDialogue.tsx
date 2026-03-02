/**
 * @module HintDialogue
 * Bottom-of-screen speech bubble that displays Mr. Sausage's cryptic hints
 * about his hidden demands during gameplay.
 *
 * When `hintActive` becomes true in the store, generates a mood-appropriate
 * hint for the current challenge stage, displays it with a slide-up animation,
 * and auto-dismisses after 4 seconds. Tracks viewed hints to prevent duplicates.
 *
 * Hint categories by stage:
 * - Stage 0 (fridge): ingredient hints (desired/hated ingredients)
 * - Stage 1 (grinder): texture hints (chunky vs smooth)
 * - Stage 2 (stuffer): form hints (links, coiled, patties)
 * - Stage 3 (cooking): cook preference hints (rare, medium, well-done, charred)
 *
 * Mood profiles affect tone:
 * - cryptic: vague, metaphorical
 * - passive-aggressive: backhanded, sarcastic
 * - manic: enthusiastic, unhinged
 *
 * Positioned at zIndex 85, above the ChallengeHeader (70) and HintButton (80)
 * but below DialogueOverlay (90) and GameOverScreen (100).
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import type {MrSausageDemands} from '../../store/gameStore';
import {useGameStore} from '../../store/gameStore';

/** Subset of MrSausageDemands used by the hint generation system. */
export type HintDemands = Pick<
  MrSausageDemands,
  'preferredForm' | 'desiredIngredients' | 'hatedIngredients' | 'cookPreference' | 'moodProfile'
>;

/** A generated hint with a unique ID and display text. */
export interface Hint {
  id: string;
  text: string;
}

// ---- Hint generation ----

/** How long the hint stays visible before auto-dismissing (ms). */
const AUTO_DISMISS_MS = 4000;

/**
 * Template pools for each stage x mood combination.
 * Templates use placeholders: {desired}, {hated}, {form}, {cook}.
 */
const HINT_TEMPLATES: Record<number, Record<string, string[]>> = {
  // Stage 0: Ingredient hints
  0: {
    cryptic: [
      'The universe whispers of... {desired}...',
      'I sense a disturbance... something {hated}-shaped haunts my dreams...',
      'The stars align for {desired}... can you feel it?',
      'A vision: {hated} in the grinder... no... NO...',
      'My third eye sees {desired}... it calls to me...',
    ],
    'passive-aggressive': [
      "Oh, you're NOT going to pick {desired}? ...interesting choice.",
      'I mean, {hated} is fine I guess, if you WANT to disappoint me...',
      "I've been CRAVING {desired}... but what do I know, I'm just a sausage.",
      'If you put {hated} in there, so help me...',
      'Some people would pick {desired}. Winners, mostly.',
    ],
    manic: [
      '{desired}!! {desired}!! GIVE ME {desired}!!!',
      'NO {hated}!! ABSOLUTELY NOT!! KEEP IT AWAY!!',
      'I NEED {desired} IN MY LIFE RIGHT NOW!!',
      '{hated}?! ARE YOU TRYING TO KILL ME?!',
      'PUT {desired} IN THERE OR I SWEAR—',
    ],
  },
  // Stage 1: Texture hints
  1: {
    cryptic: [
      'The grinder speaks... it wants it... textured...',
      'Smooth as silk, or rough as the grave... you decide...',
      'I like my meat CHUNKY... or do I?',
      'The texture of destiny is neither fine nor coarse...',
      "Smoother than a baby's—nevermind.",
    ],
    'passive-aggressive': [
      "Oh, you're grinding it THAT way? Sure. Fine.",
      'I SAID I like it chunky. Were you even listening?',
      "Some people just have a feel for texture. You... you'll get there.",
      "It's not rocket science. Or maybe for you it is.",
      'A little more finesse? No? Okay then.',
    ],
    manic: [
      'CHUNKY CHUNKY CHUNKY!! GIVE IT TEXTURE!!',
      'GRIND IT LIKE YOU MEAN IT!!',
      'SMOOTHER!! NO WAIT— CHUNKIER!! PERFECT!!',
      'THE GRINDER IS HUNGRY AND SO AM I!!',
      'MORE GRINDING!! THE MEAT DEMANDS IT!!',
    ],
  },
  // Stage 2: Form hints
  2: {
    cryptic: [
      'The casing yearns to become... {form}...',
      'In my dreams, the sausage takes a shape... {form}...',
      'Form follows function... and the function is {form}...',
      'The prophecy speaks of a {form} sausage...',
      'Coiled like a serpent, or straight as fate...',
    ],
    'passive-aggressive': [
      'Nothing says love like {form}. Just saying.',
      "Keep it {form}, keep it classy. Unlike SOME people's technique.",
      'I PREFER {form}. But you do you, I guess.',
      "Oh you're making THAT shape? How... creative.",
      'If only the sausage could stuff itself into {form}...',
    ],
    manic: [
      '{form}!! {form}!! {form}!! GIVE ME {form}!!!',
      'STUFF IT INTO {form} OR ELSE!!',
      'THE CASING SCREAMS FOR {form}!!',
      '{form} IS THE ONLY SHAPE THAT MATTERS!!',
      'MAKE IT {form}!! DO IT NOW!!',
    ],
  },
  // Stage 3: Cook preference hints
  3: {
    cryptic: [
      'The flame whispers... "{cook}"...',
      'Between raw and ash lies the truth... {cook}...',
      'The heat knows what I want... do you?',
      'A {cook} sausage holds the key to salvation...',
      'Fire and patience... the answer is {cook}...',
    ],
    'passive-aggressive': [
      'Just a KISS of heat. Or an inferno. Your call. ({cook}, obviously.)',
      'I like it {cook}. But sure, burn it if you want.',
      'The temperature is... a choice. Not the RIGHT choice, but a choice.',
      "Oh wow, you're really going with that heat level? {cook} exists, you know.",
      'Some chefs know instinctively. The rest need to be told: {cook}.',
    ],
    manic: [
      'BURN IT. BURN IT ALL. Wait no— {cook}!!',
      '{cook}!! THE PERFECT COOK!! DO IT!!',
      'FIRE!! HEAT!! {cook}!! YES!!',
      "THE STOVE CALLS FOR {cook} AND I CAN'T STOP SCREAMING!!",
      '{cook}!! {cook}!! THE MEAT DEMANDS {cook}!!',
    ],
  },
};

/**
 * Generates a hint based on Mr. Sausage's demands, the current stage, and mood.
 *
 * Uses a deterministic template selection based on the hint attempt index to
 * ensure different hints on repeated calls within the same stage.
 *
 * @param demands - Mr. Sausage's hidden demands for this game session
 * @param stage - Current challenge stage (0-3)
 * @param moodProfile - Mr. Sausage's mood: 'cryptic', 'passive-aggressive', or 'manic'
 * @param attemptIndex - Which hint attempt this is (for template rotation), defaults to 0
 * @returns A hint object with a unique ID and the formatted hint text
 */
export function generateHint(
  demands: HintDemands,
  stage: number,
  moodProfile: string,
  attemptIndex = 0,
): Hint {
  const clampedStage = Math.min(Math.max(stage, 0), 3);
  const mood = moodProfile in (HINT_TEMPLATES[clampedStage] ?? {}) ? moodProfile : 'cryptic';
  const templates = HINT_TEMPLATES[clampedStage][mood];
  const templateIndex = attemptIndex % templates.length;
  const template = templates[templateIndex];

  // Pick a desired/hated ingredient to reference (rotate through available ones)
  const desired =
    demands.desiredIngredients.length > 0
      ? demands.desiredIngredients[attemptIndex % demands.desiredIngredients.length]
      : 'something special';
  const hated =
    demands.hatedIngredients.length > 0
      ? demands.hatedIngredients[attemptIndex % demands.hatedIngredients.length]
      : 'that thing';

  const text = template
    .replace(/\{desired\}/g, desired)
    .replace(/\{hated\}/g, hated)
    .replace(/\{form\}/g, demands.preferredForm)
    .replace(/\{cook\}/g, demands.cookPreference);

  const id = `hint-${clampedStage}-${mood}-${templateIndex}`;

  return {id, text};
}

// ---- Component ----

interface HintDialogueProps {
  /** Mr. Sausage's demands for this game session. Required to generate hints. */
  demands: HintDemands | null;
}

/**
 * Displays a speech-bubble hint from Mr. Sausage when `hintActive` is true
 * in the store. Slides up from the bottom, auto-dismisses after 4 seconds.
 * Tracks viewed hint IDs to avoid showing duplicates.
 */
export function HintDialogue({demands}: HintDialogueProps) {
  const hintActive = useGameStore(s => s.hintActive);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const setHintActive = useGameStore(s => s.setHintActive);

  const [currentHint, setCurrentHint] = useState<Hint | null>(null);
  const viewedHintsRef = useRef<Set<string>>(new Set());
  const attemptCountRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentHint(null);
      setHintActive(false);
    });
  }, [slideAnim, setHintActive]);

  useEffect(() => {
    if (!hintActive || !demands) return;

    const mood = demands.moodProfile || 'cryptic';

    // Try to find a non-duplicate hint (up to 10 attempts)
    let hint: Hint | null = null;
    for (let i = 0; i < 10; i++) {
      const candidate = generateHint(demands, currentChallenge, mood, attemptCountRef.current + i);
      if (!viewedHintsRef.current.has(candidate.id)) {
        hint = candidate;
        attemptCountRef.current += i + 1;
        break;
      }
    }

    // If all hints for this stage+mood have been seen, allow repeats
    if (!hint) {
      hint = generateHint(demands, currentChallenge, mood, attemptCountRef.current);
      attemptCountRef.current += 1;
    }

    viewedHintsRef.current.add(hint.id);
    setCurrentHint(hint);

    // Slide up
    slideAnim.setValue(100);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 4 seconds
    dismissTimerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [hintActive, demands, currentChallenge, slideAnim, dismiss]);

  if (!currentHint) return null;

  return (
    <Animated.View style={[styles.container, {transform: [{translateY: slideAnim}]}]}>
      <View style={styles.bubble}>
        <Text style={styles.speakerLabel}>MR. SAUSAGE</Text>
        <Text style={styles.hintText} numberOfLines={2}>
          {currentHint.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 85,
  },
  bubble: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#FF1744',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  speakerLabel: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 2,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
});
