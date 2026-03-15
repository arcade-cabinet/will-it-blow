import {Capacitor} from '@capacitor/core';
import {Haptics, ImpactStyle} from '@capacitor/haptics';

export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!Capacitor.isNativePlatform()) return;
  const map = {light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy};
  await Haptics.impact({style: map[style]});
}
