import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/gameStore';

interface HintButtonProps {
  onHint: () => void;
}

export function HintButton({ onHint }: HintButtonProps) {
  const { hintsRemaining, useHint } = useGameStore();
  const isDisabled = hintsRemaining <= 0;

  const handlePress = () => {
    if (isDisabled) return;
    useHint();
    onHint();
  };

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={handlePress}
      activeOpacity={isDisabled ? 1 : 0.7}
      disabled={isDisabled}
    >
      <Text style={styles.emoji}>💡</Text>
      <Text style={[styles.countText, isDisabled && styles.countDisabled]}>
        {hintsRemaining}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    borderWidth: 2,
    borderColor: '#FFC832',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    zIndex: 80,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 20,
  },
  countText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 1,
  },
  countDisabled: {
    color: '#666',
  },
});
