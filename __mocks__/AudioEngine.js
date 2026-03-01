// Jest mock for AudioEngine — used by components that import it.
// Both AudioEngine.web.ts (Tone.js) and AudioEngine.ts (expo-av) are
// replaced with this no-op stub in tests.

const noopEngine = {
  initTone: () => Promise.resolve(),
  startGrinder: () => {},
  stopGrinder: () => {},
  playStuffingSquelch: () => {},
  playCountdownBeep: () => {},
  startBlowWhoosh: () => {},
  stopBlowWhoosh: () => {},
  playSlam: () => {},
  playSizzle: () => {},
  playCorrectPick: () => {},
  playWrongPick: () => {},
  updatePressure: () => {},
  stopPressure: () => {},
  playBurst: () => {},
  playTitleJingle: () => {},
  playRatingSong: () => {},
  startAmbientDrone: () => {},
  stopAmbientDrone: () => {},
  stopEngine: () => {},
  // Sample playback methods
  playSample: () => {},
  startSampleLoop: () => {},
  stopSampleLoop: () => {},
  playGrab: () => {},
  playDrop: () => {},
  playPour: () => {},
  playMix: () => {},
  playChop: () => {},
  startCookingSizzle: () => {},
  stopCookingSizzle: () => {},
  playSizzleHit: () => {},
  playBoiling: () => {},
};

module.exports = {audioEngine: noopEngine};
