/**
 * @module LoadingScreen
 * Asset preloader with procedural sausage-links progress visualization.
 *
 * Preloads all furniture GLB models (from FURNITURE_RULES), PBR texture files,
 * and OGG audio samples using parallel fetch with file-count progress tracking.
 * The individual assets are small, so byte-level streaming is overkill — we
 * simply count completed files instead.
 *
 * **Preload strategy:**
 * 1. Build asset list from FURNITURE_RULES GLBs + TEXTURE_FILES + AUDIO_FILES.
 * 2. Parallel fetch all assets via Promise.allSettled.
 * 3. Tolerant: warns on partial failures, only errors if >50% fail.
 *
 * Also initializes the Tone.js audio engine (requires user gesture — this
 * screen appears after a menu tap, satisfying the browser autoplay policy).
 *
 * When loading hits 100%, transitions to `startNewGame()` or restores
 * saved state via `continueGame()` depending on the prior flow.
 */

import {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {audioEngine} from '../../engine/AudioEngine';
import {getAssetUrl} from '../../engine/assetUrl';
import {FURNITURE_RULES} from '../../engine/FurnitureLayout';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useGameStore} from '../../store/gameStore';

const TEXTURE_FILES = [
  'tile_wall_color.jpg',
  'tile_wall_normal.jpg',
  'tile_wall_roughness.jpg',
  'tile_wall_ao.jpg',
  'concrete_color.jpg',
  'concrete_normal.jpg',
  'concrete_roughness.jpg',
  'tile_floor_color.jpg',
  'tile_floor_normal.jpg',
  'tile_floor_roughness.jpg',
  'grime_drip_color.jpg',
  'grime_drip_normal.jpg',
  'grime_drip_roughness.jpg',
  'grime_drip_opacity.jpg',
  'grime_base_color.jpg',
  'grime_base_normal.jpg',
  'grime_base_roughness.jpg',
  'grime_base_opacity.jpg',
];

const AUDIO_FILES = [
  'boiling_1.ogg',
  'boiling_2.ogg',
  'boiling_3.ogg',
  'boiling_4.ogg',
  'chop_1.ogg',
  'chop_2.ogg',
  'chop_3.ogg',
  'chop_9.ogg',
  'mix_dry_1.ogg',
  'mix_dry_2.ogg',
  'mix_wet_1.ogg',
  'mix_wet_2.ogg',
  'peel_1.ogg',
  'peel_2.ogg',
  'pots_and_pans_1.ogg',
  'pots_and_pans_2.ogg',
  'pots_and_pans_3.ogg',
  'pots_and_pans_5.ogg',
  'pour_1.ogg',
  'pour_2.ogg',
  'pour_3.ogg',
  'pour_6.ogg',
  'sizzle_1.ogg',
  'sizzle_2.ogg',
  'sizzle_3.ogg',
  'sizzle_8.ogg',
  'sizzle_loop_1.ogg',
  'sizzle_loop_2.ogg',
];

const LOADING_QUOTES = [
  'Selecting the finest meats...',
  'Grinding it down...',
  'Stuffing the casing...',
  'Firing up the stove...',
  'Almost ready to blow...',
];

const LINK_COUNT = 10;
const LINK_THRESHOLDS = Array.from({length: LINK_COUNT}, (_, i) =>
  Math.round(((i + 1) / LINK_COUNT) * 100),
);

// SausageButton palette
const SAUSAGE = {
  outer: '#dd6868',
  body: '#e48686',
  highlight: '#e99b9b',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const LINK_W = 48;
const LINK_H = 32;
const LINK_RADIUS = LINK_H / 2;
const CONNECTOR_W = 8;

/** Googly eyes on the rightmost visible link */
function GooglyEyes() {
  return (
    <>
      <View style={[eyeStyles.sclera, {top: 3, right: 5}]}>
        <View style={eyeStyles.pupil} />
      </View>
      <View style={[eyeStyles.sclera, {top: 15, right: 5}]}>
        <View style={eyeStyles.pupil} />
      </View>
    </>
  );
}

const eyeStyles = StyleSheet.create({
  sclera: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#000',
  },
});

