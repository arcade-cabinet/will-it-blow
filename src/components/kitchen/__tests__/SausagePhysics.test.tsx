/**
 * Source-analysis tests for SausagePhysics.tsx.
 *
 * Uses fs.readFileSync to inspect source patterns rather than
 * @react-three/test-renderer (incompatible with this project's setup).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_PATH = path.resolve(__dirname, '../SausagePhysics.tsx');
const source = fs.readFileSync(SRC_PATH, 'utf8');

describe('SausagePhysics — source analysis', () => {
  describe('imports', () => {
    it('imports from three/webgpu', () => {
      expect(source).toContain("from 'three/webgpu'");
    });

    it('imports from @react-three/rapier', () => {
      expect(source).toContain("from '@react-three/rapier'");
    });

    it('imports RigidBody from @react-three/rapier', () => {
      expect(source).toContain('RigidBody');
    });

    it('imports BallCollider from @react-three/rapier', () => {
      expect(source).toContain('BallCollider');
    });

    it('imports RapierRigidBody type from @react-three/rapier', () => {
      expect(source).toContain('RapierRigidBody');
    });

    it('imports computeSpringImpulse from SausageBody', () => {
      expect(source).toContain('computeSpringImpulse');
    });

    it('imports buildSausageGeometry from SausageBody', () => {
      expect(source).toContain('buildSausageGeometry');
    });

    it('imports applyCookingShrinkage from SausageBody', () => {
      expect(source).toContain('applyCookingShrinkage');
    });

    it('imports useGameStore from gameStore', () => {
      expect(source).toContain('useGameStore');
    });
  });

  describe('segment rigid bodies', () => {
    it('uses NUM_SEGMENTS constant between 4 and 8', () => {
      const match = source.match(/NUM_SEGMENTS\s*=\s*(\d+)/);
      expect(match).not.toBeNull();
      const n = parseInt(match![1], 10);
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(8);
    });

    it('renders RigidBody for each segment', () => {
      expect(source).toContain('<RigidBody');
    });

    it('uses BallCollider for segment colliders', () => {
      expect(source).toContain('<BallCollider');
    });

    it('first segment is kinematicPosition anchor', () => {
      expect(source).toContain("'kinematicPosition'");
    });

    it('remaining segments are dynamic', () => {
      expect(source).toContain("'dynamic'");
    });
  });

  describe('spring logic', () => {
    it('applies spring impulse via computeSpringImpulse', () => {
      expect(source).toContain('computeSpringImpulse(');
    });

    it('reads body translation each frame', () => {
      expect(source).toContain('body.translation()');
    });

    it('reads body linear velocity each frame', () => {
      expect(source).toContain('body.linvel()');
    });

    it('applies impulse to body', () => {
      expect(source).toContain('body.applyImpulse(');
    });

    it('defines spring stiffness constants', () => {
      expect(source).toContain('SPRING_K_NORMAL');
      expect(source).toContain('SPRING_K_PINCH');
    });

    it('reduces stiffness at twist points', () => {
      expect(source).toContain('SPRING_K_PINCH');
      expect(source).toContain('isTwistSeg');
    });
  });

  describe('grab interaction', () => {
    it('sets userData.grabbable on segment meshes', () => {
      expect(source).toContain('grabbable');
    });

    it('sets objectType to sausage in userData', () => {
      expect(source).toContain("objectType: 'sausage'");
    });
  });

  describe('twist point breaks', () => {
    it('tracks broken joints', () => {
      expect(source).toContain('brokenJoints');
    });

    it('uses a break tension threshold', () => {
      expect(source).toContain('BREAK_TENSION_THRESHOLD');
    });

    it('enables gravity for broken segments', () => {
      expect(source).toContain('setGravityScale');
    });
  });

  describe('store integration', () => {
    it('reads sausagePlaced from store', () => {
      expect(source).toContain('sausagePlaced');
    });

    it('reads twistPoints from store', () => {
      expect(source).toContain('twistPoints');
    });

    it('reads blendColor from store', () => {
      expect(source).toContain('blendColor');
    });
  });

  describe('platform guard', () => {
    it('is web-only (returns null on native)', () => {
      expect(source).toContain("Platform.OS !== 'web'");
    });
  });

  describe('cooking deformation', () => {
    it('calls applyCookingShrinkage when cookLevel > 0', () => {
      expect(source).toContain('applyCookingShrinkage(');
    });
  });

  describe('exports', () => {
    it('exports SausagePhysics as named export', () => {
      expect(source).toContain('export function SausagePhysics(');
    });

    it('exports SausagePhysicsProps interface', () => {
      expect(source).toContain('export interface SausagePhysicsProps');
    });
  });
});
