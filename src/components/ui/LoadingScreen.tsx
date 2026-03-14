/**
 * @module LoadingScreen
 * Horror-themed loading screen with progress bar during asset preload.
 *
 * Props-driven: receives progress (0-100) and onReady callback.
 * Dark background (#0a0a0a) with blood-red (#FF1744) progress fill.
 * Shows narrative messages that cycle based on progress:
 * "PREPARING THE KITCHEN...", "SHARPENING KNIVES...", "HEATING THE GRINDER...", "READY."
 *
 * When progress reaches 100, calls onReady after 500ms delay.
 */

import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

interface LoadingScreenProps {
  /** Loading progress 0-100 */
  progress: number;
  /** Called when loading is complete (after 500ms delay at 100%) */
  onReady: () => void;
}

const NARRATIVE_MESSAGES = [
  'PREPARING THE KITCHEN...',
  'SHARPENING KNIVES...',
  'HEATING THE GRINDER...',
  'READY.',
];

function getNarrativeMessage(progress: number): string {
  if (progress >= 100) return NARRATIVE_MESSAGES[3];
  if (progress >= 66) return NARRATIVE_MESSAGES[2];
  if (progress >= 33) return NARRATIVE_MESSAGES[1];
  return NARRATIVE_MESSAGES[0];
}

export function LoadingScreen({progress, onReady}: LoadingScreenProps) {
  const reducedMotion = false;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const onReadyCalledRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Call onReady after 500ms when progress reaches 100
  useEffect(() => {
    if (progress >= 100 && !onReadyCalledRef.current) {
      const timer = setTimeout(() => {
        onReadyCalledRef.current = true;
        onReady();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onReady]);

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const narrativeMessage = getNarrativeMessage(clampedProgress);

  return (
    <Animated.View
      style={[styles.container, {opacity: fadeAnim}]}
      accessibilityLabel={`Loading game assets, ${clampedProgress}% complete`}
    >
      {/* Narrative message */}
      <Text style={styles.narrativeText}>{narrativeMessage}</Text>

      {/* Progress bar */}
      <View
        style={styles.progressContainer}
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: clampedProgress}}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${clampedProgress}%`}]} />
        </View>
      </View>

      {/* Percentage */}
      <Text style={styles.percentText}>{clampedProgress}%</Text>
    </Animated.View>
  );
}

/**
 * LoadingScreen error variant -- shown when asset loading fails.
 * Kept as a named export for callers that handle error state externally.
 */
export function LoadingScreenError({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText} accessibilityRole="alert">
        {message}
      </Text>
      <View
        style={styles.retryButton}
        accessibilityRole="button"
        accessibilityLabel="Retry loading assets"
      >
        <Text style={styles.retryText} onPress={onRetry}>
          RETRY
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  narrativeText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#FF1744',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 32,
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  progressTrack: {
    height: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF1744',
    borderRadius: 8,
    shadowColor: '#FF1744',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  percentText: {
    fontFamily: 'Bangers',
    fontSize: 28,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
  errorText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#C2442D',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#C2442D',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 2,
  },
});
