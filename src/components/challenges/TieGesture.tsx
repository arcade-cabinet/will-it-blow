/**
 * @module TieGesture
 * Web-compatible tie gesture overlay for the TIE_CASING phase.
 *
 * Player taps each end of the sausage to tie a knot. Both ends must be tied
 * to complete the challenge. Uses CSS animations instead of react-native Animated.
 */

import {useCallback, useEffect, useState} from 'react';
import {useGameStore} from '../../ecs/hooks';
import {requestHandGesture} from '../camera/handGestureStore';

export function TieGesture({onComplete}: {onComplete: () => void}) {
  const setCasingTied = useGameStore(s => s.setCasingTied);

  const [leftTied, setLeftTied] = useState(false);
  const [rightTied, setRightTied] = useState(false);
  const [leftAnimating, setLeftAnimating] = useState(false);
  const [rightAnimating, setRightAnimating] = useState(false);

  const handleLeftTie = useCallback(() => {
    if (leftTied || leftAnimating) return;
    // Left tie = left hand pinch-tap.
    requestHandGesture('tap_left');
    setLeftAnimating(true);
    setTimeout(() => {
      setLeftTied(true);
      setLeftAnimating(false);
    }, 300);
  }, [leftTied, leftAnimating]);

  const handleRightTie = useCallback(() => {
    if (rightTied || rightAnimating) return;
    // Right tie = right hand pinch-tap.
    requestHandGesture('tap_right');
    setRightAnimating(true);
    setTimeout(() => {
      setRightTied(true);
      setRightAnimating(false);
    }, 300);
  }, [rightTied, rightAnimating]);

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
    <div style={styles.container}>
      {/* Instruction Banner */}
      <div style={styles.instructionBanner}>
        <div style={styles.instructionText}>TIE THE CASING</div>
        <div style={styles.subText}>Tap each end to tie a knot</div>
      </div>

      {/* Sausage Row */}
      <div style={styles.sausageRow}>
        <button
          type="button"
          data-testid="tie-left"
          style={{
            ...styles.tiePointWrapper,
            cursor: leftTied ? 'default' : 'pointer',
          }}
          onClick={handleLeftTie}
          disabled={leftTied}
        >
          <div
            style={{
              ...styles.tiePoint,
              ...(leftTied ? styles.tiePointTied : {}),
              transform: leftAnimating ? 'scale(1.3)' : leftTied ? 'scale(0.55)' : 'scale(1)',
              transition: 'transform 200ms ease-out, background-color 200ms, border-color 200ms',
            }}
          >
            <span style={styles.tiePointLabel}>{leftTied ? 'X' : 'TIE'}</span>
          </div>
        </button>

        <div style={styles.casingBody}>
          {(leftTied || rightTied) && (
            <div
              style={{
                ...styles.knotIndicator,
                ...(leftTied && !rightTied ? styles.knotLeft : {}),
                ...(rightTied && !leftTied ? styles.knotRight : {}),
              }}
            />
          )}
        </div>

        <button
          type="button"
          data-testid="tie-right"
          style={{
            ...styles.tiePointWrapper,
            cursor: rightTied ? 'default' : 'pointer',
          }}
          onClick={handleRightTie}
          disabled={rightTied}
        >
          <div
            style={{
              ...styles.tiePoint,
              ...(rightTied ? styles.tiePointTied : {}),
              transform: rightAnimating ? 'scale(1.3)' : rightTied ? 'scale(0.55)' : 'scale(1)',
              transition: 'transform 200ms ease-out, background-color 200ms, border-color 200ms',
            }}
          >
            <span style={styles.tiePointLabel}>{rightTied ? 'X' : 'TIE'}</span>
          </div>
        </button>
      </div>

      {/* Status */}
      {bothTied ? (
        <div style={styles.completeBanner}>
          <span style={styles.completeText}>CASING SECURED</span>
        </div>
      ) : (
        <div style={styles.statusRow}>
          <span style={{...styles.statusDot, ...(leftTied ? styles.statusDotDone : {})}}>
            {leftTied ? '\u2713' : '\u25CB'} LEFT
          </span>
          <span style={{...styles.statusDot, ...(rightTied ? styles.statusDotDone : {})}}>
            {rightTied ? '\u2713' : '\u25CB'} RIGHT
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    pointerEvents: 'none',
  },
  instructionBanner: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    border: '2px solid #FFC832',
    borderRadius: 12,
    padding: '10px 24px',
    marginBottom: 32,
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  instructionText: {
    fontSize: 28,
    fontWeight: 900,
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
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    pointerEvents: 'auto',
  },
  tiePointWrapper: {
    padding: 8,
    background: 'none',
    border: 'none',
    outline: 'none',
  },
  tiePoint: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 200, 50, 0.15)',
    border: '3px solid #FFC832',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiePointTied: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: '#4CAF50',
  },
  tiePointLabel: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFC832',
    letterSpacing: 2,
  },
  casingBody: {
    width: 140,
    height: 36,
    backgroundColor: 'rgba(200, 120, 100, 0.5)',
    borderRadius: 18,
    margin: '0 8px',
    border: '2px solid rgba(200, 120, 100, 0.8)',
    display: 'flex',
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
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    pointerEvents: 'auto',
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
    border: '2px solid #4CAF50',
    borderRadius: 10,
    padding: '8px 24px',
    pointerEvents: 'auto',
  },
  completeText: {
    fontSize: 22,
    fontWeight: 900,
    color: '#4CAF50',
    letterSpacing: 4,
  },
};
