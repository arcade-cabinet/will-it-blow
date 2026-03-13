/**
 * @module config/dialogue
 * Typed accessor for dialogue.json -- dialogue messages and idle threshold.
 */

import data from './dialogue.json';

export interface DialogueConfig {
  phaseMessages: Record<string, string>;
  idleThreshold: number;
}

export const dialogueConfig: DialogueConfig = data as unknown as DialogueConfig;

/** Get the dialogue message for a given game phase. */
export function getPhaseMessage(phase: string): string {
  return dialogueConfig.phaseMessages[phase] ?? '';
}
