// Mock expo-haptics before importing anything
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import * as Haptics from 'expo-haptics';
import {fireHaptic, getHapticPattern, type HapticEvent} from '../HapticService';

const mockImpact = Haptics.impactAsync as jest.Mock;
const mockNotification = Haptics.notificationAsync as jest.Mock;
const mockSelection = Haptics.selectionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getHapticPattern', () => {
  it('maps ingredient_tap to light impact', () => {
    expect(getHapticPattern('ingredient_tap')).toEqual({
      type: 'impact',
      style: 'light',
    });
  });

  it('maps strike to heavy impact', () => {
    expect(getHapticPattern('strike')).toEqual({
      type: 'impact',
      style: 'heavy',
    });
  });

  it('maps victory to success notification', () => {
    expect(getHapticPattern('victory')).toEqual({
      type: 'notification',
      style: 'success',
    });
  });

  it('maps defeat to error notification', () => {
    expect(getHapticPattern('defeat')).toEqual({
      type: 'notification',
      style: 'error',
    });
  });

  it('maps stuffing_pressure to medium impact', () => {
    expect(getHapticPattern('stuffing_pressure')).toEqual({
      type: 'impact',
      style: 'medium',
    });
  });

  it('maps cooking_complete to success notification', () => {
    expect(getHapticPattern('cooking_complete')).toEqual({
      type: 'notification',
      style: 'success',
    });
  });

  it('maps temperature_change to selection', () => {
    expect(getHapticPattern('temperature_change')).toEqual({
      type: 'selection',
    });
  });

  it('maps dial_click to selection', () => {
    expect(getHapticPattern('dial_click')).toEqual({type: 'selection'});
  });

  it('maps toggle_click to light impact', () => {
    expect(getHapticPattern('toggle_click')).toEqual({type: 'impact', style: 'light'});
  });

  it('maps rotary_feedback to medium impact', () => {
    expect(getHapticPattern('rotary_feedback')).toEqual({type: 'impact', style: 'medium'});
  });

  it('maps pressure_feedback to medium impact', () => {
    expect(getHapticPattern('pressure_feedback')).toEqual({type: 'impact', style: 'medium'});
  });

  it('maps button_press to medium impact', () => {
    expect(getHapticPattern('button_press')).toEqual({type: 'impact', style: 'medium'});
  });
});

describe('fireHaptic', () => {
  it('fires impact for ingredient_tap', async () => {
    await fireHaptic('ingredient_tap');
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('fires notification for victory', async () => {
    await fireHaptic('victory');
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('fires selection for temperature_change', async () => {
    await fireHaptic('temperature_change');
    expect(mockSelection).toHaveBeenCalled();
  });

  it('does not throw for unknown event', async () => {
    await expect(fireHaptic('nonexistent' as HapticEvent)).resolves.toBeUndefined();
  });
});
