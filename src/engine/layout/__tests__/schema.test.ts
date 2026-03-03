import fs from 'node:fs';
import path from 'node:path';
import {PlacementsConfigSchema, RailsConfigSchema, RoomConfigSchema} from '../schema';

const LAYOUT_DIR = path.resolve(__dirname, '../../../config/layout');

function loadJson(filename: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, filename), 'utf8'));
}

describe('Zod schema validation', () => {
  describe('RoomConfigSchema', () => {
    it('validates the production room.json', () => {
      const raw = loadJson('room.json');
      const result = RoomConfigSchema.safeParse(raw);
      expect(result.success).toBe(true);
    });

    it('requires all surfaces to have id, axis, alignment, and depth', () => {
      const result = RoomConfigSchema.safeParse({
        surfaces: {
          floor: {id: 'floor', axis: 'xz'},
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid axis values', () => {
      const result = RoomConfigSchema.safeParse({
        surfaces: {
          floor: {id: 'floor', axis: 'yz', alignment: 'horizontal', depth: 0},
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional _anchors', () => {
      const result = RoomConfigSchema.safeParse({
        surfaces: {
          floor: {id: 'floor', axis: 'xz', alignment: 'horizontal', depth: 0},
        },
        _anchors: {'floor:center': [0, 0, 0]},
      });
      expect(result.success).toBe(true);
    });
  });

  describe('RailsConfigSchema', () => {
    it('validates the production rails.json', () => {
      const raw = loadJson('rails.json');
      const result = RailsConfigSchema.safeParse(raw);
      expect(result.success).toBe(true);
    });

    it('requires inherits to be "room"', () => {
      const result = RailsConfigSchema.safeParse({
        inherits: 'something-else',
        containers: [],
      });
      expect(result.success).toBe(false);
    });

    it('validates container type discriminator', () => {
      const result = RailsConfigSchema.safeParse({
        inherits: 'room',
        containers: [
          {
            id: 'test',
            type: 'grid', // invalid
            from: 'a',
            to: 'b',
            facing: 'inward',
            items: [],
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PlacementsConfigSchema', () => {
    it('validates the production placements.json', () => {
      const raw = loadJson('placements.json');
      const result = PlacementsConfigSchema.safeParse(raw);
      expect(result.success).toBe(true);
    });

    it('requires inherits to be "rails"', () => {
      const result = PlacementsConfigSchema.safeParse({
        inherits: 'room',
        placements: {},
      });
      expect(result.success).toBe(false);
    });

    it('validates placement at-array form', () => {
      const result = PlacementsConfigSchema.safeParse({
        inherits: 'rails',
        placements: {
          test: {
            on: 'floor',
            at: [0.5, 0.5],
            minBounds: [1, 1, 1],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('validates placement at-object form with anchor interpolation', () => {
      const result = PlacementsConfigSchema.safeParse({
        inherits: 'rails',
        placements: {
          test: {
            on: 'ceiling',
            at: {
              x: {from: 'ceiling:center', to: 'ceiling:left-midpoint', t: 0.5},
              z: {from: 'ceiling:center', to: 'ceiling:bottom-midpoint', t: 0.5},
            },
            minBounds: [1.4, 0.5, 0.5],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects placement missing minBounds', () => {
      const result = PlacementsConfigSchema.safeParse({
        inherits: 'rails',
        placements: {
          test: {
            on: 'floor',
            at: [0.5, 0.5],
          },
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
