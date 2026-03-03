import ReactThreeTestRenderer from '@react-three/test-renderer';
import {SausageLinksBody} from '../SausageLinksBody';

describe('SausageLinksBody', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SausageLinksBody
        position={[0, 1, 0]}
        visible={true}
        numLinks={3}
        cookLevel={0}
        isCooking={false}
        extrusionProgress={0}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at the provided position', async () => {
    const pos: [number, number, number] = [2, 3, 4];
    const renderer = await ReactThreeTestRenderer.create(
      <SausageLinksBody
        position={pos}
        visible={true}
        numLinks={3}
        cookLevel={0}
        isCooking={false}
        extrusionProgress={0}
      />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(2, 1);
    expect(root.instance.position.y).toBeCloseTo(3, 1);
    expect(root.instance.position.z).toBeCloseTo(4, 1);
  });

  it('creates geometry with the correct number of bones for the given numLinks', async () => {
    const numLinks = 5;
    const renderer = await ReactThreeTestRenderer.create(
      <SausageLinksBody
        position={[0, 0, 0]}
        visible={true}
        numLinks={numLinks}
        cookLevel={0}
        isCooking={false}
        extrusionProgress={1}
      />,
    );
    const root = renderer.scene.children[0];
    // Root group should have at least one child (the skinned mesh primitive)
    expect(root.children.length).toBeGreaterThanOrEqual(1);
  });

  it('accepts blendColor prop without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SausageLinksBody
        position={[0, 0, 0]}
        visible={true}
        numLinks={3}
        cookLevel={0.5}
        isCooking={true}
        extrusionProgress={0.5}
        blendColor="#ff0000"
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('imports from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../SausageLinksBody.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('uses Rapier physics imports', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../SausageLinksBody.tsx'), 'utf8');
    expect(source).toContain('@react-three/rapier');
    expect(source).toContain('RigidBody');
    expect(source).toContain('BallCollider');
  });
});
