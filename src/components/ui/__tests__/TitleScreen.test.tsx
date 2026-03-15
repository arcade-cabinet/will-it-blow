import {fireEvent, render} from '@testing-library/react';
import {vi} from 'vitest';

// Mock the ecs hooks module
const mockSetDifficulty = vi.fn();
const mockStartNewGame = vi.fn();

vi.mock('../../../ecs/hooks', () => ({
  useGameStore: (selector: (state: any) => any) =>
    selector({
      setDifficulty: mockSetDifficulty,
      startNewGame: mockStartNewGame,
    }),
}));

import {TitleScreen} from '../TitleScreen';

describe('TitleScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const {container} = render(<TitleScreen />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays "WILL IT" and "BLOW?" title text', () => {
    const {container} = render(<TitleScreen />);
    const text = container.textContent!;
    expect(text).toContain('WILL IT');
    expect(text).toContain('BLOW?');
  });

  it('displays "Fine Meats & Sausages" tagline', () => {
    const {container} = render(<TitleScreen />);
    expect(container.textContent).toContain('Fine Meats & Sausages');
  });

  it('displays "Est. 1974" on the sign', () => {
    const {container} = render(<TitleScreen />);
    expect(container.textContent).toContain('Est. 1974');
  });

  it('displays START COOKING button', () => {
    const {container} = render(<TitleScreen />);
    expect(container.textContent).toContain('START COOKING');
  });

  it('shows difficulty selector when START COOKING is clicked', () => {
    const {container, getByText} = render(<TitleScreen />);
    fireEvent.click(getByText('START COOKING'));
    expect(container.textContent).toContain('CHOOSE YOUR DONENESS');
  });

  it('shows all five difficulty tiers after clicking START COOKING', () => {
    const {container, getByText} = render(<TitleScreen />);
    fireEvent.click(getByText('START COOKING'));
    const text = container.textContent!;
    expect(text).toContain('Rare');
    expect(text).toContain('Medium Rare');
    expect(text).toContain('Medium');
    expect(text).toContain('Medium Well');
    expect(text).toContain('Well Done');
  });

  it('shows PERMADEATH divider in difficulty selector', () => {
    const {container, getByText} = render(<TitleScreen />);
    fireEvent.click(getByText('START COOKING'));
    expect(container.textContent).toContain('PERMADEATH');
  });

  it('BACK button in difficulty selector returns to title', () => {
    const {container, getByText, getByLabelText} = render(<TitleScreen />);
    fireEvent.click(getByText('START COOKING'));
    expect(container.textContent).toContain('CHOOSE YOUR DONENESS');
    fireEvent.click(getByLabelText('Back to main menu'));
    expect(container.textContent).toContain('START COOKING');
    expect(container.textContent).not.toContain('CHOOSE YOUR DONENESS');
  });

  it('uses dark background (#0a0a0a)', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../TitleScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#0a0a0a');
  });

  it('uses blood-red (#FF1744) for title text', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../TitleScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#FF1744');
  });

  it('uses gold (#D2A24C) for butcher shop accents', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../TitleScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#D2A24C');
  });

  it('displays footer text', () => {
    const {container} = render(<TitleScreen />);
    expect(container.textContent).toContain("Mr. Sausage's Fine Meats & Sausages");
  });
});
