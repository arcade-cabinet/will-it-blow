import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { StoveStation, sausageColor } from '../StoveStation';

describe('StoveStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={70} heatLevel={0} holdProgress={0} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the stove position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={70} heatLevel={0} holdProgress={0} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(0);
    expect(root.instance.position.y).toBe(0);
    expect(root.instance.position.z).toBe(-6.5);
  });

  it('renders stove body, top, burner, pan, sausage, and thermometer meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={70} heatLevel={0} holdProgress={0} />
    );
    const root = renderer.scene.children[0];
    // Stove body + top + burner + pan + handle + sausage + 2 caps + thermo tube + fill + bulb + sizzle (12) + smoke (10) = 33+
    expect(root.children.length).toBeGreaterThanOrEqual(10);
  });

  it('renders at cooking temperature without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={250} heatLevel={0.7} holdProgress={50} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at high heat without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={200} heatLevel={1.0} holdProgress={80} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at overheating temperature without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation temperature={400} heatLevel={0.9} holdProgress={100} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', async () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../StoveStation.tsx'),
      'utf8'
    );
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });
});

describe('sausageColor', () => {
  it('returns pinkish at low temperature', () => {
    const [r, g, b] = sausageColor(70);
    expect(r).toBeGreaterThan(0.7); // Pinkish
    expect(g).toBeGreaterThan(0.5);
  });

  it('returns brown at medium-high temperature', () => {
    const [r, g, b] = sausageColor(160);
    expect(r).toBeGreaterThan(g); // Brownish
    expect(r).toBeLessThan(0.8);
  });

  it('returns dark/black at very high temperature', () => {
    const [r, g, b] = sausageColor(200);
    expect(r).toBeLessThan(0.3); // Dark/burnt
    expect(g).toBeLessThan(0.3);
  });

  it('interpolates smoothly (no NaN)', () => {
    for (let t = 50; t <= 250; t += 10) {
      const [r, g, b] = sausageColor(t);
      expect(Number.isNaN(r)).toBe(false);
      expect(Number.isNaN(g)).toBe(false);
      expect(Number.isNaN(b)).toBe(false);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
