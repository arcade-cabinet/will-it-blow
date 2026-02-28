import * as Haptics from 'expo-haptics';

// --- Haptic event types ---

export type HapticEvent =
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

// --- Pattern types ---

export type HapticPattern =
  | { type: 'impact'; style: 'light' | 'medium' | 'heavy' }
  | { type: 'notification'; style: 'success' | 'warning' | 'error' }
  | { type: 'selection' };

// --- Event -> pattern mapping ---

const HAPTIC_MAP: Record<HapticEvent, HapticPattern> = {
  ingredient_tap: { type: 'impact', style: 'light' },
  grinding_pulse: { type: 'impact', style: 'medium' },
  stuffing_pressure: { type: 'impact', style: 'medium' },
  strike: { type: 'impact', style: 'heavy' },
  defeat: { type: 'notification', style: 'error' },
  victory: { type: 'notification', style: 'success' },
  mr_sausage_flinch: { type: 'impact', style: 'medium' },
  mr_sausage_laugh: { type: 'impact', style: 'light' },
  mr_sausage_disgust: { type: 'impact', style: 'medium' },
  temperature_change: { type: 'selection' },
  cooking_complete: { type: 'notification', style: 'success' },
};

export function getHapticPattern(event: HapticEvent): HapticPattern | undefined {
  return HAPTIC_MAP[event];
}

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
