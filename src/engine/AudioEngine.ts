// Native no-op stub — Tone.js is web-only.
// Metro resolves AudioEngine.web.ts on web, this file on iOS/Android.

class AudioEngine {
  async initTone() {}
  startGrinder() {}
  stopGrinder() {}
  playStuffingSquelch() {}
  playCountdownBeep(_final = false) {}
  startBlowWhoosh() {}
  stopBlowWhoosh() {}
  playSlam() {}
  playSizzle() {}
  updatePressure(_intensity: number) {}
  stopPressure() {}
  playBurst() {}
  playTitleJingle() {}
  playRatingSong(_rating: number) {}
  stopEngine() {}
}

export const audioEngine = new AudioEngine();
