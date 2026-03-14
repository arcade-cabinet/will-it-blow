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
      expect(source).toContain("WHAT'S IN THE BOX?");
      expect(source).toContain('CHOP IT UP');
      expect(source).toContain('FASTER!');
      expect(source).toContain('FILL IT UP');
      expect(source).toContain('TIE IT OFF');
      expect(source).toContain("DON'T LET IT BURN");
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
