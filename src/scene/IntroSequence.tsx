/**
 * @module IntroSequence
 * Eyelid blink/wake-up animation — pure React Native overlays.
 *
 * Ported from R3F IntroSequence (119 lines):
 * - Phase 0 (0-2s): Eyes closed (full black), player prone
 * - Phase 1 (2-7s): Blink sequence — peek, close, peek, close, open
 * - Phase 2 (7s+): Eyes fully open, intro complete
 *
 * Two black <View> elements cover top and bottom halves of screen,
 * animated apart to simulate eyelids opening. Blur effect via
 * opacity changes on a dark overlay.
 *
 * This runs OVER the FilamentView — pure RN animation, no 3D.
 */

import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useGameStore} from '../ecs/hooks';

export function IntroSequence() {
  const setIntroActive = useGameStore(s => s.setIntroActive);
  const setIntroPhase = useGameStore(s => s.setIntroPhase);
  const setPosture = useGameStore(s => s.setPosture);
  const introActive = useGameStore(s => s.introActive);

  // Eyelid positions (0 = closed, 1 = fully open)
  const openness = useRef(new Animated.Value(0)).current;
  // Blur overlay opacity (1 = full blur, 0 = clear)
  const blurOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!introActive) return;

    // Phase 0: Eyes closed (0-2s)
    const phase0 = Animated.delay(2000);

    // Phase 1: Blink sequence (2-7s)
    const blink1 = Animated.sequence([
      // First peek
      Animated.timing(openness, {toValue: 0.3, duration: 800, useNativeDriver: false}),
      Animated.timing(openness, {toValue: 0, duration: 400, useNativeDriver: false}),
      Animated.delay(300),
      // Second peek (wider)
      Animated.timing(openness, {toValue: 0.6, duration: 1000, useNativeDriver: false}),
      Animated.timing(blurOpacity, {toValue: 0.5, duration: 500, useNativeDriver: false}),
      Animated.timing(openness, {toValue: 0, duration: 500, useNativeDriver: false}),
      Animated.delay(200),
      // Full open
      Animated.parallel([
        Animated.timing(openness, {toValue: 1, duration: 1500, useNativeDriver: false}),
        Animated.timing(blurOpacity, {toValue: 0, duration: 1500, useNativeDriver: false}),
      ]),
    ]);

    // Run sequence
    Animated.sequence([phase0, blink1]).start(() => {
      // Phase 2: Intro complete
      setIntroPhase(2);
      setIntroActive(false);
      setPosture('standing');
    });

    // Set posture progression
    setTimeout(() => {
      setPosture('sitting');
      setIntroPhase(1);
    }, 3000);
  }, [introActive, openness, blurOpacity, setIntroActive, setIntroPhase, setPosture]);

  if (!introActive) return null;

  // Eyelid positions: 0 = covers 50% each, 1 = off screen
  const topLidHeight = openness.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '0%'],
  });
  const bottomLidHeight = openness.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '0%'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top eyelid */}
      <Animated.View style={[styles.lid, styles.topLid, {height: topLidHeight}]} />
      {/* Bottom eyelid */}
      <Animated.View style={[styles.lid, styles.bottomLid, {height: bottomLidHeight}]} />
      {/* Blur overlay */}
      <Animated.View style={[styles.blur, {opacity: blurOpacity}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  lid: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  topLid: {
    top: 0,
  },
  bottomLid: {
    bottom: 0,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
  },
});
