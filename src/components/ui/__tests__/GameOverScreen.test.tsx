import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';

vi.mock('../../../engine/AudioEngine', () => ({
  audioEngine: {
    playRatingSong: vi.fn(),
  },
}));

import {GameOverScreen} from '../GameOverScreen';

const defaultProps = {
  rank: 'S' as string,
  totalScore: 92,
  breakdown: [
    {label: 'Ingredients', score: 85},
    {label: 'Chopping', score: 90},
    {label: 'Grinding', score: 95},
    {label: 'Stuffing', score: 88},
    {label: 'Cooking', score: 100},
  ],
  demandBonus: 5,
  onPlayAgain: vi.fn(),
  onMenu: vi.fn(),
};

describe('GameOverScreen', () => {
  it('renders without crashing', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays rank badge', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    expect(container.textContent).toContain('S');
  });

  it('displays per-challenge score breakdown', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    const text = container.textContent!;
    expect(text).toContain('Ingredients');
    expect(text).toContain('85');
    expect(text).toContain('Grinding');
    expect(text).toContain('95');
  });

  it('displays demand bonus', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    const text = container.textContent!;
    expect(text).toContain('DEMAND BONUS');
    expect(text).toContain('5');
  });

  it('displays PLAY AGAIN button', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    expect(container.textContent).toContain('PLAY AGAIN');
  });

  it('displays MENU button', () => {
    const {container} = render(<GameOverScreen {...defaultProps} />);
    expect(container.textContent).toContain('MENU');
  });

  it('uses gold color for S rank', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../GameOverScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#FFD700');
  });

  it('uses silver color for A rank', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../GameOverScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#C0C0C0');
  });

  it('uses bronze color for B rank', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../GameOverScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#CD7F32');
  });

  it('uses blood red color for F rank', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../GameOverScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#FF1744');
  });

  it('renders F rank with blood red', () => {
    const {container} = render(<GameOverScreen {...defaultProps} rank="F" totalScore={20} />);
    expect(container.textContent).toContain('F');
  });

  it('calls onPlayAgain when PLAY AGAIN is pressed', () => {
    const onPlayAgain = vi.fn();
    render(<GameOverScreen {...defaultProps} onPlayAgain={onPlayAgain} />);
    const button = screen.getByLabelText('Start new game');
    fireEvent.click(button);
    expect(onPlayAgain).toHaveBeenCalled();
  });

  it('calls onMenu when MENU is pressed', () => {
    const onMenu = vi.fn();
    render(<GameOverScreen {...defaultProps} onMenu={onMenu} />);
    const button = screen.getByLabelText('Return to main menu');
    fireEvent.click(button);
    expect(onMenu).toHaveBeenCalled();
  });
});
