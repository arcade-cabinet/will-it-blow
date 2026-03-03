import type {Entity} from '../../types';
import {computeInflationScale, updateInflation} from '../InflationSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('InflationSystem', () => {
  describe('computeInflationScale', () => {
    it('returns 1 when fillLevel is 0', () => {
      expect(computeInflationScale(0, 2, 0.7, 5, 0.1, 0)).toBe(1);
    });

    it('returns maxScale when fillLevel is 1 and no pulse', () => {
      // At fillLevel=1, below threshold so no pulse
      expect(computeInflationScale(1, 2, 1.5, 5, 0.1, 0)).toBe(2);
    });

    it('scales linearly between 1 and maxScale', () => {
      // fillLevel=0.5, maxScale=3 => 1 + 0.5*(3-1) = 2.0
      expect(computeInflationScale(0.5, 3, 0.9, 5, 0.1, 0)).toBe(2);
    });

    it('adds pulse when above threshold', () => {
      // fillLevel=0.9, threshold=0.7, normalizedExcess = (0.9-0.7)/(1-0.7) = 0.667
      // At elapsed=0, sin(0)=0, so pulse contribution is 0
      const withoutPulse = computeInflationScale(0.9, 2, 0.7, 5, 0.1, 0);
      // At elapsed where sin != 0
      const withPulse = computeInflationScale(0.9, 2, 0.7, 5, 0.1, Math.PI / 10);
      expect(withPulse).not.toBe(withoutPulse);
    });

    it('no pulse below threshold', () => {
      const elapsed1 = computeInflationScale(0.5, 2, 0.7, 5, 0.1, 0);
      const elapsed2 = computeInflationScale(0.5, 2, 0.7, 5, 0.1, 1);
      expect(elapsed1).toBe(elapsed2);
    });
  });

  describe('updateInflation', () => {
    it('sets scale.x and scale.z on the three object', () => {
      const three = makeObject3D()!;
      const entity: Entity = {
        inflation: {
          fillLevel: 0.5,
          maxScale: 3,
          pulseThreshold: 0.9,
          pulseSpeed: 5,
          pulseAmplitude: 0.1,
        },
        three,
      };

      updateInflation([entity], 0);
      expect(three.scale.x).toBe(2);
      expect(three.scale.z).toBe(2);
      // y should not be changed by the system
      expect(three.scale.y).toBe(1);
    });

    it('handles empty entity list', () => {
      expect(() => updateInflation([], 0)).not.toThrow();
    });
  });
});
