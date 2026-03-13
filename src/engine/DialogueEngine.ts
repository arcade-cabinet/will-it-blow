/**
 * Dialogue tree traversal engine with choice selection, effect tracking,
 * and observable state deltas. Effects from player choices produce
 * concrete gameplay state changes via applyEffects().
 */

export type MrSausageReaction =
  | 'idle'
  | 'flinch'
  | 'laugh'
  | 'disgust'
  | 'excitement'
  | 'nervous'
  | 'nod'
  | 'talk'
  | 'eating'
  | 'judging';

export type DialogueEffect = 'hint' | 'taunt' | 'stall' | 'anger';

/**
 * Observable state deltas produced by dialogue effects.
 * Components can read these to apply gameplay consequences.
 */
export interface EffectDeltas {
  /** Bonus seconds added to the next challenge timer (hint reward). */
  timeBonusSec: number;
  /** Score penalty applied to the current challenge (negative = penalty). */
  scorePenalty: number;
  /** Number of strikes to add (anger consequence). */
  strikeAdd: number;
  /** Seconds deducted from the next challenge timer (stall consequence). */
  timeDeductSec: number;
}

/** Per-effect constants for delta computation. */
const EFFECT_DELTAS: Record<DialogueEffect, Partial<EffectDeltas>> = {
  hint: {timeBonusSec: 5},
  taunt: {scorePenalty: -10},
  stall: {timeDeductSec: 3},
  anger: {strikeAdd: 1},
};

export interface DialogueChoice {
  text: string;
  response: DialogueLine;
  effect?: DialogueEffect;
}

export interface DialogueLine {
  speaker: 'sausage' | 'player';
  text: string;
  reaction?: MrSausageReaction;
  choices?: DialogueChoice[];
  effect?: DialogueEffect;
}

/** Walks a linear sequence of DialogueLines, handling branching choices and recording effects. */
export class DialogueEngine {
  private lines: DialogueLine[];
  private currentIndex: number;
  private effects: DialogueEffect[];

  constructor(lines: DialogueLine[]) {
    this.lines = lines;
    this.currentIndex = 0;
    this.effects = [];
  }

  /** Returns the current DialogueLine, or undefined if past the end. */
  getCurrentLine(): DialogueLine | undefined {
    return this.lines[this.currentIndex];
  }

  /** Returns available choices for the current line, or an empty array if none. */
  getChoices(): DialogueChoice[] {
    const line = this.getCurrentLine();
    return line?.choices ?? [];
  }

  /** Picks a choice by index, records its effect (if any), and returns the response line. */
  selectChoice(index: number): DialogueLine {
    const choices = this.getChoices();
    if (index < 0 || index >= choices.length) {
      throw new Error(`Invalid choice index ${index}: only ${choices.length} choices available`);
    }
    const choice = choices[index];
    if (choice.effect) {
      this.effects.push(choice.effect);
    }
    return choice.response;
  }

  /** Advances to the next line in the sequence. */
  advance(): void {
    this.currentIndex++;
  }

  /** Returns true when the dialogue has advanced past the last line. */
  isComplete(): boolean {
    return this.currentIndex >= this.lines.length;
  }

  /** Returns all effects recorded so far (from choice selections). */
  getEffects(): DialogueEffect[] {
    return [...this.effects];
  }

  /** Returns true if the given effect has been recorded. */
  hasEffect(effect: DialogueEffect): boolean {
    return this.effects.includes(effect);
  }

  /** Resets the engine to the beginning, clearing all recorded effects. */
  reset(): void {
    this.currentIndex = 0;
    this.effects = [];
  }

  /**
   * Computes observable state deltas from all recorded effects.
   * Multiple effects of the same type accumulate (e.g., two hints = 10s bonus).
   * This is idempotent — calling it multiple times returns the same result
   * as long as no new effects are recorded between calls.
   */
  applyEffects(): EffectDeltas {
    const deltas: EffectDeltas = {
      timeBonusSec: 0,
      scorePenalty: 0,
      strikeAdd: 0,
      timeDeductSec: 0,
    };

    for (const effect of this.effects) {
      const d = EFFECT_DELTAS[effect];
      if (d.timeBonusSec) deltas.timeBonusSec += d.timeBonusSec;
      if (d.scorePenalty) deltas.scorePenalty += d.scorePenalty;
      if (d.strikeAdd) deltas.strikeAdd += d.strikeAdd;
      if (d.timeDeductSec) deltas.timeDeductSec += d.timeDeductSec;
    }

    return deltas;
  }
}
