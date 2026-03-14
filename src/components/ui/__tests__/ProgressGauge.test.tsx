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
 * - Accessibility attributes
 */

import {render, screen} from '@testing-library/react';
import {ProgressGauge} from '../ProgressGauge';

describe('ProgressGauge', () => {
  it('renders the label text', () => {
    const {container} = render(<ProgressGauge value={50} label="PRESSURE" />);
    expect(container.textContent).toContain('PRESSURE');
  });

  it('renders the percentage value', () => {
    const {container} = render(<ProgressGauge value={42} label="FILL" />);
    expect(container.textContent).toContain('42%');
  });

  it('clamps values above 100 to 100%', () => {
    const {container} = render(<ProgressGauge value={150} label="OVERFILL" />);
    expect(container.textContent).toContain('100%');
  });

  it('clamps negative values to 0%', () => {
    const {container} = render(<ProgressGauge value={-20} label="UNDERFILL" />);
    expect(container.textContent).toContain('0%');
  });

  it('rounds fractional values for display', () => {
    const {container} = render(<ProgressGauge value={33.7} label="TEMP" />);
    expect(container.textContent).toContain('34%');
  });

  it('uses default green color when no color prop given', () => {
    const {container} = render(<ProgressGauge value={50} label="TEST" />);
    // jsdom renders hex as rgb() — #4CAF50 = rgb(76, 175, 80)
    const html = container.innerHTML;
    expect(html.includes('#4CAF50') || html.includes('rgb(76, 175, 80)')).toBe(true);
  });

  it('uses custom color from props', () => {
    const {container} = render(<ProgressGauge value={50} label="TEST" color="#00BFFF" />);
    // #00BFFF = rgb(0, 191, 255)
    const html = container.innerHTML;
    expect(html.includes('#00BFFF') || html.includes('rgb(0, 191, 255)')).toBe(true);
  });

  it('turns red when value exceeds danger threshold', () => {
    const {container} = render(
      <ProgressGauge value={85} label="PRESSURE" dangerThreshold={80} />,
    );
    // #FF1744 = rgb(255, 23, 68)
    const html = container.innerHTML;
    expect(html.includes('#FF1744') || html.includes('rgb(255, 23, 68)')).toBe(true);
  });

  it('uses normal color when value is at or below danger threshold', () => {
    const {container} = render(
      <ProgressGauge value={80} label="PRESSURE" color="#4CAF50" dangerThreshold={80} />,
    );
    // #4CAF50 = rgb(76, 175, 80)
    const html = container.innerHTML;
    expect(html.includes('#4CAF50') || html.includes('rgb(76, 175, 80)')).toBe(true);
  });

  it('renders a danger threshold marker when dangerThreshold is set', () => {
    const {container} = render(
      <ProgressGauge value={50} label="PRESSURE" dangerThreshold={75} />,
    );
    expect(container.innerHTML).toContain('75%');
  });

  it('has accessibilityRole="progressbar"', () => {
    const {container} = render(<ProgressGauge value={60} label="HEAT" />);
    expect(container.innerHTML).toContain('progressbar');
  });

  it('has accessibility label matching the label prop', () => {
    render(<ProgressGauge value={50} label="FILL LEVEL" />);
    expect(screen.getByLabelText('FILL LEVEL')).toBeDefined();
  });

  it('renders at 0% without errors', () => {
    const {container} = render(<ProgressGauge value={0} label="EMPTY" />);
    expect(container.innerHTML).toBeTruthy();
    expect(container.textContent).toContain('0%');
  });

  it('renders at 100% without errors', () => {
    const {container} = render(<ProgressGauge value={100} label="FULL" />);
    expect(container.innerHTML).toBeTruthy();
    expect(container.textContent).toContain('100%');
  });
});
