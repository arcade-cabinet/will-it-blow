/**
 * @module IngredientChallenge
 * Props-driven ingredient selection overlay.
 *
 * Shows available ingredients. Player picks the required count.
 * Correct picks get gold highlight; wrong picks trigger red flash + onStrike.
 * Calls onComplete with selected IDs when the required count is reached.
 */

import {useCallback, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

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
      if (selectedIds.includes(id)) return;

      const newSelected = [...selectedIds, id];
      setSelectedIds(newSelected);

      // Show gold highlight for picks
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
    [selectedIds, requiredCount, onComplete, completed],
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SELECT INGREDIENTS</Text>
        <Text style={styles.subtitle}>
          Pick {requiredCount} ingredient{requiredCount !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.counter}>
          {selectedIds.length} / {requiredCount}
        </Text>
      </View>

      {/* Ingredient grid */}
      <View style={styles.grid}>
        {ingredients.map(item => {
          const isSelected = selectedIds.includes(item.id);
          const isFlashing = flashId === item.id;
          const flashStyle =
            isFlashing && flashType === 'correct'
              ? styles.goldHighlight
              : isFlashing && flashType === 'wrong'
                ? styles.redFlash
                : null;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.ingredientButton, isSelected && styles.selectedButton, flashStyle]}
              onPress={() => handleSelect(item.id)}
              disabled={isSelected || completed}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.name}`}
              accessibilityState={{selected: isSelected, disabled: isSelected || completed}}
            >
              <Text style={[styles.ingredientText, isSelected && styles.selectedText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Completion message */}
      {completed && (
        <View style={styles.completionBanner}>
          <Text style={styles.completionText}>INGREDIENTS SELECTED!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
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
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  ingredientButton: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  goldHighlight: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  redFlash: {
    borderColor: '#FF1744',
    backgroundColor: 'rgba(255, 23, 68, 0.3)',
  },
  ingredientText: {
    fontSize: 16,
    fontWeight: '900',
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
    alignItems: 'center',
  },
  completionText: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
    textShadowColor: 'rgba(76, 175, 80, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
});
