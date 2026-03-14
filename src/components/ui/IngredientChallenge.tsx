/**
 * @module IngredientChallenge
 * Props-driven ingredient selection overlay.
 *
 * Shows available ingredients. Player picks the required count.
 * Correct picks get gold highlight; wrong picks trigger red flash + onStrike.
 * Calls onComplete with selected IDs when the required count is reached.
 *
 * Rewritten from react-native to web HTML/CSS.
 */

import {useCallback, useState} from 'react';

interface IngredientItem {
  id: string;
  name: string;
}

interface IngredientChallengeProps {
  /** Available ingredients to choose from */
  ingredients: IngredientItem[];
  /** Number of ingredients required */
  requiredCount: number;
  /** Called with selected ingredient IDs when the required count is reached */
  onComplete: (selectedIds: string[]) => void;
  /** Called when a wrong pick is made */
  onStrike: () => void;
}

export function IngredientChallenge({
  ingredients,
  requiredCount,
  onComplete,
  onStrike,
}: IngredientChallengeProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [flashType, setFlashType] = useState<'correct' | 'wrong' | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleSelect = useCallback(
    (id: string) => {
      if (completed) return;
      if (selectedIds.includes(id)) {
        setFlashType('wrong');
        setFlashId(id);
        onStrike();
        setTimeout(() => {
          setFlashId(null);
          setFlashType(null);
        }, 600);
        return;
      }

      const newSelected = [...selectedIds, id];
      setSelectedIds(newSelected);

      setFlashType('correct');
      setFlashId(id);
      setTimeout(() => {
        setFlashId(null);
        setFlashType(null);
      }, 600);

      if (newSelected.length >= requiredCount) {
        setCompleted(true);
        onComplete(newSelected);
      }
    },
    [selectedIds, requiredCount, onComplete, onStrike, completed],
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>SELECT INGREDIENTS</div>
        <div style={styles.subtitle}>
          Pick {requiredCount} ingredient{requiredCount !== 1 ? 's' : ''}
        </div>
        <div style={styles.counter}>
          {selectedIds.length} / {requiredCount}
        </div>
      </div>

      {/* Ingredient grid */}
      <div style={styles.grid}>
        {ingredients.map(item => {
          const isSelected = selectedIds.includes(item.id);
          const isFlashing = flashId === item.id;
          const flashStyle =
            isFlashing && flashType === 'correct'
              ? styles.goldHighlight
              : isFlashing && flashType === 'wrong'
                ? styles.redFlash
                : {};

          return (
            <button
              type="button"
              key={item.id}
              style={{
                ...styles.ingredientButton,
                ...(isSelected ? styles.selectedButton : {}),
                ...flashStyle,
              }}
              onClick={() => handleSelect(item.id)}
              disabled={isSelected || completed}
              aria-label={`Select ${item.name}`}
              aria-pressed={isSelected}
            >
              <span style={{...styles.ingredientText, ...(isSelected ? styles.selectedText : {})}}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Completion message */}
      {completed && (
        <div style={styles.completionBanner}>
          <span style={styles.completionText}>INGREDIENTS SELECTED!</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    padding: 16,
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textShadow: '0 0 12px rgba(255, 23, 68, 0.6)',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 2,
    marginTop: 8,
  },
  counter: {
    fontSize: 22,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    marginTop: 8,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    padding: '0 8px',
  },
  ingredientButton: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    border: '2px solid #444',
    borderRadius: 10,
    padding: '12px 20px',
    minWidth: 120,
    textAlign: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background-color 200ms, border-color 200ms, box-shadow 200ms',
  },
  selectedButton: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  goldHighlight: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    boxShadow: '0 0 12px rgba(255, 215, 0, 0.8)',
  },
  redFlash: {
    borderColor: '#FF1744',
    backgroundColor: 'rgba(255, 23, 68, 0.3)',
  },
  ingredientText: {
    fontSize: 16,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 1,
  },
  selectedText: {
    color: '#FFD700',
  },
  completionBanner: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: 24,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
    textShadow: '0 0 12px rgba(76, 175, 80, 0.6)',
  },
};
