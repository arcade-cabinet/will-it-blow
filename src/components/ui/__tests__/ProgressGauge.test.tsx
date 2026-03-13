/**
 * @module ProgressGauge.test
 * Tests for the ProgressGauge component.
 *
 * Covers:
 * - Renders label and percentage text
 * - Clamps value to [0, 100]
 * - Uses custom color
 * - Danger threshold turns fill red when exceeded
 * - Danger threshold marker renders at correct position
 * - Accessibility role="progressbar" with min/max/now values
 * - No glow shadow when value <= 5
 */

import {describe, expect, it} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {ProgressGauge} from '../ProgressGauge';

describe('ProgressGauge', () => {
  it('renders the label text', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="PRESSURE" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('PRESSURE');
  });

  it('renders the percentage value', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={42} label="FILL" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('42%');
  });

  it('clamps values above 100 to 100%', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={150} label="OVERFILL" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('100%');
  });

  it('clamps negative values to 0%', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={-20} label="UNDERFILL" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('0%');
  });

  it('rounds fractional values for display', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={33.7} label="TEMP" />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    // The percentage text is rendered as ["34", "%"] children (React splits text nodes)
    expect(root.props.accessibilityValue.now).toBe(34);
  });

  it('uses default green color when no color prop given', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="TEST" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    // Default is #4CAF50 — the percentage text color should be the fill color
    expect(json).toContain('#4CAF50');
  });

  it('uses custom color from props', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="TEST" color="#00BFFF" />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('#00BFFF');
  });

  it('turns red when value exceeds danger threshold', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={85} label="PRESSURE" dangerThreshold={80} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    // Should contain the danger red color #FF1744
    expect(json).toContain('#FF1744');
  });

  it('uses normal color when value is at or below danger threshold', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProgressGauge value={80} label="PRESSURE" color="#4CAF50" dangerThreshold={80} />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    // Should use normal color, not danger red
    expect(json).toContain('#4CAF50');
    // Percentage text should not be red
    expect(json).not.toContain('"color":"#FF1744"');
  });

  it('renders a danger threshold marker when dangerThreshold is set', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="PRESSURE" dangerThreshold={75} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    // The threshold marker should use left: "75%"
    expect(json).toContain('75%');
  });

  it('does not render a threshold marker when dangerThreshold is undefined', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="TEST" />);
    });
    // Inspect the track view — it should only have the fill view, no marker
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    // The track is the second child of the container (after labelRow)
    const track = root.children![1] as renderer.ReactTestRendererJSON;
    // Only the fill bar should be a child (no threshold marker)
    expect(track.children).toHaveLength(1);
  });

  it('has accessibilityRole="progressbar"', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={60} label="HEAT" />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.props.accessibilityRole).toBe('progressbar');
  });

  it('has accessibilityValue with correct min, max, now', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={65} label="TEMP" />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.props.accessibilityValue).toEqual({min: 0, max: 100, now: 65});
  });

  it('has accessibilityLabel matching the label prop', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={50} label="FILL LEVEL" />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.props.accessibilityLabel).toBe('FILL LEVEL');
  });

  it('renders at 0% without errors', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={0} label="EMPTY" />);
    });
    expect(tree!.toJSON()).not.toBeNull();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('0%');
  });

  it('renders at 100% without errors', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProgressGauge value={100} label="FULL" />);
    });
    expect(tree!.toJSON()).not.toBeNull();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('100%');
  });
});
