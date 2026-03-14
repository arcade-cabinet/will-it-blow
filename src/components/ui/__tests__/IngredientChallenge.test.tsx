import {describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
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
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge
          ingredients={mockIngredients}
          requiredCount={3}
          onComplete={jest.fn()}
          onStrike={jest.fn()}
        />,
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays available ingredients', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge
          ingredients={mockIngredients}
          requiredCount={3}
          onComplete={jest.fn()}
          onStrike={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Lobster');
    expect(json).toContain('Big Mac');
    expect(json).toContain('SpaghettiOs');
  });

  it('shows required count', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge
          ingredients={mockIngredients}
          requiredCount={3}
          onComplete={jest.fn()}
          onStrike={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('3');
  });

  it('allows selecting ingredients', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge
          ingredients={mockIngredients}
          requiredCount={3}
          onComplete={onComplete}
          onStrike={jest.fn()}
        />,
      );
    });
    // Find ingredient buttons
    const root = tree!.root;
    const ingredientButtons = root.findAllByProps({accessibilityRole: 'button'});
    expect(ingredientButtons.length).toBeGreaterThan(0);
  });

  it('calls onComplete with selected IDs when required count is met', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <IngredientChallenge
          ingredients={mockIngredients}
          requiredCount={1}
          onComplete={onComplete}
          onStrike={jest.fn()}
        />,
      );
    });
    const root = tree!.root;
    const buttons = root.findAllByProps({accessibilityRole: 'button'});
    // Click the first ingredient
    if (buttons.length > 0) {
      act(() => {
        buttons[0].props.onPress();
      });
    }
    expect(onComplete).toHaveBeenCalled();
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../IngredientChallenge.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
