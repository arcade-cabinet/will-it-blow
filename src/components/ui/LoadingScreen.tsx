/**
 * @module LoadingScreen
 * Horror-themed sausage coil loading screen shown as a Suspense fallback
 * while the 3D kitchen scene loads.
 *
 * Uses a pure CSS sausage coil spiral animation — no R3F Canvas (which may
 * itself be part of what is loading). Dark background (#0a0a0a) with a
 * single warm-lit sausage coil that spins and pulses.
 *
 * Text: "PREPARING THE MEAT..." in horror font with blood-red glow.
 */

import {useEffect, useState} from 'react';

/**
 * Sausage coil loading screen — zero-props, designed as a React Suspense fallback.
 *
 * Renders a CSS spiral coil that rotates, with pulsing glow and dripping
 * meat-juice effect. Horror typography below.
 */
export function LoadingScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease-out',
      }}
    >
      {/* CSS Sausage Coil */}
      <div style={coilContainerStyle}>
        <div style={coilStyle}>
          {/* Build a spiral from concentric arcs */}
          {COIL_SEGMENTS.map((seg, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: seg.size,
                height: seg.size,
                left: `calc(50% - ${seg.size / 2}px)`,
                top: `calc(50% - ${seg.size / 2}px)`,
                borderRadius: '50%',
                border: `${SAUSAGE_THICKNESS}px solid transparent`,
                borderTopColor: seg.color,
                borderRightColor: i % 2 === 0 ? seg.color : 'transparent',
                transform: `rotate(${seg.rotation}deg)`,
              }}
            />
          ))}
          {/* Center nub — the coil origin */}
          <div
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              left: 'calc(50% - 7px)',
              top: 'calc(50% - 7px)',
              borderRadius: '50%',
              backgroundColor: '#a04040',
              boxShadow: '0 0 6px rgba(160, 64, 64, 0.8)',
            }}
          />
        </div>
      </div>

      {/* Warm spotlight glow behind the coil */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,200,150,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* "PREPARING THE MEAT..." text */}
      <div
        style={{
          fontFamily: 'Bangers, "Creepster", cursive, sans-serif',
          fontSize: 26,
          color: '#FF1744',
          textAlign: 'center',
          letterSpacing: 4,
          marginTop: 48,
          textShadow: '0 0 16px rgba(255, 23, 68, 0.6), 0 0 32px rgba(255, 23, 68, 0.3)',
          animation: 'loadingPulse 2s ease-in-out infinite',
        }}
      >
        PREPARING THE MEAT...
      </div>

      {/* Drip dots under text */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#FF1744',
              opacity: 0.7,
              animation: `dripDot 1.4s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Inline keyframes */}
      <style>{KEYFRAMES_CSS}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coil geometry constants
// ---------------------------------------------------------------------------

const SAUSAGE_THICKNESS = 12;

/** Each segment is a semicircular arc at increasing radius, alternating sides. */
const COIL_SEGMENTS = Array.from({length: 8}, (_, i) => {
  const baseSize = 30 + i * 22;
  // Alternate between pinkish-red meat colors for depth
  const colors = [
    '#c85a5a',
    '#b04848',
    '#a04040',
    '#8a3535',
    '#c85a5a',
    '#b04848',
    '#a04040',
    '#8a3535',
  ];
  return {
    size: baseSize,
    color: colors[i],
    rotation: i * 45,
  };
});

const coilContainerStyle: React.CSSProperties = {
  width: 220,
  height: 220,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const coilStyle: React.CSSProperties = {
  width: 200,
  height: 200,
  position: 'relative',
  animation: 'sausageCoilSpin 4s linear infinite',
  filter: 'drop-shadow(0 0 12px rgba(160, 64, 64, 0.5))',
};

// ---------------------------------------------------------------------------
// Keyframe animations (injected via <style>)
// ---------------------------------------------------------------------------

const KEYFRAMES_CSS = `
@keyframes sausageCoilSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes loadingPulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1.0; }
}

@keyframes dripDot {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(6px);
    opacity: 1.0;
  }
}
`;

/**
 * LoadingScreen error variant -- shown when asset loading fails.
 * Kept as a named export for callers that handle error state externally.
 */
export function LoadingScreenError({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 32px',
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        style={{
          fontFamily: 'Bangers',
          fontSize: 22,
          color: '#C2442D',
          textAlign: 'center',
          letterSpacing: 1,
          marginBottom: 24,
        }}
        role="alert"
      >
        {message}
      </div>
      <button
        type="button"
        style={{
          backgroundColor: '#C2442D',
          padding: '12px 32px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
        }}
        onClick={onRetry}
        aria-label="Retry loading assets"
      >
        <span
          style={{
            fontFamily: 'Bangers',
            fontSize: 20,
            color: '#fff',
            letterSpacing: 2,
          }}
        >
          RETRY
        </span>
      </button>
    </div>
  );
}
