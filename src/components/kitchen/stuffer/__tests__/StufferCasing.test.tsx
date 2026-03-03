import ReactThreeTestRenderer from '@react-three/test-renderer';
import {pressureToColor, StufferCasing} from '../StufferCasing';

describe('StufferCasing', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferCasing fillLevel={0} pressureLevel={0} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders with blendColor prop', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferCasing fillLevel={0.5} pressureLevel={0.5} blendColor="#ff0000" />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });
});

describe('pressureToColor', () => {
  it('returns green at pressure 0', () => {
    const [r, g, b] = pressureToColor(0);
    expect(r).toBeCloseTo(0.2, 1);
    expect(g).toBeCloseTo(0.7, 1);
    expect(b).toBeCloseTo(0.15, 1);
  });

  it('returns yellow at pressure 0.5', () => {
    const [r, g, b] = pressureToColor(0.5);
    expect(r).toBeCloseTo(0.85, 1);
    expect(g).toBeCloseTo(0.75, 1);
    expect(b).toBeCloseTo(0.1, 1);
  });

  it('returns red at pressure 1.0', () => {
    const [r, g, b] = pressureToColor(1.0);
    expect(r).toBeCloseTo(0.9, 1);
    expect(g).toBeCloseTo(0.1, 1);
    expect(b).toBeCloseTo(0.05, 1);
  });

  it('interpolates between green and yellow at pressure 0.25', () => {
    const [r, g, b] = pressureToColor(0.25);
    // Midpoint between green [0.2, 0.7, 0.15] and yellow [0.85, 0.75, 0.1]
    expect(r).toBeCloseTo(0.525, 1);
    expect(g).toBeCloseTo(0.725, 1);
    expect(b).toBeCloseTo(0.125, 1);
  });

  it('clamps values below 0', () => {
    const result = pressureToColor(-0.5);
    expect(result).toEqual(pressureToColor(0));
  });

  it('clamps values above 1', () => {
    const result = pressureToColor(1.5);
    expect(result).toEqual(pressureToColor(1));
  });
});
