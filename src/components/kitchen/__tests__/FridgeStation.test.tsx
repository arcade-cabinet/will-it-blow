import ReactThreeTestRenderer from '@react-three/test-renderer';
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
import {FridgeStation} from '../FridgeStation';

const targets = resolveTargets(DEFAULT_ROOM);

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
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders lights, door, shelves, and ingredient meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />,
    );
    // Root group: 2 lights + door group + 3 shelves + back wall + 3 ingredients = 10
    const root = renderer.scene.children[0];
    expect(root.children.length).toBeGreaterThanOrEqual(8);
  });

  it('positions the fridge group at the resolved fridge target', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />,
    );
    const root = renderer.scene.children[0];
    const [ex, ey, ez] = targets.fridge.position;
    expect(root.instance.position.x).toBeCloseTo(ex, 1);
    expect(root.instance.position.y).toBeCloseTo(ey, 1);
    expect(root.instance.position.z).toBeCloseTo(ez, 1);
  });

  it('uses custom position when provided', async () => {
    const custom: [number, number, number] = [-1, -2, -3];
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        position={custom}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(-1);
    expect(root.instance.position.y).toBe(-2);
    expect(root.instance.position.z).toBe(-3);
  });

  it('includes a point light for interior fridge glow', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
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
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set([0, 2])}
        hintActive={false}
        matchingIndices={new Set()}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders with hint active without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FridgeStation
        position={targets.fridge.position}
        ingredients={mockIngredients}
        selectedIds={new Set()}
        hintActive={true}
        matchingIndices={new Set([1])}
        onSelect={jest.fn()}
        onHover={jest.fn()}
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