/** One sausage link pill — returns null when inactive (chain hasn't grown here yet) */
function SausageLink({
  active,
  showEyes,
  scaleAnim,
}: {
  active: boolean;
  showEyes: boolean;
  scaleAnim: Animated.Value;
}) {
  if (!active) {
    return null;
  }

  return (
    <Animated.View style={[linkStyles.outer, {transform: [{scale: scaleAnim}]}]}>
      <View style={linkStyles.inner}>
        <View style={linkStyles.highlight} />
      </View>
      {showEyes && <GooglyEyes />}
    </Animated.View>
  );
}

const linkStyles = StyleSheet.create({
  outer: {
    width: LINK_W,
    height: LINK_H,
    borderRadius: LINK_RADIUS,
    backgroundColor: SAUSAGE.outer,
    justifyContent: 'center',
  },
  inner: {
    position: 'absolute',
    left: 3,
    top: 3,
    right: 3,
    bottom: 3,
    borderRadius: LINK_RADIUS - 2,
    backgroundColor: SAUSAGE.body,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 8,
    top: 3,
    right: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: SAUSAGE.highlight,
    opacity: 0.7,
  },
});

/** Thin dark connector between adjacent links */
function SausageConnector() {
  return <View style={connectorStyles.pinch} />;
}

const connectorStyles = StyleSheet.create({
  pinch: {
    width: CONNECTOR_W,
    height: 8,
    backgroundColor: '#8B1A1A',
    borderRadius: 4,
    alignSelf: 'center',
  },
});

/** Minimum milliseconds the loading screen must remain visible before transitioning. */
const MIN_DISPLAY_MS = 1500;

