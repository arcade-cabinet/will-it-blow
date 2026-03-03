import {
  computeJoystickSize,
  MAX_JOYSTICK,
  MIN_JOYSTICK,
  TABLET_BREAKPOINT,
} from '../MobileJoystick';

describe('MobileJoystick responsive sizing', () => {
  describe('computeJoystickSize', () => {
    it('returns a size based on the shorter dimension for phones', () => {
      // Phone in portrait: 390x844
      const size = computeJoystickSize(390, 844);
      // 390 * 0.13 = 50.7 → clamped to MIN_JOYSTICK (90)
      expect(size).toBeGreaterThanOrEqual(MIN_JOYSTICK);
      expect(size).toBeLessThanOrEqual(MAX_JOYSTICK);
    });

    it('returns a larger size for tablets', () => {
      // Tablet in portrait: 810x1080
      const tabletSize = computeJoystickSize(810, 1080);
      // Phone in portrait: 390x844
      const phoneSize = computeJoystickSize(390, 844);
      expect(tabletSize).toBeGreaterThan(phoneSize);
    });

    it('uses the shorter dimension regardless of orientation', () => {
      const portrait = computeJoystickSize(390, 844);
      const landscape = computeJoystickSize(844, 390);
      expect(portrait).toBe(landscape);
    });

    it('clamps to MIN_JOYSTICK on very small screens', () => {
      const size = computeJoystickSize(200, 300);
      expect(size).toBe(MIN_JOYSTICK);
    });

    it('clamps to MAX_JOYSTICK on very large screens', () => {
      const size = computeJoystickSize(2000, 2000);
      expect(size).toBe(MAX_JOYSTICK);
    });

    it('considers >= 768 shortest dimension as tablet', () => {
      // Exactly at breakpoint: 768x1024
      const size = computeJoystickSize(768, 1024);
      // 768 * 0.15 = 115.2 → rounds to 115
      expect(size).toBe(Math.round(768 * 0.15));
    });

    it('considers < 768 shortest dimension as phone', () => {
      // Just below breakpoint: 767x1024
      const size = computeJoystickSize(767, 1024);
      // 767 * 0.13 = 99.71 → rounds to 100
      expect(size).toBe(Math.round(767 * 0.13));
    });

    it('returns an integer', () => {
      const size = computeJoystickSize(411, 731);
      expect(size).toBe(Math.round(size));
    });
  });

  describe('TABLET_BREAKPOINT', () => {
    it('is 768', () => {
      expect(TABLET_BREAKPOINT).toBe(768);
    });
  });

  describe('safeAreaBottom prop (source-level check)', () => {
    it('accepts safeAreaBottom prop', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../MobileJoystick.tsx'), 'utf8');
      expect(source).toContain('safeAreaBottom');
    });
  });

  describe('orientation-aware positioning (source-level check)', () => {
    it('adjusts bottom inset for landscape', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../MobileJoystick.tsx'), 'utf8');
      expect(source).toContain('isLandscape');
      expect(source).toContain('bottomInset');
      expect(source).toContain('leftInset');
    });
  });
});
