import {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

const MENU_ITEMS = ['NEW GAME', 'CONTINUE', 'SETTINGS'] as const;

export function TitleScreen() {
  const {setAppPhase, continueGame, currentChallenge, challengeScores} = useGameStore();
  const hasSaveData = challengeScores.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const handleMenuPress = (index: number) => {
    setSelectedIndex(index);
    const item = MENU_ITEMS[index];
    if (item === 'NEW GAME') {
      setAppPhase('loading');
    } else if (item === 'CONTINUE' && hasSaveData) {
      // Restore saved progress before entering loading phase.
      // LoadingScreen only handles asset preloading — it doesn't touch game state.
      continueGame();
      setAppPhase('loading');
    }
    // SETTINGS: no-op for now
  };

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

      {/* Menu items */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => {
          const isDisabled = (item === 'CONTINUE' && !hasSaveData) || item === 'SETTINGS';
          const isSelected = selectedIndex === index;

          return (
            <TouchableOpacity
              key={item}
              style={styles.menuItem}
              onPress={() => handleMenuPress(index)}
              onPressIn={() => {
                if (!isDisabled) setSelectedIndex(index);
              }}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Text style={styles.marker}>{isSelected && !isDisabled ? '\u25B8 ' : '  '}</Text>
              <Text
                style={[
                  styles.menuText,
                  isDisabled && styles.menuTextDisabled,
                  isSelected && !isDisabled && styles.menuTextSelected,
                ]}
              >
                {item}
                {item === 'CONTINUE' && hasSaveData ? ` (${currentChallenge + 1}/5)` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Mr. Sausage's Fine Meats & Sausages</Text>
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
    width: '100%',
    maxWidth: 280,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  marker: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#FF1744',
    width: 28,
  },
  menuText: {
    fontFamily: 'Bangers',
    fontSize: 24,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
  menuTextDisabled: {
    color: '#444',
  },
  menuTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
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
