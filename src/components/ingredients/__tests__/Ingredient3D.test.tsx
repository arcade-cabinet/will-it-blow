import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Ingredient3D } from '../Ingredient3D';

const SHAPES = ['sphere', 'box', 'cylinder', 'elongated', 'wedge', 'cone', 'small-sphere', 'irregular'] as const;

describe('Ingredient3D', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Ingredient3D shape="sphere" color="#ff0000" />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders all shape types', async () => {
    for (const shape of SHAPES) {
      const renderer = await ReactThreeTestRenderer.create(
        <Ingredient3D shape={shape} color="#ff0000" />
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
      await renderer.unmount();
    }
  });

  it('applies position prop', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Ingredient3D shape="sphere" color="#ff0000" position={[1, 2, 3]} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });

  it('applies scale prop', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Ingredient3D shape="sphere" color="#ff0000" scale={2} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.scale.x).toBe(2);
  });
});
