import ReactThreeTestRenderer from '@react-three/test-renderer';
import {KitchenEnvironment} from '../KitchenEnvironment';

// Mock drei hooks since we don't have actual assets in tests
jest.mock('@react-three/drei', () => ({
  useGLTF: jest.fn(() => ({
    scene: {
      clone: jest.fn(() => ({
        traverse: jest.fn(),
      })),
      traverse: jest.fn(),
    },
    animations: [],
  })),
  useAnimations: jest.fn(() => ({
    actions: {},
    mixer: {stopAllAction: jest.fn()},
  })),
  useTexture: jest.fn(() => {
    // Return a mock texture object for each map key
    const mockTex = {wrapS: 0, wrapT: 0, repeat: {set: jest.fn()}};
    return {
      map: mockTex,
      normalMap: mockTex,
      roughnessMap: mockTex,
      aoMap: mockTex,
      alphaMap: mockTex,
    };
  }),
}));

describe('KitchenEnvironment', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('creates room geometry (floor, ceiling, walls)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    // Root group should have many children: room meshes + lights + FurnitureLoader + grime decals
    const root = renderer.scene.children[0];
    expect(root.children.length).toBeGreaterThan(3);
  });

  it('includes floor at y=0', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    // Floor is inside RoomEnclosure group (first child of root group)
    const meshes: any[] = [];
    function findMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshes.push(node);
      if (node.children) node.children.forEach(findMeshes);
    }
    findMeshes(renderer.scene.children[0]);
    const floor = meshes.find(
      (m: any) =>
        m.instance.position.y === 0 && Math.abs(m.instance.rotation.x - -Math.PI / 2) < 0.01,
    );
    expect(floor).toBeDefined();
  });

  it('includes ceiling at room height', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    // Ceiling is inside RoomEnclosure group at y=5.5 (ROOM_H)
    const meshes: any[] = [];
    function findMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshes.push(node);
      if (node.children) node.children.forEach(findMeshes);
    }
    findMeshes(renderer.scene.children[0]);
    const ceiling = meshes.find((m: any) => m.instance.position.y === 5.5);
    expect(ceiling).toBeDefined();
  });

  it('includes hemisphere light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    const root = renderer.scene.children[0];
    const hemiLight = root.children.find((child: any) => child.instance.type === 'HemisphereLight');
    expect(hemiLight).toBeDefined();
  });

  it('includes point lights for fluorescent tubes', async () => {
    const renderer = await ReactThreeTestRenderer.create(<KitchenEnvironment />);
    // Collect all PointLights recursively (tube lights are nested inside groups)
    const pointLights: any[] = [];
    function findPointLights(node: any) {
      if (node.instance?.type === 'PointLight') {
        pointLights.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          findPointLights(child);
        }
      }
    }
    findPointLights(renderer.scene.children[0]);
    // At least 4: 1 center fill + 3 tube lights
    expect(pointLights.length).toBeGreaterThanOrEqual(4);
  });

  it('has no Babylon.js imports', async () => {
    // Static check: read the source file and ensure no Babylon imports
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../KitchenEnvironment.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });
});
