import {
  classifySwipeDirection,
  computeDecayFactor,
  DOUBLE_TAP_WINDOW,
  FLICK_IMPULSE_MAGNITUDE,
  FLICK_VELOCITY_THRESHOLD,
  IMPULSE_CUTOFF,
  IMPULSE_HALF_LIFE,
  SPRINT_MULTIPLIER,
  TAP_MAX_DISTANCE,
  TAP_MAX_DURATION,
} from '../SwipeFPSControls';

describe('SwipeFPSControls', () => {
  describe('exports', () => {
    it('exports SwipeFPSControls component', () => {
      const mod = require('../SwipeFPSControls');
      expect(mod.SwipeFPSControls).toBeDefined();
      expect(typeof mod.SwipeFPSControls).toBe('function');
    });

    it('exports classifySwipeDirection helper', () => {
      expect(typeof classifySwipeDirection).toBe('function');
    });

    it('exports computeDecayFactor helper', () => {
      expect(typeof computeDecayFactor).toBe('function');
    });

    it('exports tuning constants', () => {
      expect(FLICK_VELOCITY_THRESHOLD).toBe(600);
      expect(TAP_MAX_DURATION).toBe(250);
      expect(TAP_MAX_DISTANCE).toBe(10);
      expect(IMPULSE_HALF_LIFE).toBe(150);
      expect(IMPULSE_CUTOFF).toBe(500);
      expect(SPRINT_MULTIPLIER).toBe(1.8);
      expect(DOUBLE_TAP_WINDOW).toBe(350);
      expect(FLICK_IMPULSE_MAGNITUDE).toBe(0.85);
    });
  });

  describe('classifySwipeDirection', () => {
    it('returns a normalized unit vector for a right swipe', () => {
      const dir = classifySwipeDirection(100, 0);
      expect(dir.x).toBeCloseTo(1, 5);
      expect(dir.y).toBeCloseTo(0, 5);
    });

    it('returns a normalized unit vector for an upward swipe', () => {
      const dir = classifySwipeDirection(0, -100);
      expect(dir.x).toBeCloseTo(0, 5);
      expect(dir.y).toBeCloseTo(-1, 5);
    });

    it('returns a normalized diagonal vector', () => {
      const dir = classifySwipeDirection(100, 100);
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      expect(len).toBeCloseTo(1, 5);
    });

    it('returns zero for negligible movement', () => {
      const dir = classifySwipeDirection(0, 0);
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('returns zero for sub-pixel movement', () => {
      const dir = classifySwipeDirection(0.5, 0.3);
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });
  });

  describe('computeDecayFactor', () => {
    it('returns 1 at t=0', () => {
      expect(computeDecayFactor(0)).toBe(1);
    });

    it('returns 0.5 at half-life', () => {
      expect(computeDecayFactor(IMPULSE_HALF_LIFE)).toBeCloseTo(0.5, 5);
    });

    it('returns ~0.25 at two half-lives', () => {
      expect(computeDecayFactor(IMPULSE_HALF_LIFE * 2)).toBeCloseTo(0.25, 5);
    });

    it('returns 0 at or beyond cutoff', () => {
      expect(computeDecayFactor(IMPULSE_CUTOFF)).toBe(0);
      expect(computeDecayFactor(IMPULSE_CUTOFF + 100)).toBe(0);
    });

    it('returns 1 for negative time', () => {
      expect(computeDecayFactor(-10)).toBe(1);
    });

    it('decays monotonically', () => {
      const values = [0, 50, 100, 150, 200, 300, 400, 500].map(computeDecayFactor);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
      }
    });
  });

  describe('source-level checks', () => {
    it('uses fullscreen invisible touch surface (no visible joystick UI)', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      // Must be fullscreen positioned
      expect(source).toContain("position: 'absolute'");
      expect(source).toContain('left: 0');
      expect(source).toContain('top: 0');
      expect(source).toContain('right: 0');
      expect(source).toContain('bottom: 0');
      // Must NOT have visible joystick elements
      expect(source).not.toContain('joystickBase');
      expect(source).not.toContain('joystickThumb');
      expect(source).not.toContain('backgroundColor');
    });

    it('accepts the same prop interface as MobileJoystick', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('joystickRef');
      expect(source).toContain('onLookDrag');
      expect(source).toContain('safeAreaBottom');
    });

    it('uses PanResponder for gesture handling', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('PanResponder');
      expect(source).toContain('panHandlers');
    });

    it('fires setTouchActionPressed for tap-to-interact', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('setTouchActionPressed');
      expect(source).toContain("'interact'");
    });

    it('uses exponential impulse decay via requestAnimationFrame', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('requestAnimationFrame');
      expect(source).toContain('computeDecayFactor');
      expect(source).toContain('cancelAnimationFrame');
    });

    it('cleans up RAF loop on unmount via useEffect', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('useEffect');
      // Cleanup should cancel animation frame and zero joystick
      expect(source).toContain('frameLoopRef.current != null');
      expect(source).toContain('impulseRef.current = null');
    });

    it('tracks peak speed during gesture for robust flick detection', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
      expect(source).toContain('peakSpeedRef');
      // Uses peak speed, not last-sample speed
      expect(source).toContain('peakSpeedRef.current >= FLICK_VELOCITY_THRESHOLD');
    });
  });
});
