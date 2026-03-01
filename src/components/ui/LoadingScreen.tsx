import {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {audioEngine} from '../../engine/AudioEngine';
import {getAssetUrl} from '../../engine/assetUrl';
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

const LOADING_QUOTES = [
  'Selecting the finest meats...',
  'Grinding it down...',
  'Stuffing the casing...',
  'Firing up the stove...',
  'Almost ready to blow...',
];

export function LoadingScreen() {
  const startNewGame = useGameStore(s => s.startNewGame);
  const gameStatus = useGameStore(s => s.gameStatus);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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

  // Pre-fetch kitchen.glb + all textures to warm the browser cache
  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is an intentional trigger to re-run the preload
  useEffect(() => {
    const controller = new AbortController();

    async function preload() {
      try {
        // Build full asset list: GLB model + all texture files
        const assets = [
          {url: getAssetUrl('models', 'kitchen.glb'), critical: true},
          ...TEXTURE_FILES.map(f => ({url: getAssetUrl('textures', f), critical: false})),
        ];

        // Issue HEAD requests to get total byte count for progress bar
        const sizes = await Promise.all(
          assets.map(async a => {
            try {
              const head = await fetch(a.url, {method: 'HEAD', signal: controller.signal});
              return Number(head.headers.get('content-length')) || 0;
            } catch {
              return 0;
            }
          }),
        );
        const totalBytes = sizes.reduce((sum, s) => sum + s, 0);

        if (controller.signal.aborted) return;

        // Download all in parallel, tracking streamed bytes
        const receivedBytesRef = {current: 0};

        const downloadOne = async (asset: {url: string; critical: boolean}) => {
          const response = await fetch(asset.url, {signal: controller.signal});
          if (!response.ok) {
            if (asset.critical) {
              throw new Error(`Failed to load assets (HTTP ${response.status})`);
            }
            console.warn(`Failed to preload ${asset.url}: ${response.status}`);
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            await response.arrayBuffer();
            return;
          }

          while (true) {
            const {done, value} = await reader.read();
            if (done || controller.signal.aborted) break;
            receivedBytesRef.current += value.byteLength;
            if (totalBytes > 0) {
              const pct = Math.min(Math.round((receivedBytesRef.current / totalBytes) * 100), 99);
              setProgress(pct);
            }
          }
        };

        const results = await Promise.allSettled(assets.map(downloadOne));

        if (controller.signal.aborted) return;

        // Check if any critical asset failed
        const criticalFailed = results.find(
          (r, i) => r.status === 'rejected' && assets[i].critical,
        );
        if (criticalFailed && criticalFailed.status === 'rejected') {
          setLoadError(criticalFailed.reason?.message ?? 'Failed to load assets.');
          return;
        }

        // Log non-critical failures
        results.forEach((r, i) => {
          if (r.status === 'rejected' && !assets[i].critical) {
            console.warn(`Texture preload failed (non-fatal): ${assets[i].url}`);
          }
        });

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

  // When loading completes, transition to playing
  useEffect(() => {
    if (progress < 100) return;

    const timeout = setTimeout(() => {
      // If continuing a saved game, gameStatus is already 'playing' (set by continueGame())
      if (gameStatus !== 'playing') {
        startNewGame();
      } else {
        // CONTINUE flow — game state already restored, just enter the 3D scene
        useGameStore.getState().setAppPhase('playing');
      }
    }, 400); // Brief pause so user sees 100%

    return () => clearTimeout(timeout);
  }, [progress, startNewGame, gameStatus]);

  const fillWidth = `${Math.max(progress, 2)}%` as const;

  const handleRetry = () => {
    setLoadError(null);
    setProgress(0);
    setRetryCount(c => c + 1);
  };

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      {loadError ? (
        <View style={styles.progressArea}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Sausage progress bar */}
          <View style={styles.progressArea}>
            <View style={styles.sausageTrack}>
              <View style={[styles.sausageFill, {width: fillWidth}]}>
                {/* Left end cap */}
                <View style={styles.sausageCapLeft} />
                {/* Right end cap */}
                <View style={styles.sausageCapRight} />
              </View>
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

const SAUSAGE_COLOR = '#C2442D';
const SAUSAGE_COLOR_DARK = '#8B1A1A';

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
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 40,
  },
  sausageTrack: {
    width: '100%',
    height: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  sausageFill: {
    height: '100%',
    backgroundColor: SAUSAGE_COLOR,
    borderRadius: 14,
    minWidth: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sausageCapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: SAUSAGE_COLOR_DARK,
  },
  sausageCapRight: {
    position: 'absolute',
    right: 0,
    top: 2,
    bottom: 2,
    width: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: SAUSAGE_COLOR_DARK,
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
