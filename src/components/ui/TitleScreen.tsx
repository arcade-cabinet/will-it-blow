import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';

export function TitleScreen() {
  const { startNewGame, continueGame, currentChallenge, challengeScores } =
    useGameStore();
  const hasSaveData = challengeScores.length > 0;

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Title pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle title pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* Title */}
        <Animated.Text
          style={[styles.title, { transform: [{ scale: pulseAnim }] }]}
        >
          WILL IT BLOW?
        </Animated.Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>A Mr. Sausage Production</Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.newGameButton}
            onPress={startNewGame}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>NEW GAME</Text>
          </TouchableOpacity>

          {hasSaveData && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={continueGame}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                CONTINUE (Challenge {currentChallenge + 1}/5)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer text */}
        <Text style={styles.footerText}>Mr. Sausage is waiting...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#888',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  newGameButton: {
    backgroundColor: '#B71C1C',
    borderWidth: 2,
    borderColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: '#1B5E20',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    textAlign: 'center',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 36,
    letterSpacing: 1,
  },
});
