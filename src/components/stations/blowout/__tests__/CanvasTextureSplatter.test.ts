/**
 * @module CanvasTextureSplatter.test
 * Contract tests for the splatter canvas system.
 *
 * These run in jsdom — we verify the API shape and basic canvas ops
 * without needing a real WebGL context. Visual correctness is verified
 * in the browser test (BlowoutStation.browser.test.tsx).
 */
import {describe, expect, it} from 'vitest';
import {createSplatterCanvas} from '../CanvasTextureSplatter';

describe('createSplatterCanvas', () => {
  it('returns an object with expected API', () => {
    const sc = createSplatterCanvas();
    expect(typeof sc.paintSplat).toBe('function');
    expect(typeof sc.paintBurst).toBe('function');
    expect(typeof sc.getTexture).toBe('function');
    expect(typeof sc.clear).toBe('function');
  });

  it('getTexture returns a THREE.CanvasTexture', () => {
    const sc = createSplatterCanvas();
    const tex = sc.getTexture();
    expect(tex).toBeDefined();
    // CanvasTexture extends Texture
    expect(tex.image).toBeDefined();
  });

  it('getTexture returns the same instance on repeated calls', () => {
    const sc = createSplatterCanvas();
    const a = sc.getTexture();
    const b = sc.getTexture();
    expect(a).toBe(b);
  });

  it('paintSplat does not throw', () => {
    const sc = createSplatterCanvas();
    expect(() =>
      sc.paintSplat({u: 0.5, v: 0.5, radius: 20, color: '#ff0000', alpha: 0.8}),
    ).not.toThrow();
  });

  it('paintBurst paints multiple splats without error', () => {
    const sc = createSplatterCanvas();
    let callCount = 0;
    const rng = () => {
      callCount++;
      return 0.5;
    };
    sc.paintBurst('#ff0000', 0.8, rng);
    // With power 0.8, should paint ~16 splats, each needing 4 rng calls
    expect(callCount).toBeGreaterThan(0);
  });

  it('clear resets without error', () => {
    const sc = createSplatterCanvas();
    sc.paintSplat({u: 0.5, v: 0.5, radius: 20, color: '#ff0000', alpha: 1});
    expect(() => sc.clear()).not.toThrow();
  });
});
