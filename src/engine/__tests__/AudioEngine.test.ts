import {describe, expect, it} from '@jest/globals';
import {audioEngine} from '../AudioEngine';

describe('AudioEngine (native stub)', () => {
  it('exports audioEngine singleton', () => {
    expect(audioEngine).toBeDefined();
  });

  it('has initialize method', () => {
    expect(typeof audioEngine.initialize).toBe('function');
  });

  it('has playChop method', () => {
    expect(typeof audioEngine.playChop).toBe('function');
  });

  it('has setSizzleLevel method', () => {
    expect(typeof audioEngine.setSizzleLevel).toBe('function');
  });

  it('has setGrinderSpeed method', () => {
    expect(typeof audioEngine.setGrinderSpeed).toBe('function');
  });

  it('has setAmbientDrone method', () => {
    expect(typeof audioEngine.setAmbientDrone).toBe('function');
  });

  it('initialize sets initialized state', async () => {
    await audioEngine.initialize();
    expect(audioEngine.initialized).toBe(true);
  });

  it('methods do not throw when called', () => {
    expect(() => audioEngine.playChop()).not.toThrow();
    expect(() => audioEngine.setSizzleLevel(0.5)).not.toThrow();
    expect(() => audioEngine.setGrinderSpeed(0.8)).not.toThrow();
    expect(() => audioEngine.setAmbientDrone(true)).not.toThrow();
    expect(() => audioEngine.playSound('test')).not.toThrow();
    expect(() => audioEngine.setVolume('sfx', 0.5)).not.toThrow();
    expect(() => audioEngine.startAmbient()).not.toThrow();
    expect(() => audioEngine.stopAmbient()).not.toThrow();
  });
});
