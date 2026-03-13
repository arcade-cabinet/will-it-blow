/** Dialogue tree traversal engine with choice selection and effect tracking. */

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
}
