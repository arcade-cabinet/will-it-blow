/**
 * @module HapticService
 * Maps game events to device haptic feedback patterns via `expo-haptics`.
 *
 * Game code fires semantic events (e.g., `'strike'`, `'victory'`) without
 * knowing which haptic pattern they produce. This module translates each
 * event to an impact, notification, or selection haptic through {@link HAPTIC_MAP}.
 *
 * Haptic categories:
 * - **impact** (light/medium/heavy) -- taps, pulses, collisions
 * - **notification** (success/warning/error) -- game-state transitions
 * - **selection** -- subtle tick for continuous feedback (e.g., temperature dial)
 */
import * as Haptics from 'expo-haptics';

/**
 * Semantic haptic events that game code can fire.
 * Each maps to a physical haptic pattern in {@link HAPTIC_MAP}.
 */
export type HapticEvent =
  // Universal input primitive events
  | 'dial_click'
  | 'toggle_click'
  | 'button_press'
  | 'rotary_feedback'
  | 'pressure_feedback'
  // Challenge-specific events (legacy names kept for backwards compat)
  | 'ingredient_tap'
  | 'grinding_pulse'
  | 'stuffing_pressure'
  | 'strike'
  | 'defeat'
  | 'victory'
  | 'mr_sausage_flinch'
  | 'mr_sausage_laugh'
  | 'mr_sausage_disgust'
  | 'temperature_change'
  | 'cooking_complete';

/** Physical haptic feedback descriptor sent to expo-haptics. */
export type HapticPattern =
  | {type: 'impact'; style: 'light' | 'medium' | 'heavy'}
  | {type: 'notification'; style: 'success' | 'warning' | 'error'}
  | {type: 'selection'};

/** Lookup table from semantic game events to physical haptic patterns. */
const HAPTIC_MAP: Record<HapticEvent, HapticPattern> = {
  // Universal input primitive events
  dial_click: {type: 'selection'},
  toggle_click: {type: 'impact', style: 'light'},
  button_press: {type: 'impact', style: 'medium'},
  rotary_feedback: {type: 'impact', style: 'medium'},
  pressure_feedback: {type: 'impact', style: 'medium'},
  // Challenge-specific events
  ingredient_tap: {type: 'impact', style: 'light'},
  grinding_pulse: {type: 'impact', style: 'medium'},
  stuffing_pressure: {type: 'impact', style: 'medium'},
  strike: {type: 'impact', style: 'heavy'},
  defeat: {type: 'notification', style: 'error'},
  victory: {type: 'notification', style: 'success'},
  mr_sausage_flinch: {type: 'impact', style: 'medium'},
  mr_sausage_laugh: {type: 'impact', style: 'light'},
  mr_sausage_disgust: {type: 'impact', style: 'medium'},
  temperature_change: {type: 'selection'},
  cooking_complete: {type: 'notification', style: 'success'},
};

/** Look up the haptic pattern for a game event without firing it. */
export function getHapticPattern(event: HapticEvent): HapticPattern | undefined {
  return HAPTIC_MAP[event];
}

/** Fire the haptic feedback for a game event. No-op if the event has no mapped pattern. */
export async function fireHaptic(event: HapticEvent): Promise<void> {
  const pattern = HAPTIC_MAP[event];
  if (!pattern) return;

  switch (pattern.type) {
    case 'impact': {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      await Haptics.impactAsync(styleMap[pattern.style]);
      break;
    }
    case 'notification': {
      const typeMap = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      await Haptics.notificationAsync(typeMap[pattern.style]);
      break;
    }
    case 'selection':
      await Haptics.selectionAsync();
      break;
  }
}
