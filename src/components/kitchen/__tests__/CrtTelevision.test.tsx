import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { CrtTelevision } from '../CrtTelevision';

describe('CrtTelevision', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at the expected wall position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" />
    );
    const root = renderer.scene.children[0];
    // TV should be mounted high on the back wall
    expect(root.instance.position.y).toBeGreaterThan(2);
  });

  it('uses the default position when none is provided', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(0);
    expect(root.instance.position.y).toBe(2.5);
    expect(root.instance.position.z).toBe(-5.5);
  });

  it('accepts a custom position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" position={[1, 3, -4]} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(3);
    expect(root.instance.position.z).toBe(-4);
  });

  it('accepts all valid reactions without error', async () => {
    const reactions = ['idle', 'flinch', 'laugh', 'disgust', 'excitement', 'nervous', 'nod', 'talk'] as const;
    for (const reaction of reactions) {
      const renderer = await ReactThreeTestRenderer.create(
        <CrtTelevision reaction={reaction} />
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
      await renderer.unmount();
    }
  });
});
