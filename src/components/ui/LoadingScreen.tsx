/**
 * @module LoadingScreen
 * Horror-themed loading screen with progress bar during asset preload.
 *
 * Props-driven: receives progress (0-100) and onReady callback.
 * Dark background (#0a0a0a) with blood-red (#FF1744) progress fill.
 * Shows narrative messages that cycle based on progress.
 *
 * Rewritten from react-native to web HTML/CSS with CSS transitions.
 */

import {useEffect, useRef, useState} from 'react';

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
  const [opacity, setOpacity] = useState(0);
  const onReadyCalledRef = useRef(false);

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setOpacity(1));
  }, []);

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
    <div
      style={{
        ...styles.container,
        opacity,
        transition: 'opacity 600ms ease-out',
      }}
      role="status"
      aria-label={`Loading game assets, ${clampedProgress}% complete`}
    >
      {/* Narrative message */}
      <div style={styles.narrativeText}>{narrativeMessage}</div>

      {/* Progress bar */}
      <div
        style={styles.progressContainer}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedProgress}
      >
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${clampedProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Percentage */}
      <div style={styles.percentText}>{clampedProgress}%</div>
    </div>
  );
}

/**
 * LoadingScreen error variant -- shown when asset loading fails.
 * Kept as a named export for callers that handle error state externally.
 */
export function LoadingScreenError({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div style={styles.container}>
      <div style={styles.errorText} role="alert">
        {message}
      </div>
      <button
        type="button"
        style={styles.retryButton}
        onClick={onRetry}
        aria-label="Retry loading assets"
      >
        <span style={styles.retryText}>RETRY</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 32px',
    width: '100vw',
    height: '100vh',
  },
  narrativeText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#FF1744',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 32,
    textShadow: '0 0 12px rgba(255, 23, 68, 0.6)',
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
    border: '1px solid #333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF1744',
    borderRadius: 8,
    boxShadow: '0 0 8px rgba(255, 23, 68, 0.8)',
    transition: 'width 300ms ease-out',
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
    padding: '12px 32px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  retryText: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 2,
  },
};
