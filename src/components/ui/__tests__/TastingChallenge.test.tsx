import {vi} from 'vitest';
import renderer, {act} from 'react-test-renderer';
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
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('starts with FORM score visible', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('FORM');
    expect(json).toContain('85');
  });

  it('reveals INGREDIENTS after advancing time', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
    // Advance past first phase (form -> ingredients)
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('INGREDIENTS');
    expect(json).toContain('90');
  });

  it('reveals COOK score after more time', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // form -> ingredients
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // ingredients -> cook
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('COOK');
    expect(json).toContain('78');
  });

  it('reveals DEMAND bonus in total phase', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // form -> ingredients
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // ingredients -> cook
    act(() => {
      vi.advanceTimersByTime(1600);
    }); // cook -> total
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('DEMAND');
    expect(json).toContain('TOTAL');
  });

  it('reveals rank badge', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TastingChallenge {...defaultProps} />);
    });
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
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('A');
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
    act(() => {
      renderer.create(<TastingChallenge {...defaultProps} onComplete={onComplete} />);
    });
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
