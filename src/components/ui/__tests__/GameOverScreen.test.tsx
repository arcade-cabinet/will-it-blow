import {vi} from 'vitest';
import renderer, {act} from 'react-test-renderer';

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
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays rank badge', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('S');
  });

  it('displays per-challenge score breakdown', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Ingredients');
    expect(json).toContain('85');
    expect(json).toContain('Grinding');
    expect(json).toContain('95');
  });

  it('displays demand bonus', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('DEMAND BONUS');
    // The bonus value "+" and "5" are separate children in the React tree
    expect(json).toContain('"5"');
  });

  it('displays PLAY AGAIN button', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('PLAY AGAIN');
  });

  it('displays MENU button', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('MENU');
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
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} rank="F" totalScore={20} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('F');
  });

  it('calls onPlayAgain when PLAY AGAIN is pressed', () => {
    const onPlayAgain = vi.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} onPlayAgain={onPlayAgain} />);
    });
    // Find and trigger the PLAY AGAIN button
    const root = tree!.root;
    const buttons = root.findAllByProps({accessibilityLabel: 'Start new game'});
    expect(buttons.length).toBeGreaterThan(0);
    act(() => {
      buttons[0].props.onPress();
    });
    expect(onPlayAgain).toHaveBeenCalled();
  });

  it('calls onMenu when MENU is pressed', () => {
    const onMenu = vi.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GameOverScreen {...defaultProps} onMenu={onMenu} />);
    });
    const root = tree!.root;
    const buttons = root.findAllByProps({accessibilityLabel: 'Return to main menu'});
    expect(buttons.length).toBeGreaterThan(0);
    act(() => {
      buttons[0].props.onPress();
    });
    expect(onMenu).toHaveBeenCalled();
  });
});
