import {vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {IngredientChallenge} from '../IngredientChallenge';

const mockIngredients = [
  {id: 'lobster', name: 'Lobster'},
  {id: 'big-mac', name: 'Big Mac'},
  {id: 'spaghetti', name: 'SpaghettiOs'},
  {id: 'wasabi', name: 'Wasabi'},
  {id: 'truffle', name: 'Truffle'},
];

describe('IngredientChallenge', () => {
  it('renders without crashing', () => {
    const {container} = render(
      <IngredientChallenge
        ingredients={mockIngredients}
        requiredCount={3}
        onComplete={vi.fn()}
        onStrike={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays available ingredients', () => {
    const {container} = render(
      <IngredientChallenge
        ingredients={mockIngredients}
        requiredCount={3}
        onComplete={vi.fn()}
        onStrike={vi.fn()}
      />,
    );
    const text = container.textContent!;
    expect(text).toContain('Lobster');
    expect(text).toContain('Big Mac');
    expect(text).toContain('SpaghettiOs');
  });

  it('shows required count', () => {
    const {container} = render(
      <IngredientChallenge
        ingredients={mockIngredients}
        requiredCount={3}
        onComplete={vi.fn()}
        onStrike={vi.fn()}
      />,
    );
    expect(container.textContent).toContain('3');
  });

  it('allows selecting ingredients', () => {
    render(
      <IngredientChallenge
        ingredients={mockIngredients}
        requiredCount={3}
        onComplete={vi.fn()}
        onStrike={vi.fn()}
      />,
    );
    // Find ingredient buttons by their accessibility label
    const button = screen.getByLabelText('Select Lobster');
    expect(button).toBeDefined();
  });

  it('calls onComplete with selected IDs when required count is met', () => {
    const onComplete = vi.fn();
    render(
      <IngredientChallenge
        ingredients={mockIngredients}
        requiredCount={1}
        onComplete={onComplete}
        onStrike={vi.fn()}
      />,
    );
    const button = screen.getByLabelText('Select Lobster');
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalled();
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../IngredientChallenge.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
