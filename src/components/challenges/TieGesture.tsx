import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

export function TieGesture({onComplete}: {onComplete: () => void}) {
  const setCasingTied = useGameStore(s => s.setCasingTied);

  const [leftTied, setLeftTied] = useState(false);
  const [rightTied, setRightTied] = useState(false);

  const leftScaleRef = useRef(new Animated.Value(1));
  const rightScaleRef = useRef(new Animated.Value(1));

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

  useEffect(() => {
    if (!leftTied || !rightTied) return;
    setCasingTied(true);
    const timeout = setTimeout(() => {
      onComplete();
    }, 600);
    return () => clearTimeout(timeout);
  }, [leftTied, rightTied, setCasingTied, onComplete]);

  const bothTied = leftTied && rightTied;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>TIE THE CASING</Text>
        <Text style={styles.subText}>Tap each end to tie a knot</Text>
      </View>

      <View style={styles.sausageRow}>
        <TouchableOpacity
          testID="tie-left"
          style={styles.tiePointWrapper}
          onPress={handleLeftTie}
          activeOpacity={0.7}
          disabled={leftTied}
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

        <TouchableOpacity
          testID="tie-right"
          style={styles.tiePointWrapper}
          onPress={handleRightTie}
          activeOpacity={0.7}
          disabled={rightTied}
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
    color: '#FFC832',
    letterSpacing: 4,
  },
  subText: {
    fontSize: 14,
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
    color: '#4CAF50',
    letterSpacing: 4,
  },
});
