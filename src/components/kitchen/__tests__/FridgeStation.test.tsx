import ReactThreeTestRenderer from '@react-three/test-renderer';
import {FridgeStation} from '../FridgeStation';

const mockIngredients = [
  {
    name: 'Big Mac',
    emoji: '🍔',
    color: '#D4A017',
    tasteMod: 3,
    textureMod: 3,
    burstRisk: 0.2,
    blowPower: 2,
    category: 'fast food' as const,
    shape: {base: 'box' as const, detail: 'rounded' as const},
  },
  {
    name: 'SpaghettiOs',
    emoji: '🍝',
    color: '#E85D2C',
    tasteMod: 2,
    textureMod: 1,
    burstRisk: 0.5,
    blowPower: 4,
    category: 'canned' as const,
    shape: {base: 'sphere' as const, detail: 'wobbly' as const},
  },
  {
    name: 'Lobster',
    emoji: '🦞',
    color: '#C41E3A',
    tasteMod: 5,
    textureMod: 4,
    burstRisk: 0.1,
    blowPower: 1,
    category: 'fancy' as const,
    shape: {base: 'elongated' as const, detail: 'claws' as const},
  },
];

describe('FridgeStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders fridge body, door, shelves, and ingredient meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
      />,
    );
    // Root group should contain fridge body, door, shelves, interior light, and ingredient meshes
    const root = renderer.scene.children[0];
    // Fridge body (1) + door (1) + interior light emissive (1) + pointLight (1) + shelves (3) + ingredients (3) = 10
    expect(root.children.length).toBeGreaterThanOrEqual(8);
  });

  it('positions the fridge group at the expected location', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
      />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(-5);
    expect(root.instance.position.y).toBe(1.5);
    expect(root.instance.position.z).toBe(-4);
  });

  it('includes a point light for interior fridge glow', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
      />,
    );
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
    findLights(renderer.scene.children[0]);
    expect(pointLights.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with selected ingredients without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set([0, 2])}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders with hint active without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={true}
        matchingIndices={new Set([1])}
        onSelect={jest.fn()}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FridgeStation.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });
});
