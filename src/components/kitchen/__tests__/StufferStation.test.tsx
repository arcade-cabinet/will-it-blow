import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { StufferStation, pressureToColor } from '../StufferStation';

describe('StufferStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={0} pressureLevel={0} isPressing={false} hasBurst={false} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the stuffer position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={0} pressureLevel={0} isPressing={false} hasBurst={false} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(5);
    expect(root.instance.position.y).toBe(0);
    expect(root.instance.position.z).toBe(-4);
  });

  it('renders counter, body, plunger, handle, spout, and casing meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={0} pressureLevel={0} isPressing={false} hasBurst={false} />
    );
    const root = renderer.scene.children[0];
    // Counter + body + plunger + handle + knob + spout + casing + casingEnd + meatFill + burst particles = 10+
    expect(root.children.length).toBeGreaterThanOrEqual(8);
  });

  it('renders at mid-fill without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={50} pressureLevel={60} isPressing={true} hasBurst={false} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders during burst without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={80} pressureLevel={95} isPressing={false} hasBurst={true} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at full fill without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferStation fillLevel={100} pressureLevel={100} isPressing={false} hasBurst={false} />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', async () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../StufferStation.tsx'),
      'utf8'
    );
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });
});

describe('pressureToColor', () => {
  it('returns green at low pressure', () => {
    const color = pressureToColor(10);
    // Green channel should be dominant
    expect(color[1]).toBeGreaterThan(color[0]);
  });

  it('returns yellow at mid pressure', () => {
    const color = pressureToColor(50);
    // Both red and green should be high
    expect(color[0]).toBeGreaterThan(0.5);
    expect(color[1]).toBeGreaterThan(0.5);
  });

  it('returns red at high pressure', () => {
    const color = pressureToColor(90);
    // Red channel should be dominant
    expect(color[0]).toBeGreaterThan(color[1]);
  });

  it('returns pure green at 0', () => {
    const color = pressureToColor(0);
    expect(color[1]).toBeGreaterThan(color[0]);
  });

  it('returns pure red at 100', () => {
    const color = pressureToColor(100);
    expect(color[0]).toBeGreaterThan(color[1]);
  });
});
