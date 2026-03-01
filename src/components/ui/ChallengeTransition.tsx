/**
 * @module ChallengeTransition
 * Full-screen cinematic overlay shown between challenges.
 *
 * Displays the challenge number, name (slide-up with fade), an animated
 * underline, and a Mr. Sausage quip with attribution. The 3-phase
 * animation sequence runs for TRANSITION_DURATION_MS (3 seconds):
 *
 * 1. **Fade in** (0-400ms): Overlay opacity + title slide-up
 * 2. **Details** (500-1000ms): Underline expands + quip fades in
 * 3. **Fade out** (2400-3000ms): Overlay fades to transparent, then calls onComplete
 *
 * Uses `pointerEvents="none"` so the 3D scene remains interactive
 * during the transition (camera can still be moved).
 *
 * @param props.challengeIndex - Zero-based index into CHALLENGE_ORDER
 * @param props.onComplete - Called when the fade-out animation finishes
 */

import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {CHALLENGE_ORDER, getChallengeConfig} from '../../engine/ChallengeRegistry';

/** Mr. Sausage quips that play during station transitions. */
const TRANSITION_QUIPS: Record<number, string> = {
  0: "Let's see what you're made of...",
  1: 'Time to grind. And I mean that literally.',
  2: "Stuff it. Carefully. Or it's YOUR casing next.",
  3: "Fire it up. Don't burn my kitchen.",
  4: 'Now I taste. And I judge.',
};

interface ChallengeTransitionProps {
  challengeIndex: number;
  onComplete: () => void;
}

const TRANSITION_DURATION_MS = 3000;

export function ChallengeTransition({challengeIndex, onComplete}: ChallengeTransitionProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const quipOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  const challengeId = CHALLENGE_ORDER[challengeIndex];
  const config = challengeId ? getChallengeConfig(challengeId) : null;
  const quip = TRANSITION_QUIPS[challengeIndex] ?? '';

  useEffect(() => {
    // Phase 1: Fade in overlay + title
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Underline + quip fade in
    const quipTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(lineWidth, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false, // width can't use native driver
        }),
        Animated.timing(quipOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // Phase 3: Fade out and complete
    const fadeTimer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, TRANSITION_DURATION_MS - 600);

    return () => {
      clearTimeout(quipTimer);
      clearTimeout(fadeTimer);
    };
  }, [overlayOpacity, titleOpacity, titleTranslateY, quipOpacity, lineWidth, onComplete]);

  if (!config) return null;

  return (
    <Animated.View style={[styles.container, {opacity: overlayOpacity}]} pointerEvents="none">
      <View style={styles.darkOverlay} />

      <View style={styles.content}>
        {/* Challenge number */}
        <Text style={styles.challengeNumber}>
          CHALLENGE {challengeIndex + 1}/{CHALLENGE_ORDER.length}
        </Text>

        {/* Challenge name */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{translateY: titleTranslateY}],
          }}
        >
          <Text style={styles.challengeName}>{config.name.toUpperCase()}</Text>
        </Animated.View>

        {/* Animated underline */}
        <Animated.View
          style={[
            styles.underline,
            {
              width: lineWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '60%'],
              }),
            },
          ]}
        />

        {/* Mr. Sausage quip */}
        <Animated.View style={{opacity: quipOpacity}}>
          <Text style={styles.quip}>"{quip}"</Text>
          <Text style={styles.quipAttribution}>— Mr. Sausage</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 0, 0.85)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  challengeNumber: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#666',
    letterSpacing: 4,
    marginBottom: 8,
  },
  challengeName: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 24,
  },
  underline: {
    height: 3,
    backgroundColor: '#FF1744',
    marginTop: 10,
    marginBottom: 24,
    opacity: 0.6,
  },
  quip: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 1,
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(255, 200, 50, 0.3)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  quipAttribution: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 6,
  },
});
