import {vi} from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import {Kitchen} from '../Kitchen';

vi.mock('@react-three/drei', () => ({
  ...vi.importActual('@react-three/drei'),
  useGLTF: vi.fn(() => ({
    scene: new (require('three/webgpu').Group)(),
    nodes: {},
    materials: {},
  })),
}));

describe('Kitchen', () => {
  it('renders without crash', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Kitchen />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('includes ambient light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Kitchen />);
    const root = renderer.scene.children[0];
    const ambientLights: any[] = [];
    function findLights(node: any) {
      if (node.instance?.type === 'AmbientLight') {
        ambientLights.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          findLights(child);
        }
      }
    }
    findLights(root);
    expect(ambientLights.length).toBeGreaterThanOrEqual(1);
  });

  it('includes hemisphere light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Kitchen />);
    const root = renderer.scene.children[0];
    const hemiLights: any[] = [];
    function findLights(node: any) {
      if (node.instance?.type === 'HemisphereLight') {
        hemiLights.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          findLights(child);
        }
      }
    }
    findLights(root);
    expect(hemiLights.length).toBeGreaterThanOrEqual(1);
  });

  it('includes point lights', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Kitchen />);
    const root = renderer.scene.children[0];
    const pointLights: any[] = [];
    function findLights(node: any) {
      if (node.instance?.type === 'PointLight') {
        pointLights.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          findLights(child);
        }
      }
    }
    findLights(root);
    expect(pointLights.length).toBeGreaterThanOrEqual(1);
  });

  it('accepts custom position', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Kitchen position={[1, 0, -1]} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.z).toBe(-1);
  });

  it('uses useGLTF for model loading', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../Kitchen.tsx'), 'utf8');
    expect(source).toContain('useGLTF');
  });
});
