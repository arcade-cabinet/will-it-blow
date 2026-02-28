import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { MrSausage3D } from '../MrSausage3D';

describe('MrSausage3D', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('creates a root group at the specified position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" position={[1, 2, 3]} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });

  it('applies scale uniformly', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" scale={0.5} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.scale.x).toBe(0.5);
    expect(root.instance.scale.y).toBe(0.5);
    expect(root.instance.scale.z).toBe(0.5);
  });

  it('accepts all valid reactions without error', async () => {
    const reactions = ['idle', 'flinch', 'laugh', 'disgust', 'excitement', 'nervous', 'nod', 'talk'] as const;
    for (const reaction of reactions) {
      const renderer = await ReactThreeTestRenderer.create(
        <MrSausage3D reaction={reaction} />
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
      await renderer.unmount();
    }
  });
});
