/**
 * @module AudioEngine (native)
 * Stub audio engine for native platforms (iOS/Android).
 * Same interface as AudioEngine.web.ts. Uses no-op implementations
 * until expo-audio integration is added.
 */

class AudioEngine {
  private _initialized = false;

  async initialize() {
    this._initialized = true;
  }

  get initialized() {
    return this._initialized;
  }

  playChop() {}
  setSizzleLevel(_level: number) {}
  setGrinderSpeed(_speed: number) {}
  setAmbientDrone(_active: boolean) {}

  playSound(_name: string) {}
  setVolume(_type: string, _level: number) {}
  startAmbient() {}
  stopAmbient() {}
}

export const audioEngine = new AudioEngine();
