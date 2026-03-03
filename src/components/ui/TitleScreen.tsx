/**
 * @module TitleScreen
 * Main menu screen styled as a hanging butcher shop sign.
 *
 * Displays the game title with a swinging sign animation, three procedural
 * sausage-shaped buttons (New Game, Load, Settings), and a footer. The sign
 * subtly sways on a looped Animated timing sequence.
 *
 * Buttons are pure React Native components (no PNGs) — pill-shaped sausage
 * bodies with googly eyes, a tiny mouth, and Bangers font labels. Hover/press
 * state swaps to darker body tones.
 *
 * - **New Game**: Transitions to the loading phase (resets all state).
 * - **Load**: Restores saved progress via `continueGame()` then loads.
 *   Disabled (dimmed) when no save data exists.
 * - **Settings**: Opens SettingsScreen in-place.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useKeyboardNav} from '../../hooks/useKeyboardNav';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useGameStore} from '../../store/gameStore';
import {DifficultySelector} from './DifficultySelector';
import {SausageButton} from './SausageButton';
import {SettingsScreen} from './SettingsScreen';

export function TitleScreen() {
  const setAppPhase = useGameStore(s => s.setAppPhase);
  const continueGame = useGameStore(s => s.continueGame);
  const startNewGame = useGameStore(s => s.startNewGame);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeScores = useGameStore(s => s.challengeScores);
  const currentRound = useGameStore(s => s.currentRound);
  const hasSaveData = challengeScores.length > 0 && currentChallenge < 5;
  const [showSettings, setShowSettings] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const reducedMotion = useReducedMotion();

  // Keyboard navigation — no Escape handler on the main menu
  useKeyboardNav();

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Sign swing animation
  const swingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle sign sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue: -1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, slideAnim, swingAnim, reducedMotion]);

  const rotate = swingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  const handleMenuPress = (index: number) => {
    if (index === 0) {
      setShowDifficulty(true);
    } else if (index === 1 && hasSaveData) {
      // Restore saved progress before entering loading phase.
      // LoadingScreen only handles asset preloading — it doesn't touch game state.
      continueGame();
      setAppPhase('loading');
    }
    // index === 2 (quit/settings) is handled inline via setShowSettings
  };

  const handleDifficultySelect = useCallback(
    (tierId: string) => {
      setDifficulty(tierId);
      startNewGame();
      setAppPhase('loading');
    },
    [setDifficulty, startNewGame, setAppPhase],
  );
  const handleDifficultyBack = useCallback(() => setShowDifficulty(false), []);
  const handleSettingsBack = useCallback(() => setShowSettings(false), []);

  if (showDifficulty) {
    return <DifficultySelector onSelect={handleDifficultySelect} onBack={handleDifficultyBack} />;
  }

  if (showSettings) {
    return <SettingsScreen onBack={handleSettingsBack} />;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Will It Blow main menu"
    >
      {/* Butcher shop sign */}
      <Animated.View style={[styles.sign, reducedMotion ? undefined : {transform: [{rotate}]}]}>
        {/* Hanging chains */}
        <View style={styles.chainRow}>
          <View style={styles.chain} />
          <View style={styles.chain} />
        </View>

        <View style={styles.signBoard}>
          {/* Outer border */}
          <View style={styles.signInner}>
            <Text style={styles.established} accessibilityRole="text">
              Est. 1974
            </Text>
            <Text style={styles.title} accessibilityRole="header">
              WILL IT{'\n'}BLOW?
            </Text>
            <View style={styles.divider} />
            <Text style={styles.tagline} accessibilityRole="text">
              Fine Meats & Sausages
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Menu buttons — procedural sausage-shaped RN components */}
      <View style={styles.menuContainer} accessibilityRole="menu">
        <SausageButton label="NEW GAME" onPress={() => handleMenuPress(0)} />
        <View style={styles.loadButtonGroup}>
          <SausageButton label="LOAD" onPress={() => handleMenuPress(1)} disabled={!hasSaveData} />
          {hasSaveData && (
            <Text
              style={styles.roundSubtitle}
              accessibilityLabel={`Last played round ${currentRound}`}
            >
              Last played: Round {currentRound}
            </Text>
          )}
        </View>
        <SausageButton label="SETTINGS" onPress={() => setShowSettings(true)} />
      </View>

      {/* Footer */}
      <Text style={styles.footer} accessibilityRole="text">
        Mr. Sausage's Fine Meats & Sausages
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sign: {
    alignItems: 'center',
    marginBottom: 48,
  },
  chainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: -2,
  },
  chain: {
    width: 3,
    height: 24,
    backgroundColor: '#555',
    borderRadius: 1,
  },
  signBoard: {
    backgroundColor: '#1a0a00',
    borderWidth: 4,
    borderColor: '#8B4513',
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  signInner: {
    borderWidth: 2,
    borderColor: '#D2A24C',
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  established: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: '#D2A24C',
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Bangers',
    fontSize: 48,
    color: '#FF1744',
    textAlign: 'center',
    lineHeight: 52,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 23, 68, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
  divider: {
    width: 120,
    height: 2,
    backgroundColor: '#D2A24C',
    marginVertical: 12,
  },
  tagline: {
    fontFamily: 'Bangers',
    fontSize: 16,
    color: '#D2A24C',
    letterSpacing: 3,
  },
  menuContainer: {
    alignItems: 'center',
  },
  loadButtonGroup: {
    alignItems: 'center',
  },
  roundSubtitle: {
    fontFamily: 'Bangers',
    fontSize: 13,
    color: '#8a6a3a',
    letterSpacing: 2,
    marginTop: -4,
    marginBottom: 4,
  },
  footer: {
    fontFamily: 'Bangers',
    fontSize: 12,
    color: '#3a3a3a',
    letterSpacing: 3,
    marginTop: 48,
    textAlign: 'center',
  },
});