export function LoadingScreen() {
  const startNewGame = useGameStore(s => s.startNewGame);
  const gameStatus = useGameStore(s => s.gameStatus);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const reducedMotion = useReducedMotion();

  // Track when the loading screen first mounted so we can enforce a minimum display time.
  const mountTimeRef = useRef(Date.now());

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // One Animated.Value per sausage link for scale-in animation
  const linkScales = useMemo(
    () => Array.from({length: LINK_COUNT}, () => new Animated.Value(0)),
    [],
  );

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
  }, [fadeAnim, reducedMotion]);

  // Cycle quotes every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % LOADING_QUOTES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize audio engine (requires user gesture — loading screen comes after menu tap)
  useEffect(() => {
    audioEngine.initTone();
  }, []);

  // Pre-fetch all furniture GLBs + textures + audio to warm the browser cache
  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount triggers re-run
  useEffect(() => {
    const controller = new AbortController();

    async function preload() {
      try {
        const glbUrls = FURNITURE_RULES.map(r => getAssetUrl('models', r.glb));
        const textureUrls = TEXTURE_FILES.map(f => getAssetUrl('textures', f));
        const audioUrls = AUDIO_FILES.map(f => getAssetUrl('audio', f));
        const allAssets = [...glbUrls, ...textureUrls, ...audioUrls];

        let loaded = 0;
        const results = await Promise.allSettled(
          allAssets.map(async url => {
            const response = await fetch(url, {signal: controller.signal});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await response.arrayBuffer();
            loaded++;
            setProgress(Math.min(Math.round((loaded / allAssets.length) * 100), 99));
          }),
        );

        if (controller.signal.aborted) return;

        // GLB models are required — any failure is fatal
        const glbFailures = results.slice(0, glbUrls.length).filter(r => r.status === 'rejected');
        if (glbFailures.length > 0) {
          setLoadError('Failed to load required game models. Check your connection.');
          return;
        }

        // Optional assets (textures/audio) — tolerate partial failures
        const optionalFailures = results.slice(glbUrls.length).filter(r => r.status === 'rejected');
        if (optionalFailures.length > (allAssets.length - glbUrls.length) / 2) {
          setLoadError('Failed to load assets. Check your connection.');
          return;
        }
        if (optionalFailures.length > 0) {
          console.warn(
            `${optionalFailures.length}/${allAssets.length - glbUrls.length} optional assets failed to preload (non-fatal)`,
          );
        }

        setProgress(100);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Error preloading assets:', error);
        if (!controller.signal.aborted)
          setLoadError('Failed to load assets. Check your connection.');
      }
    }

    preload();
    return () => {
      controller.abort();
    };
  }, [retryCount]);

  // When loading completes, transition to playing — but honour MIN_DISPLAY_MS so the
  // loading screen is never invisible (assets load instantly on localhost / fast connections).
  useEffect(() => {
    if (progress < 100) return;

    const elapsed = Date.now() - mountTimeRef.current;
    // Wait at least MIN_DISPLAY_MS from mount, plus a brief 400ms "100%" pause.
    const remainingWait = Math.max(0, MIN_DISPLAY_MS - elapsed) + 400;

    const timeout = setTimeout(() => {
      // If continuing a saved game, gameStatus is already 'playing' (set by continueGame())
      if (gameStatus !== 'playing') {
        startNewGame();
      } else {
        // CONTINUE flow — game state already restored, just enter the 3D scene
        useGameStore.getState().setAppPhase('playing');
      }
    }, remainingWait);

    return () => clearTimeout(timeout);
  }, [progress, startNewGame, gameStatus]);

  // Animate sausage links as progress crosses thresholds
  const activatedRef = useRef<boolean[]>(Array(LINK_COUNT).fill(false));
  useEffect(() => {
    for (let i = 0; i < LINK_COUNT; i++) {
      if (progress >= LINK_THRESHOLDS[i] && !activatedRef.current[i]) {
        activatedRef.current[i] = true;
        if (reducedMotion) {
          linkScales[i].setValue(1);
        } else {
          Animated.spring(linkScales[i], {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  }, [progress, linkScales, reducedMotion]);

  // Compute which links are active and which is newest (for googly eyes)
  const activeCount = LINK_THRESHOLDS.filter(t => progress >= t).length;

  const handleRetry = () => {
    setLoadError(null);
    setProgress(0);
    activatedRef.current = Array(LINK_COUNT).fill(false);
    mountTimeRef.current = Date.now();
    for (const scale of linkScales) {
      scale.setValue(0);
    }
    setRetryCount(c => c + 1);
  };

  return (
    <Animated.View
      style={[styles.container, {opacity: fadeAnim}]}
      accessibilityLabel={`Loading game assets, ${progress}% complete`}
    >
      {loadError ? (
        <View style={styles.progressArea}>
          <Text style={styles.errorText} accessibilityRole="alert">
            {loadError}
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry loading assets"
          >
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Sausage links progress */}
          <View
            style={styles.progressArea}
            accessibilityRole="progressbar"
            accessibilityValue={{min: 0, max: 100, now: progress}}
          >
            <View style={styles.linksContainer}>
              {Array.from({length: LINK_COUNT}, (_, i) => {
                const active = progress >= LINK_THRESHOLDS[i];
                if (!active) return null;
                const isNewest = i === activeCount - 1;
                return (
                  <View key={i} style={styles.linkSlot}>
                    {i > 0 && progress >= LINK_THRESHOLDS[i - 1] && <SausageConnector />}
                    <SausageLink active={active} showEyes={isNewest} scaleAnim={linkScales[i]} />
                  </View>
                );
              })}
            </View>

            {/* Percentage */}
            <Text style={styles.percentage}>{progress}%</Text>
          </View>

          {/* Mr. Sausage quote */}
          <Text style={styles.quote}>"{LOADING_QUOTES[quoteIndex]}"</Text>
          <Text style={styles.attribution}>- Mr. Sausage</Text>
        </>
      )}
    </Animated.View>
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
  progressArea: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 40,
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  linkSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentage: {
    fontFamily: 'Bangers',
    fontSize: 28,
    color: '#CCBBAA',
    marginTop: 12,
    letterSpacing: 2,
  },
  quote: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#888',
    textAlign: 'center',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  attribution: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: '#555',
    marginTop: 8,
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
