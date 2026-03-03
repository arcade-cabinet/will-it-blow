import type {Entity, RGB} from '../../types';
import {computeCookColor, updateCookingColor} from '../CookingColorSystem';

const RAW: RGB = [0.8, 0.3, 0.2];
const COOKED: RGB = [0.6, 0.4, 0.1];
const CHARRED: RGB = [0.2, 0.1, 0.05];
const BURNT: RGB = [0.05, 0.02, 0.01];

describe('CookingColorSystem', () => {
  describe('computeCookColor', () => {
    it('returns raw color at cookLevel 0', () => {
      expect(computeCookColor(0, RAW, COOKED, CHARRED, BURNT)).toEqual(RAW);
    });

    it('returns raw color for negative cookLevel', () => {
      expect(computeCookColor(-0.5, RAW, COOKED, CHARRED, BURNT)).toEqual(RAW);
    });

    it('returns cooked color at cookLevel 0.35', () => {
      const result = computeCookColor(0.35, RAW, COOKED, CHARRED, BURNT);
      expect(result[0]).toBeCloseTo(COOKED[0]);
      expect(result[1]).toBeCloseTo(COOKED[1]);
      expect(result[2]).toBeCloseTo(COOKED[2]);
    });

    it('interpolates between raw and cooked at cookLevel 0.175', () => {
      const result = computeCookColor(0.175, RAW, COOKED, CHARRED, BURNT);
      // t = 0.175 / 0.35 = 0.5
      expect(result[0]).toBeCloseTo((RAW[0] + COOKED[0]) / 2);
      expect(result[1]).toBeCloseTo((RAW[1] + COOKED[1]) / 2);
      expect(result[2]).toBeCloseTo((RAW[2] + COOKED[2]) / 2);
    });

    it('returns charred color at cookLevel 0.85', () => {
      const result = computeCookColor(0.85, RAW, COOKED, CHARRED, BURNT);
      expect(result[0]).toBeCloseTo(CHARRED[0]);
      expect(result[1]).toBeCloseTo(CHARRED[1]);
      expect(result[2]).toBeCloseTo(CHARRED[2]);
    });

    it('returns burnt color at cookLevel 1.0', () => {
      const result = computeCookColor(1.0, RAW, COOKED, CHARRED, BURNT);
      expect(result[0]).toBeCloseTo(BURNT[0]);
      expect(result[1]).toBeCloseTo(BURNT[1]);
      expect(result[2]).toBeCloseTo(BURNT[2]);
    });

    it('stays burnt beyond cookLevel 1.0', () => {
      expect(computeCookColor(1.5, RAW, COOKED, CHARRED, BURNT)).toEqual(BURNT);
    });
  });

  describe('updateCookingColor', () => {
    it('sets material color on mesh', () => {
      const setRGB = jest.fn();
      const three = {
        position: {x: 0, y: 0, z: 0},
        material: {color: {setRGB}},
      } as unknown as Entity['three'];

      const entity: Entity = {
        cookAppearance: {
          cookLevel: 0,
          colorRaw: RAW,
          colorCooked: COOKED,
          colorCharred: CHARRED,
          colorBurnt: BURNT,
        },
        three,
      };

      updateCookingColor([entity]);
      expect(setRGB).toHaveBeenCalledWith(RAW[0], RAW[1], RAW[2]);
    });

    it('handles empty entity list', () => {
      expect(() => updateCookingColor([])).not.toThrow();
    });

    it('skips entities without material.color', () => {
      const three = {
        position: {x: 0, y: 0, z: 0},
        material: {},
      } as unknown as Entity['three'];

      const entity: Entity = {
        cookAppearance: {
          cookLevel: 0.5,
          colorRaw: RAW,
          colorCooked: COOKED,
          colorCharred: CHARRED,
          colorBurnt: BURNT,
        },
        three,
      };

      expect(() => updateCookingColor([entity])).not.toThrow();
    });
  });
});
