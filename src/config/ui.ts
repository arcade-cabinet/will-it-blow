/**
 * @module config/ui
 * Typed accessor for ui.json -- UI constants (colors, transitions, dimensions).
 */

import data from './ui.json';

export interface UIColors {
  background: string;
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  text: string;
  textMuted: string;
  overlay: string;
}

export interface UITransitions {
  challengeCardDurationMs: number;
  fadeInMs: number;
  fadeOutMs: number;
  sceneReadyFadeMs: number;
}

export interface UIConfig {
  colors: UIColors;
  transitions: UITransitions;
  strikes: {maxDefault: number; iconSize: number; activeColor: string; inactiveColor: string};
  loading: {progressBarHeight: number; progressBarColor: string; tipRotationMs: number};
  gameOver: {
    rankFontSize: number;
    titleFontSize: number;
    messageFontSize: number;
    scoreFontSize: number;
  };
}

export const uiConfig: UIConfig = data as unknown as UIConfig;

/** Get a UI color by name. */
export function getUIColor(name: keyof UIColors): string {
  return uiConfig.colors[name];
}
