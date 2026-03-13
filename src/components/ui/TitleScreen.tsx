import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {DIFFICULTY_TIERS} from '../../engine/DifficultyConfig';
import {useGameStore} from '../../store/gameStore';
import {DifficultySelector} from './DifficultySelector';

export function TitleScreen() {
  const setAppPhase = useGameStore(s => s.setAppPhase);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const [showDifficulty, setShowDifficulty] = useState(false);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Sign swing animation
  const swingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [fadeAnim, slideAnim, swingAnim]);

  const rotate = swingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  const handleStart = () => {
    setShowDifficulty(true);
  };

  const handleDifficultySelect = (tierId: string) => {
    const tier = DIFFICULTY_TIERS.find(t => t.id === tierId) || DIFFICULTY_TIERS[2];
    setDifficulty(
      tierId,
      tier.id === 'rare' || tier.id === 'medium-rare' ? 3 : tier.id === 'well-done' ? 10 : 5,
    );
    setAppPhase('playing');
  };

  if (showDifficulty) {
    return (
      <DifficultySelector
        onSelect={handleDifficultySelect}
        onBack={() => setShowDifficulty(false)}
      />
    );
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
    >
      {/* Butcher shop sign */}
      <Animated.View style={[styles.sign, {transform: [{rotate}]}]}>
        {/* Hanging chains */}
        <View style={styles.chainRow}>
          <View style={styles.chain} />
          <View style={styles.chain} />
        </View>

        <View style={styles.signBoard}>
          {/* Outer border */}
          <View style={styles.signInner}>
            <Text style={styles.established}>Est. 1974</Text>
            <Text style={styles.title}>WILL IT{'\n'}BLOW?</Text>
            <View style={styles.divider} />
            <Text style={styles.tagline}>Fine Meats & Sausages</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.button} onPress={handleStart} activeOpacity={0.8}>
          <Text style={styles.buttonText}>START COOKING</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Mr. Sausage's Fine Meats & Sausages</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
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
    fontSize: 14,
    color: '#D2A24C',
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
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
    fontSize: 16,
    color: '#D2A24C',
    letterSpacing: 3,
  },
  menuContainer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#D2A24C',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#8B4513',
  },
  buttonText: {
    color: '#1a0a00',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    fontSize: 12,
    color: '#3a3a3a',
    letterSpacing: 3,
    marginTop: 48,
    textAlign: 'center',
  },
});
