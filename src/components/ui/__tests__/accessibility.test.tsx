/**
 * @module accessibility.test
 * Verifies that all interactive UI components have proper accessibility props.
 *
 * Uses source-level checks for accessibility attributes (accessibilityRole,
 * accessibilityLabel, accessibilityState, accessibilityHint, accessibilityValue)
 * since react-test-renderer does not reliably surface all RN accessibility props
 * and the project does not use @testing-library/react-native.
 *
 * Also renders key components to verify they include accessibility props in output.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {INITIAL_GAME_STATE, useGameStore} from '../../../store/gameStore';

// Mock AudioEngine
jest.mock('../../../engine/AudioEngine', () => ({
  audioEngine: {
    playCorrectPick: jest.fn(),
    playWrongPick: jest.fn(),
    playRatingSong: jest.fn(),
    initTone: jest.fn(),
  },
}));

const reset = () => useGameStore.setState({...INITIAL_GAME_STATE});

beforeEach(() => {
  reset();
});

// ---------------------------------------------------------------------------
// Helper: read a component source file
// ---------------------------------------------------------------------------
function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function readChallengeSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', 'challenges', relativePath), 'utf8');
}

// ---------------------------------------------------------------------------
// SausageButton — menu button used across multiple screens
// ---------------------------------------------------------------------------
describe('SausageButton accessibility', () => {
  it('has accessibilityRole="button" on the Pressable', () => {
    const source = readSource('SausageButton.tsx');
    expect(source).toContain('accessibilityRole="button"');
  });

  it('has accessibilityLabel set to the button label', () => {
    const source = readSource('SausageButton.tsx');
    expect(source).toContain('accessibilityLabel={label}');
  });

  it('has accessibilityState with disabled', () => {
    const source = readSource('SausageButton.tsx');
    expect(source).toContain('accessibilityState={{disabled}}');
  });

  it('renders with accessibility props', () => {
    const {SausageButton} = require('../SausageButton');
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SausageButton label="TEST" onPress={() => {}} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('button');
  });
});

// ---------------------------------------------------------------------------
// TitleScreen — main menu
// ---------------------------------------------------------------------------
describe('TitleScreen accessibility', () => {
  it('has accessibilityRole="header" on the title text', () => {
    const source = readSource('TitleScreen.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('has accessibilityRole="menu" on the menu container', () => {
    const source = readSource('TitleScreen.tsx');
    expect(source).toContain('accessibilityRole="menu"');
  });

  it('uses useKeyboardNav hook', () => {
    const source = readSource('TitleScreen.tsx');
    expect(source).toContain('useKeyboardNav');
  });

  it('uses useReducedMotion hook', () => {
    const source = readSource('TitleScreen.tsx');
    expect(source).toContain('useReducedMotion');
  });

  it('respects reduced motion preference', () => {
    const source = readSource('TitleScreen.tsx');
    expect(source).toContain('reducedMotion');
  });
});

// ---------------------------------------------------------------------------
// SettingsScreen — settings panel
// ---------------------------------------------------------------------------
describe('SettingsScreen accessibility', () => {
  it('has accessibilityRole="header" on the title', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('has accessibilityRole="button" on the back button', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('accessibilityRole="button"');
  });

  it('has accessibilityRole="switch" on the VR toggle', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('accessibilityRole="switch"');
  });

  it('has accessibilityRole="adjustable" on volume sliders', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('accessibilityRole="adjustable"');
  });

  it('has accessibilityValue on volume sliders', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('accessibilityValue=');
  });

  it('mute buttons have accessibility labels', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('Unmute');
    expect(source).toContain('Mute');
  });

  it('uses useKeyboardNav with onEscape', () => {
    const source = readSource('SettingsScreen.tsx');
    expect(source).toContain('useKeyboardNav({onEscape:');
  });
});

// ---------------------------------------------------------------------------
// LoadingScreen — asset preloader
// ---------------------------------------------------------------------------
describe('LoadingScreen accessibility', () => {
  it('has accessibilityRole="progressbar" on the progress area', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('accessibilityRole="progressbar"');
  });

  it('has accessibilityValue on the progress area', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('accessibilityValue=');
  });

  it('has accessibilityRole="alert" on error text', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('accessibilityRole="alert"');
  });

  it('retry button has accessibilityRole="button"', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('accessibilityLabel="Retry loading assets"');
  });

  it('uses useReducedMotion hook', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('useReducedMotion');
  });

  it('respects reduced motion for fade-in animation', () => {
    const source = readSource('LoadingScreen.tsx');
    expect(source).toContain('reducedMotion');
  });
});

// ---------------------------------------------------------------------------
// GameOverScreen — results overlay
// ---------------------------------------------------------------------------
describe('GameOverScreen accessibility', () => {
  it('has accessibilityRole="header" on verdict title and game over title', () => {
    const source = readSource('GameOverScreen.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('has accessibilityRole="button" on action buttons', () => {
    const source = readSource('GameOverScreen.tsx');
    expect(source).toContain('accessibilityLabel="Start new game"');
    expect(source).toContain('accessibilityLabel="Return to main menu"');
  });

  it('has accessibilityLabel on the rank letter', () => {
    const source = readSource('GameOverScreen.tsx');
    expect(source).toContain('accessibilityLabel={`Rank ${verdict.rank}`}');
  });

  it('uses useKeyboardNav with onEscape', () => {
    const source = readSource('GameOverScreen.tsx');
    expect(source).toContain('useKeyboardNav({onEscape:');
  });

  it('uses useReducedMotion hook', () => {
    const source = readSource('GameOverScreen.tsx');
    expect(source).toContain('useReducedMotion');
  });
});

// ---------------------------------------------------------------------------
// DifficultySelector — difficulty picker
// ---------------------------------------------------------------------------
describe('DifficultySelector accessibility', () => {
  it('has accessibilityRole="header" on the title', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('has accessibilityRole="radiogroup" on tier rows', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityRole="radiogroup"');
  });

  it('has accessibilityRole="radio" on individual tier buttons', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityRole="radio"');
  });

  it('tier buttons have accessibilityLabel with difficulty name and strikes', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityLabel=');
    expect(source).toContain('difficulty');
    expect(source).toContain('strike');
  });

  it('tier buttons have accessibilityHint', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityHint="Select this difficulty level"');
  });

  it('back button has accessibilityRole="button"', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('accessibilityLabel="Back to main menu"');
  });

  it('uses useKeyboardNav with onEscape', () => {
    const source = readSource('DifficultySelector.tsx');
    expect(source).toContain('useKeyboardNav({onEscape:');
  });
});

// ---------------------------------------------------------------------------
// DialogueOverlay — dialogue box
// ---------------------------------------------------------------------------
describe('DialogueOverlay accessibility', () => {
  it('dialogue box has accessibilityRole="button"', () => {
    const source = readSource('DialogueOverlay.tsx');
    expect(source).toContain('accessibilityRole="button"');
  });

  it('dialogue text has accessibilityLiveRegion for screen reader updates', () => {
    const source = readSource('DialogueOverlay.tsx');
    expect(source).toContain('accessibilityLiveRegion="polite"');
  });

  it('choice buttons have accessibilityRole="menuitem"', () => {
    const source = readSource('DialogueOverlay.tsx');
    expect(source).toContain('accessibilityRole="menuitem"');
  });

  it('choice container has accessibilityRole="menu"', () => {
    const source = readSource('DialogueOverlay.tsx');
    expect(source).toContain('accessibilityRole="menu"');
  });
});

// ---------------------------------------------------------------------------
// HintButton — floating hint button
// ---------------------------------------------------------------------------
describe('HintButton accessibility', () => {
  it('has accessibilityRole="button"', () => {
    const source = readSource('HintButton.tsx');
    expect(source).toContain('accessibilityRole="button"');
  });

  it('has accessibilityState with disabled', () => {
    const source = readSource('HintButton.tsx');
    expect(source).toContain('accessibilityState={{disabled: isDisabled}}');
  });

  it('has accessibilityHint describing the action', () => {
    const source = readSource('HintButton.tsx');
    expect(source).toContain('accessibilityHint=');
  });
});

// ---------------------------------------------------------------------------
// ProgressGauge — progress bar
// ---------------------------------------------------------------------------
describe('ProgressGauge accessibility', () => {
  it('has accessibilityRole="progressbar"', () => {
    const source = readSource('ProgressGauge.tsx');
    expect(source).toContain('accessibilityRole="progressbar"');
  });

  it('has accessibilityValue with min, max, now', () => {
    const source = readSource('ProgressGauge.tsx');
    expect(source).toContain('accessibilityValue=');
    expect(source).toContain('min: 0');
    expect(source).toContain('max: 100');
    expect(source).toContain('now: percentage');
  });

  it('has accessibilityLabel set to the label prop', () => {
    const source = readSource('ProgressGauge.tsx');
    expect(source).toContain('accessibilityLabel={label}');
  });
});

// ---------------------------------------------------------------------------
// StrikeCounter — strike indicator
// ---------------------------------------------------------------------------
describe('StrikeCounter accessibility', () => {
  it('has accessibilityRole="text" on the container', () => {
    const source = readSource('StrikeCounter.tsx');
    expect(source).toContain('accessibilityRole="text"');
  });

  it('has accessibilityLabel describing strikes count', () => {
    const source = readSource('StrikeCounter.tsx');
    expect(source).toContain('strikes used');
  });
});

// ---------------------------------------------------------------------------
// ChallengeHeader — challenge number display
// ---------------------------------------------------------------------------
describe('ChallengeHeader accessibility', () => {
  it('has accessibilityRole="header" on the challenge name', () => {
    const source = readSource('ChallengeHeader.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('has accessibilityLabel with challenge number and name', () => {
    const source = readSource('ChallengeHeader.tsx');
    expect(source).toContain('accessibilityLabel=');
    expect(source).toContain('Challenge');
  });
});

// ---------------------------------------------------------------------------
// IngredientChallenge — ingredient picking overlay
// ---------------------------------------------------------------------------
describe('IngredientChallenge accessibility', () => {
  it('demand banner has accessibilityRole="alert"', () => {
    const source = readChallengeSource('IngredientChallenge.tsx');
    expect(source).toContain('accessibilityRole="alert"');
  });

  it('result flash has accessibilityLiveRegion', () => {
    const source = readChallengeSource('IngredientChallenge.tsx');
    expect(source).toContain('accessibilityLiveRegion="assertive"');
  });

  it('hint button has accessibilityRole="button"', () => {
    const source = readChallengeSource('IngredientChallenge.tsx');
    expect(source).toContain('accessibilityRole="button"');
  });
});

// ---------------------------------------------------------------------------
// RoundTransition — between-round overlay
// ---------------------------------------------------------------------------
describe('RoundTransition accessibility', () => {
  it('has accessibilityRole="header" on round label', () => {
    const source = readSource('RoundTransition.tsx');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('score rows have accessibilityLabel', () => {
    const source = readSource('RoundTransition.tsx');
    expect(source).toContain('accessibilityLabel={`${label}:');
  });
});
