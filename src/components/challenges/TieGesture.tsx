/**
 * @module TieGesture
 * 2D overlay that prompts the player to tie both ends of the sausage casing
 * before the blowout challenge begins.
 *
 * Both tie points are rendered as interactive spheres. Clicking/tapping
 * each one "constricts" it (scale animation) and spawns a knot indicator.
 * When both ends are tied, the component calls setCasingTied(true) and
 * recordFlairPoint for fast ties.
 *
 * Pattern: this is a bridge-style overlay (like IngredientChallenge), not
 * an ECS orchestrator. The tie interaction is pure 2D — no 3D station needed.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TieGestureProps {
  /** Called when both ends are tied and the overlay should be dismissed. */
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// TieGesture
// ---------------------------------------------------------------------------

/**
 * Overlay component for tying both ends of the sausage casing.
 * Renders two "tie point" buttons. Each must be pressed to proceed.
 * Fast ties earn a flair bonus.
 */
export function TieGesture({onComplete}: TieGestureProps) {
  const setCasingTied = useGameStore(s => s.setCasingTied);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  const [leftTied, setLeftTied] = useState(false);
  const [rightTied, setRightTied] = useState(false);

  const startTimeRef = useRef(Date.now());
  const leftScaleRef = useRef(new Animated.Value(1));
  const rightScaleRef = useRef(new Animated.Value(1));

  /** Animate a tie point constriction and mark it as tied. */
  const animateTie = useCallback((scaleAnim: Animated.Value, onDone: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.55,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);

  const handleLeftTie = useCallback(() => {
    if (leftTied) return;
    animateTie(leftScaleRef.current, () => setLeftTied(true));
  }, [leftTied, animateTie]);

  const handleRightTie = useCallback(() => {
    if (rightTied) return;
    animateTie(rightScaleRef.current, () => setRightTied(true));
  }, [rightTied, animateTie]);

  // When both ends are tied, check for fast-tie flair then complete
  useEffect(() => {
    if (!leftTied || !rightTied) return;

    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed < 2500) {
      recordFlairPoint('fast-tie', 5);
    }

    setCasingTied(true);

    const timeout = setTimeout(() => {
      onComplete();
    }, 600);

    return () => clearTimeout(timeout);
  }, [leftTied, rightTied, setCasingTied, recordFlairPoint, onComplete]);

  const bothTied = leftTied && rightTied;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Instruction banner */}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>TIE THE CASING</Text>
        <Text style={styles.subText}>Tap each end to tie a knot</Text>
      </View>

      {/* Sausage diagram with tie points */}
      <View style={styles.sausageRow}>
        {/* Left tie point */}
        <TouchableOpacity
          style={styles.tiePointWrapper}
          onPress={handleLeftTie}
          activeOpacity={0.7}
          disabled={leftTied}
          testID="tie-left"
        >
          <Animated.View
            style={[
              styles.tiePoint,
              leftTied && styles.tiePointTied,
              {transform: [{scale: leftScaleRef.current}]},
            ]}
          >
            <Text style={styles.tiePointLabel}>{leftTied ? 'X' : 'TIE'}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Casing body visual */}
        <View style={styles.casingBody}>
          {(leftTied || rightTied) && (
            <View
              style={[
                styles.knotIndicator,
                leftTied && styles.knotLeft,
                rightTied && styles.knotRight,
              ]}
            />
          )}
        </View>

        {/* Right tie point */}
        <TouchableOpacity
          style={styles.tiePointWrapper}
          onPress={handleRightTie}
          activeOpacity={0.7}
          disabled={rightTied}
          testID="tie-right"
        >
          <Animated.View
            style={[
              styles.tiePoint,
              rightTied && styles.tiePointTied,
              {transform: [{scale: rightScaleRef.current}]},
            ]}
          >
            <Text style={styles.tiePointLabel}>{rightTied ? 'X' : 'TIE'}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Status label */}
      {bothTied ? (
        <View style={styles.completeBanner}>
          <Text style={styles.completeText}>CASING SECURED</Text>
        </View>
      ) : (
        <View style={styles.statusRow}>
          <Text style={[styles.statusDot, leftTied && styles.statusDotDone]}>
            {leftTied ? '✓' : '○'} LEFT
          </Text>
          <Text style={[styles.statusDot, rightTied && styles.statusDotDone]}>
            {rightTied ? '✓' : '○'} RIGHT
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  instructionBanner: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#FFC832',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 4,
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#AAA',
    letterSpacing: 1,
    marginTop: 2,
  },
  sausageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  tiePointWrapper: {
    padding: 8,
  },
  tiePoint: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 200, 50, 0.15)',
    borderWidth: 3,
    borderColor: '#FFC832',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiePointTied: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: '#4CAF50',
  },
  tiePointLabel: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
  },
  casingBody: {
    width: 140,
    height: 36,
    backgroundColor: 'rgba(200, 120, 100, 0.5)',
    borderRadius: 18,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'rgba(200, 120, 100, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  knotIndicator: {
    width: 10,
    height: 28,
    backgroundColor: '#8B4513',
    borderRadius: 5,
  },
  knotLeft: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  knotRight: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statusDot: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#555',
    letterSpacing: 2,
  },
  statusDotDone: {
    color: '#4CAF50',
  },
  completeBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  completeText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
  },
});
