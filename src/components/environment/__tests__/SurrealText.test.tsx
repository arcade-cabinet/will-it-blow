/**
 * Source-analysis tests for SurrealText.tsx.
 *
 * Uses fs.readFileSync to inspect source patterns rather than
 * @react-three/test-renderer (incompatible with this project's setup).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_PATH = path.resolve(__dirname, '../SurrealText.tsx');
const source = fs.readFileSync(SRC_PATH, 'utf8');

describe('SurrealText — source analysis', () => {
  describe('imports', () => {
    it('imports Text from @react-three/drei (not React Native)', () => {
      expect(source).toContain("import {Text} from '@react-three/drei'");
    });

    it('imports useFrame from @react-three/fiber for animations', () => {
      expect(source).toContain("from '@react-three/fiber'");
    });

    it('imports useGameStore from ecs/hooks for reading game state', () => {
      expect(source).toContain('useGameStore');
      expect(source).toContain("from '../../ecs/hooks'");
    });

    it('imports GamePhase type from ecs/hooks', () => {
      expect(source).toContain("import type {GamePhase} from '../../ecs/hooks'");
    });
  });

  describe('SurrealMessage component', () => {
    it('renders drei Text component', () => {
      expect(source).toContain('<Text');
    });

    it('uses meshStandardMaterial for text rendering', () => {
      expect(source).toContain('<meshStandardMaterial');
    });

    it('supports animation via useFrame', () => {
      expect(source).toContain('useFrame');
    });

    it('sets depthWrite to false for correct transparency', () => {
      expect(source).toContain('depthWrite={false}');
    });

    it('supports dismiss animation with isDismissing prop', () => {
      expect(source).toContain('isDismissing');
    });

    it('accepts a surface placement prop', () => {
      expect(source).toContain('surface: SurfacePlacement');
    });

    it('sets blood-red color on Text for readability', () => {
      expect(source).toContain('color="#FF1744"');
    });

    it('uses black outline for contrast', () => {
      expect(source).toContain('outlineColor="#000000"');
      expect(source).toContain('outlineWidth={0.02}');
    });

    it('renders a dark background plane behind text for contrast', () => {
      expect(source).toContain('<planeGeometry');
      expect(source).toContain('meshBasicMaterial');
    });
  });

  describe('phase-directed surface placement', () => {
    it('defines PHASE_SURFACE mapping for all 13 game phases', () => {
      expect(source).toContain('PHASE_SURFACE');
      // Verify key phases are mapped
      expect(source).toContain('SELECT_INGREDIENTS:');
      expect(source).toContain('CHOPPING:');
      expect(source).toContain('FILL_GRINDER:');
      expect(source).toContain('GRINDING:');
      expect(source).toContain('STUFFING:');
      expect(source).toContain('TIE_CASING:');
      expect(source).toContain('BLOWOUT:');
      expect(source).toContain('COOKING:');
      expect(source).toContain('DONE:');
    });

    it('places SELECT_INGREDIENTS text near the freezer back-left wall', () => {
      expect(source).toContain('[-2.5, 1.5, -3.8]');
    });

    it('places CHOPPING text on the right wall near chopping block', () => {
      expect(source).toContain('[2.9, 1.5, 0]');
    });

    it('places GRINDER phases on the left wall', () => {
      expect(source).toContain('[-2.9, 1.5, -1]');
    });

    it('places STUFFER phases on the back wall center', () => {
      expect(source).toContain('[0, 1.5, -3.8]');
    });

    it('places BLOWOUT text on the floor', () => {
      expect(source).toContain('[0, 0.01, 1.5]');
    });

    it('places COOKING text on the right wall near the stove', () => {
      expect(source).toContain('[2.9, 1.5, -2.5]');
    });

    it('places DONE text near the TV on left wall', () => {
      expect(source).toContain('[-2.9, 1.8, 0]');
    });
  });

  describe('three-layer text system', () => {
    it('has a demands layer always on the ceiling', () => {
      expect(source).toContain('CEILING_SURFACE');
      expect(source).toContain('Demands');
    });

    it('has a Mr. Sausage taunt layer near the TV', () => {
      expect(source).toContain('TV_WALL_SURFACE');
      expect(source).toContain('taunt');
    });

    it('has phase instruction messages near active stations', () => {
      expect(source).toContain('phaseMessages');
      expect(source).toContain('Phase instructions');
    });
  });

  describe('SurrealText orchestrator', () => {
    it('exports SurrealText as named export', () => {
      expect(source).toContain('export function SurrealText()');
    });

    it('reads introActive from store', () => {
      expect(source).toContain('state.introActive');
    });

    it('reads posture from store', () => {
      expect(source).toContain('state.posture');
    });

    it('reads gamePhase from store', () => {
      expect(source).toContain('state.gamePhase');
    });

    it('reads finalScore from store', () => {
      expect(source).toContain('state.finalScore');
    });

    it('reads mrSausageDemands from store', () => {
      expect(source).toContain('state.mrSausageDemands');
    });

    it('reads currentRound from store', () => {
      expect(source).toContain('state.currentRound');
    });

    it('reads totalRounds from store', () => {
      expect(source).toContain('state.totalRounds');
    });

    it('has phase labels for gameplay', () => {
      expect(source).toContain('PICK 3 INGREDIENTS');
      expect(source).toContain('CHOP IT UP');
      expect(source).toContain('GRIND IT DOWN');
      expect(source).toContain('STUFF THE CASING');
      expect(source).toContain('TIE IT OFF');
      expect(source).toContain("DON'T LET IT BURN");
    });

    it('includes Mr. Sausage taunt lines per phase', () => {
      expect(source).toContain('PHASE_TAUNTS');
      expect(source).toContain('Choose wisely...');
      expect(source).toContain('Feel the rhythm of the blade.');
      expect(source).toContain("Don't you DARE burn it.");
    });
  });

  describe('no 2D HUD patterns', () => {
    it('does not import from react-native', () => {
      expect(source).not.toContain("from 'react-native'");
    });

    it('does not use View components', () => {
      expect(source).not.toContain('<View');
    });

    it('does not use StyleSheet', () => {
      expect(source).not.toContain('StyleSheet');
    });
  });
});
