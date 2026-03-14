import {Capacitor} from '@capacitor/core';
import {ScreenOrientation} from '@capacitor/screen-orientation';

export async function lockLandscape() {
  if (!Capacitor.isNativePlatform()) return;
  await ScreenOrientation.lock({orientation: 'landscape'});
}

export async function unlock() {
  if (!Capacitor.isNativePlatform()) return;
  await ScreenOrientation.unlock();
}
