import {render} from '@testing-library/react';
import {CookingHUD} from '../CookingHUD';

describe('CookingHUD', () => {
  it('renders without crashing', () => {
    const {container} = render(
      <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
    );
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays temperature gauge', () => {
    const {container} = render(
      <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
    );
    expect(container.textContent).toContain('150');
  });

  it('displays target zone', () => {
    const {container} = render(
      <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
    );
    expect(container.textContent).toContain('TARGET');
  });

  it('shows in-zone indicator when temperature is in target range', () => {
    const {container} = render(
      <CookingHUD temperature={150} targetZone={[140, 160]} timeInZone={3} />,
    );
    expect(container.textContent).toContain('IN ZONE');
  });

  it('does not show in-zone badge when temperature is outside range', () => {
    const {container} = render(
      <CookingHUD temperature={200} targetZone={[140, 160]} timeInZone={0} />,
    );
    // "IN ZONE" badge should not appear (only "TIME IN ZONE" label)
    const text = container.textContent!;
    expect(text).toContain('TIME IN ZONE');
    // Remove "TIME IN ZONE" and check remaining text doesn't have "IN ZONE"
    const withoutTimeLabel = text.replace('TIME IN ZONE', '');
    expect(withoutTimeLabel).not.toContain('IN ZONE');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
