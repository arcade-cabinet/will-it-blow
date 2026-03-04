/**
 * Tests for PlaceSetting — table dressing component for the blowout challenge.
 */

import ReactThreeTestRenderer from '@react-three/test-renderer';
import {PlaceSetting} from '../PlaceSetting';

// PlaceSetting uses only built-in R3F geometry — no GLB loading needed.
// Mock drei to satisfy the import graph of sibling modules in the test env.
jest.mock('@react-three/drei', () => ({
  useGLTF: () => ({scene: {clone: () => ({})}}),
  useTexture: () => ({}),
  useAnimations: () => ({actions: {}}),
}));

const TABLE_POS: [number, number, number] = [3.2, 0, 3.2];

describe('PlaceSetting', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={TABLE_POS} />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('positions the root group at table-top height (position[1] + 0.9)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={TABLE_POS} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(TABLE_POS[0], 1);
    expect(root.instance.position.y).toBeCloseTo(TABLE_POS[1] + 0.9, 2);
    expect(root.instance.position.z).toBeCloseTo(TABLE_POS[2], 1);
  });

  it('renders multiple child meshes (plate, utensils, glass, napkin)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={TABLE_POS} />);
    // Recurse to count all Mesh nodes
    let meshCount = 0;
    function countMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshCount++;
      for (const child of node.children ?? []) countMeshes(child);
    }
    countMeshes(renderer.scene.children[0]);
    // Plate(2) + Fork(3) + Knife(2) + Glass(2) + Napkin(1) = 10 meshes minimum
    expect(meshCount).toBeGreaterThanOrEqual(10);
  });

  it('returns null when visible=false', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <PlaceSetting position={TABLE_POS} visible={false} />,
    );
    expect(renderer.scene.children.length).toBe(0);
  });

  it('has a group named "place-setting" at root', async () => {
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={TABLE_POS} />);
    const root = renderer.scene.children[0];
    expect(root.instance.name).toBe('place-setting');
  });

  it('contains named sub-groups for each piece of tableware', async () => {
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={TABLE_POS} />);
    const names: string[] = [];
    function collectNames(node: any) {
      if (node.instance?.name) names.push(node.instance.name);
      for (const child of node.children ?? []) collectNames(child);
    }
    collectNames(renderer.scene.children[0]);
    expect(names).toContain('place-setting');
    expect(names).toContain('plate');
    expect(names).toContain('fork');
    expect(names).toContain('knife');
    expect(names).toContain('glass');
    expect(names).toContain('napkin');
  });

  it('uses custom position correctly', async () => {
    const custom: [number, number, number] = [-2, 1, 4];
    const renderer = await ReactThreeTestRenderer.create(<PlaceSetting position={custom} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(-2, 1);
    expect(root.instance.position.y).toBeCloseTo(1.9, 2); // 1 + 0.9
    expect(root.instance.position.z).toBeCloseTo(4, 1);
  });
});
