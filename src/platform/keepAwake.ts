import {Capacitor} from '@capacitor/core';
import {KeepAwake} from '@capacitor-community/keep-awake';

export async function enableKeepAwake() {
  if (!Capacitor.isNativePlatform()) return;
  await KeepAwake.keepAwake();
}

export async function disableKeepAwake() {
  if (!Capacitor.isNativePlatform()) return;
  await KeepAwake.allowSleep();
}
