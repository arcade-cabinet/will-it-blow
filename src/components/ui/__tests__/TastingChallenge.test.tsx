import {vi} from 'vitest';
import {render, act} from '@testing-library/react';
import {TastingChallenge} from '../TastingChallenge';

const defaultProps = {
  scores: {form: 85, ingredients: 90, cook: 78},
  demandBonus: 5,
  rank: 'A' as string,
  onComplete: vi.fn(),
};

describe('TastingChallenge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('starts with FORM score visible', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    const text = container.textContent!;
    expect(text).toContain('FORM');
    expect(text).toContain('85');
  });

  it('reveals INGREDIENTS after advancing time', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    const text = container.textContent!;
    expect(text).toContain('INGREDIENTS');
    expect(text).toContain('90');
  });

  it('reveals COOK score after more time', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // form -> ingredients
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // ingredients -> cook
    const text = container.textContent!;
    expect(text).toContain('COOK');
    expect(text).toContain('78');
  });

  it('reveals DEMAND bonus in total phase', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // form -> ingredients
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // ingredients -> cook
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // cook -> total
    const text = container.textContent!;
    expect(text).toContain('DEMAND');
    expect(text).toContain('TOTAL');
  });

  it('reveals rank badge', () => {
    const {container} = render(<TastingChallenge {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // form -> ingredients
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // ingredients -> cook
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // cook -> total
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // total -> rank
    expect(container.textContent).toContain('A');
  });

  it('uses rank-specific colors', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../TastingChallenge.tsx'),
      'utf8',
    );
    // S=Gold, A=Silver, B=Bronze, F=Blood Red
    expect(source).toContain('#FFD700');
    expect(source).toContain('#C0C0C0');
    expect(source).toContain('#CD7F32');
    expect(source).toContain('#FF1744');
  });

  it('calls onComplete at the end', () => {
    const onComplete = vi.fn();
    render(<TastingChallenge {...defaultProps} onComplete={onComplete} />);
    // Advance through all 6 phases: form, ingredients, cook, total, rank, done
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1600);
      });
    }
    expect(onComplete).toHaveBeenCalled();
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../TastingChallenge.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
