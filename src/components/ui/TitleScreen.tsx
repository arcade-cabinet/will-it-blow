/**
 * @module TitleScreen
 * Main menu screen styled as a hanging butcher shop sign.
 *
 * Displays the game title with a swinging sign animation, three PNG sprite
 * menu buttons (New Game, Load, Quit/Settings), and a footer. The sign subtly
 * sways on a looped Animated timing sequence.
 *
 * Each button shows Mr. Sausage holding a sign; hover/press state swaps to an
 * excited/alarmed sprite variant.
 *
 * - **New Game**: Transitions to the loading phase (resets all state).
 * - **Load**: Restores saved progress via `continueGame()` then loads.
 *   Disabled (dimmed) when no save data exists.
 * - **Quit**: Opens SettingsScreen in-place (replaces this component).
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {getAssetUrl} from '../../engine/assetUrl';
import {useGameStore} from '../../store/gameStore';
import {SettingsScreen} from './SettingsScreen';

/** A single PNG sprite button — swaps to hover variant on press/hover. */
function SausageButton({
  normalSource,
  hoverSource,
  onPress,
  disabled = false,
}: {
  normalSource: {uri: string};
  hoverSource: {uri: string};
  onPress: () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setHovered(true)}
      onPressOut={() => setHovered(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      style={{marginVertical: 8, opacity: disabled ? 0.5 : 1}}
    >
      <Image
        source={hovered ? hoverSource : normalSource}
        style={{width: 280, height: 92}}
        resizeMode="contain"
      />
    </Pressable>
  );
}

export function TitleScreen() {
  const {setAppPhase, continueGame, currentChallenge, challengeScores} = useGameStore();
  const hasSaveData = challengeScores.length > 0 && currentChallenge < 5;
  const [showSettings, setShowSettings] = useState(false);

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
    if (index === 0) {
      setAppPhase('loading');
    } else if (index === 1 && hasSaveData) {
      // Restore saved progress before entering loading phase.
      // LoadingScreen only handles asset preloading — it doesn't touch game state.
      continueGame();
      setAppPhase('loading');
    }
    // index === 2 (quit/settings) is handled inline via setShowSettings
  };

  const handleSettingsBack = useCallback(() => setShowSettings(false), []);

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

      {/* Menu buttons — PNG sprite sausage characters */}
      <View style={styles.menuContainer}>
        <SausageButton
          normalSource={{uri: getAssetUrl('ui', 'btn_newgame_normal.png')}}
          hoverSource={{uri: getAssetUrl('ui', 'btn_newgame_hover.png')}}
          onPress={() => handleMenuPress(0)}
        />
        <SausageButton
          normalSource={{uri: getAssetUrl('ui', 'btn_load_normal.png')}}
          hoverSource={{uri: getAssetUrl('ui', 'btn_load_hover.png')}}
          onPress={() => handleMenuPress(1)}
          disabled={!hasSaveData}
        />
        <SausageButton
          normalSource={{uri: getAssetUrl('ui', 'btn_quit_normal.png')}}
          hoverSource={{uri: getAssetUrl('ui', 'btn_quit_hover.png')}}
          onPress={() => setShowSettings(true)}
        />
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
    alignItems: 'center',
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
