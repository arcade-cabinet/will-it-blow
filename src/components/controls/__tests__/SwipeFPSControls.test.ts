import {MOVE_ZONE_RADIUS, TAP_MAX_DISTANCE, TAP_MAX_DURATION} from '../SwipeFPSControls';

describe('SwipeFPSControls', () => {
  describe('exports', () => {
    it('exports SwipeFPSControls component', () => {
      const mod = require('../SwipeFPSControls');
      expect(mod.SwipeFPSControls).toBeDefined();
      expect(typeof mod.SwipeFPSControls).toBe('function');
    });

    it('exports tuning constants', () => {
      expect(TAP_MAX_DURATION).toBe(250);
      expect(TAP_MAX_DISTANCE).toBe(10);
      expect(MOVE_ZONE_RADIUS).toBe(80);
    });
  });

  describe('source-level checks', () => {
    let source: string;

    beforeAll(() => {
      const fs = require('node:fs');
      const path = require('node:path');
      source = fs.readFileSync(path.resolve(__dirname, '../SwipeFPSControls.tsx'), 'utf8');
    });

    it('renders two side-by-side zone Views (moveZone + lookZone)', () => {
      expect(source).toContain('moveZone');
      expect(source).toContain('lookZone');
      // Both zones are 50% width
      expect(source).toContain("width: '50%'");
    });

    it('uses fullscreen container with row layout', () => {
      expect(source).toContain("position: 'absolute'");
      expect(source).toContain('left: 0');
      expect(source).toContain('top: 0');
      expect(source).toContain('right: 0');
      expect(source).toContain('bottom: 0');
      expect(source).toContain("flexDirection: 'row'");
    });

    it('has no visible joystick UI elements', () => {
      expect(source).not.toContain('joystickBase');
      expect(source).not.toContain('joystickThumb');
      expect(source).not.toContain('backgroundColor');
    });

    it('accepts joystickRef and onLookDrag props', () => {
      expect(source).toContain('joystickRef');
      expect(source).toContain('onLookDrag');
    });

    it('uses PanResponder for gesture handling (two responders)', () => {
      expect(source).toContain('PanResponder');
      expect(source).toContain('panHandlers');
      expect(source).toContain('movePanResponder');
      expect(source).toContain('lookPanResponder');
    });

    it('fires setTouchActionPressed for tap-to-interact on both zones', () => {
      expect(source).toContain('setTouchActionPressed');
      expect(source).toContain("'interact'");
      expect(source).toContain('fireTapInteract');
    });

    it('uses MOVE_ZONE_RADIUS for invisible joystick normalization', () => {
      expect(source).toContain('MOVE_ZONE_RADIUS');
      expect(source).toContain('Math.min(dist, MOVE_ZONE_RADIUS)');
    });

    it('negates Y for screen-down = forward mapping', () => {
      expect(source).toContain('-(ny * scale)');
    });

    it('zeros joystick on move zone release', () => {
      // joystickRef is zeroed in onPanResponderRelease
      expect(source).toContain('joystickRef.current.x = 0');
      expect(source).toContain('joystickRef.current.y = 0');
    });

    it('does not contain flick/impulse system (removed)', () => {
      expect(source).not.toContain('animateImpulse');
      expect(source).not.toContain('impulseRef');
      expect(source).not.toContain('frameLoopRef');
      expect(source).not.toContain('FLICK_VELOCITY_THRESHOLD');
      expect(source).not.toContain('IMPULSE_HALF_LIFE');
      expect(source).not.toContain('IMPULSE_CUTOFF');
      expect(source).not.toContain('SPRINT_MULTIPLIER');
      expect(source).not.toContain('DOUBLE_TAP_WINDOW');
      expect(source).not.toContain('FLICK_IMPULSE_MAGNITUDE');
      expect(source).not.toContain('classifySwipeDirection');
      expect(source).not.toContain('computeDecayFactor');
      expect(source).not.toContain('peakSpeedRef');
      expect(source).not.toContain('velocityRef');
    });
  });
});
