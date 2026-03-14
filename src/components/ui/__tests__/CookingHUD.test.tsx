import {describe, expect, it} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {CookingHUD} from '../CookingHUD';

describe('CookingHUD', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays temperature gauge', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('150');
  });

  it('displays target zone', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('TARGET');
  });

  it('shows in-zone indicator when temperature is in target range', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('IN ZONE');
  });

  it('does not show in-zone badge when temperature is outside range', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CookingHUD temperature={200} targetZone={[140, 160]} timeInZone={0} />,
      );
    });
    // The "IN ZONE" badge should not be shown (though "TIME IN ZONE" label still appears)
    const root = tree!.root;
    const _inZoneBadges = root.findAllByProps({
      style: expect.objectContaining({borderColor: '#4CAF50', borderWidth: 2}),
    });
    // No badge with the specific inZoneBadge style
    const badgeTexts = root.findAll(node => {
      try {
        return (
          node.type === 'Text' &&
          node.children?.includes('IN ZONE') &&
          node.parent?.props?.style?.borderRadius === 8
        );
      } catch {
        return false;
      }
    });
    expect(badgeTexts.length).toBe(0);
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
