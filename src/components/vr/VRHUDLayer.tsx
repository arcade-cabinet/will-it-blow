/**
 * @module VRHUDLayer
 * In-scene HUD layer for VR mode.
 *
 * Renders challenge HUDs, dialogue, and game over UI as world-space VR panels
 * when an immersive-vr session is active. In flat-screen mode this component
 * renders nothing — the 2D overlay in App.tsx handles HUD rendering.
 *
 * Architecture:
 * - Lives inside the R3F Canvas (SceneContent), NOT in the 2D overlay
 * - Reads Zustand store to determine which HUD to show
 * - Wraps each HUD in a `<VRPanel>` at comfortable VR reading distance
 * - Uses VRHtmlWrapper to render RN components as HTML in 3D space
 */

import {getChallengeIndex} from '../../engine/ChallengeManifest';
import {useXRMode} from '../../hooks/useXRMode';
import {useGameStore} from '../../store/gameStore';
import {VRPanel} from './VRPanel';

// Challenge index constants — derived from manifest, no magic numbers
const IDX_INGREDIENTS = getChallengeIndex('ingredients');
const IDX_CHOPPING = getChallengeIndex('chopping');
const IDX_GRINDING = getChallengeIndex('grinding');
const IDX_STUFFING = getChallengeIndex('stuffing');
const IDX_COOKING = getChallengeIndex('cooking');
const IDX_BLOWOUT = getChallengeIndex('blowout');
const IDX_TASTING = getChallengeIndex('tasting');

/**
 * VR-specific timer display — renders a simple countdown in the VR panel.
 * Mirrors the timer banner from the 2D HUD overlays.
 */
function VRTimer({seconds, danger}: {seconds: number; danger?: boolean}) {
  const color = danger ? '#FF1744' : '#FFC832';
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: '32px',
        fontWeight: '900',
        color,
        letterSpacing: '2px',
        textShadow: danger ? '0 0 12px rgba(255,23,68,0.6)' : '0 0 8px rgba(255,200,50,0.3)',
        marginBottom: '12px',
      }}
    >
      {Math.ceil(seconds)}s
    </div>
  );
}

/**
 * VR-specific progress bar — simple CSS bar mirroring ProgressGauge.
 */
function VRProgressBar({value, label, color}: {value: number; label: string; color: string}) {
  return (
    <div style={{marginBottom: '10px'}}>
      <div
        style={{
          fontSize: '14px',
          color: '#888',
          letterSpacing: '2px',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '100%',
          height: '12px',
          background: '#1a1a1a',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            background: color,
            borderRadius: '6px',
            transition: 'width 0.15s ease-out',
          }}
        />
      </div>
    </div>
  );
}

/**
 * VR-specific speed zone feedback text.
 */
function VRSpeedZone({zone}: {zone: string}) {
  const labels: Record<string, {text: string; color: string}> = {
    slow: {text: 'TOO SLOW!', color: '#FF9800'},
    good: {text: 'PERFECT!', color: '#4CAF50'},
    fast: {text: 'TOO FAST!', color: '#FF1744'},
  };
  const info = labels[zone];
  if (!info) return null;

  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: '22px',
        fontWeight: '900',
        color: info.color,
        letterSpacing: '3px',
        textShadow: `0 0 10px ${info.color}80`,
      }}
    >
      {info.text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VR Challenge HUDs — simplified HTML versions of the RN overlays
// ---------------------------------------------------------------------------

function VRGrindingHUD() {
  const progress = useGameStore(s => s.challengeProgress);
  const time = useGameStore(s => s.challengeTimeRemaining);
  const zone = useGameStore(s => s.challengeSpeedZone);
  const phase = useGameStore(s => s.challengePhase);

  if (phase !== 'active') return null;

  return (
    <VRPanel distance={1.5} verticalOffset={-0.1} width={360}>
      <VRTimer seconds={time} danger={time < 10} />
      <VRProgressBar value={progress} label="GRIND PROGRESS" color="#4CAF50" />
      {zone && <VRSpeedZone zone={zone} />}
    </VRPanel>
  );
}

function VRStuffingHUD() {
  const progress = useGameStore(s => s.challengeProgress);
  const pressure = useGameStore(s => s.challengePressure);
  const time = useGameStore(s => s.challengeTimeRemaining);
  const isPressing = useGameStore(s => s.challengeIsPressing);
  const phase = useGameStore(s => s.challengePhase);

  if (phase !== 'active') return null;

  return (
    <VRPanel distance={1.5} verticalOffset={-0.1} width={380}>
      <VRTimer seconds={time} danger={time < 10} />
      <div style={{display: 'flex', gap: '10px'}}>
        <div style={{flex: 1}}>
          <VRProgressBar value={progress} label="FILL" color="#4CAF50" />
        </div>
        <div style={{flex: 1}}>
          <VRProgressBar
            value={pressure}
            label="PRESSURE"
            color={pressure > 85 ? '#FF1744' : '#FFC107'}
          />
        </div>
      </div>
      {pressure > 70 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: '900',
            color: '#FF1744',
            letterSpacing: '4px',
            textShadow: '0 0 12px rgba(255,23,68,0.8)',
          }}
        >
          CAREFUL!
        </div>
      )}
      <div
        style={{
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: '900',
          color: isPressing ? '#FFC832' : '#4CAF50',
          letterSpacing: '3px',
          marginTop: '8px',
        }}
      >
        {isPressing ? 'FILLING...' : 'RELEASE...'}
      </div>
    </VRPanel>
  );
}

function VRCookingHUD() {
  const progress = useGameStore(s => s.challengeProgress);
  const temp = useGameStore(s => s.challengeTemperature);
  const time = useGameStore(s => s.challengeTimeRemaining);
  const heatLevel = useGameStore(s => s.challengeHeatLevel);
  const phase = useGameStore(s => s.challengePhase);

  if (phase !== 'active') return null;

  const heatLabels = ['OFF', 'LOW', 'MED', 'HIGH'];
  const heatIndex = Math.min(3, Math.round(heatLevel));

  // Temperature color
  const tempColor = temp < 150 ? '#4FC3F7' : temp <= 170 ? '#4CAF50' : '#FF1744';

  return (
    <VRPanel distance={1.5} verticalOffset={-0.1} width={380}>
      <VRTimer seconds={time} danger={time < 10} />
      <VRProgressBar value={progress} label="HOLD" color="#4CAF50" />
      <div
        style={{
          textAlign: 'center',
          fontSize: '48px',
          fontWeight: '900',
          color: tempColor,
          letterSpacing: '4px',
          textShadow: '2px 2px 12px rgba(0,0,0,0.8)',
          margin: '8px 0',
        }}
      >
        {Math.round(temp)}&deg;F
      </div>
      <div
        style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#999',
          letterSpacing: '2px',
        }}
      >
        HEAT: {heatLabels[heatIndex]}
      </div>
    </VRPanel>
  );
}

function VRChoppingHUD() {
  const progress = useGameStore(s => s.challengeProgress);
  const time = useGameStore(s => s.challengeTimeRemaining);
  const zone = useGameStore(s => s.challengeSpeedZone);
  const phase = useGameStore(s => s.challengePhase);

  if (phase !== 'active') return null;

  const choppingZoneLabels: Record<string, {text: string; color: string}> = {
    slow: {text: 'ALMOST...', color: '#FF9800'},
    good: {text: 'CHOP NOW!', color: '#4CAF50'},
    fast: {text: 'WAIT...', color: '#9E9E9E'},
  };

  const zoneInfo = zone ? choppingZoneLabels[zone] : undefined;

  return (
    <VRPanel distance={1.5} verticalOffset={-0.1} width={360}>
      <VRTimer seconds={time} danger={time < 10} />
      <VRProgressBar value={progress} label="CHOP PROGRESS" color="#FF9800" />
      {zoneInfo && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: '900',
            color: zoneInfo.color,
            letterSpacing: '3px',
            textShadow: `0 0 10px ${zoneInfo.color}80`,
          }}
        >
          {zoneInfo.text}
        </div>
      )}
    </VRPanel>
  );
}

function VRBlowoutHUD() {
  const progress = useGameStore(s => s.challengeProgress);
  const time = useGameStore(s => s.challengeTimeRemaining);
  const casingTied = useGameStore(s => s.casingTied);
  const phase = useGameStore(s => s.challengePhase);

  if (phase !== 'active') return null;

  if (!casingTied) {
    return (
      <VRPanel distance={1.5} verticalOffset={-0.2} width={320}>
        <div
          style={{
            textAlign: 'center',
            fontSize: '26px',
            fontWeight: '900',
            color: '#FFC832',
            letterSpacing: '4px',
          }}
        >
          TIE THE CASING
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#888',
            marginTop: '8px',
          }}
        >
          Swipe gesture to tie
        </div>
      </VRPanel>
    );
  }

  return (
    <VRPanel distance={1.5} verticalOffset={-0.1} width={360}>
      <VRTimer seconds={time} danger={time < 10} />
      <VRProgressBar value={progress} label="COVERAGE" color="#FFC832" />
      <div
        style={{
          textAlign: 'center',
          fontSize: '26px',
          fontWeight: '900',
          color: '#FFC832',
          letterSpacing: '4px',
          textShadow: '0 0 12px rgba(255,200,50,0.5)',
          marginTop: '8px',
        }}
      >
        HOLD TO BLOW
      </div>
      <div
        style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#888',
          marginTop: '4px',
        }}
      >
        Release to fire
      </div>
    </VRPanel>
  );
}

// ---------------------------------------------------------------------------
// VR Game Over panel
// ---------------------------------------------------------------------------

function VRGameOverPanel() {
  const gameStatus = useGameStore(s => s.gameStatus);
  const setAppPhase = useGameStore(s => s.setAppPhase);
  const returnToMenu = useGameStore(s => s.returnToMenu);

  if (gameStatus !== 'victory' && gameStatus !== 'defeat') return null;

  return (
    <VRPanel distance={1.8} verticalOffset={0} width={400}>
      <div
        style={{
          textAlign: 'center',
          fontSize: '42px',
          fontWeight: '900',
          color: gameStatus === 'victory' ? '#FFD700' : '#FF1744',
          letterSpacing: '4px',
          textShadow:
            gameStatus === 'victory'
              ? '0 0 20px rgba(255,215,0,0.6)'
              : '0 0 20px rgba(255,23,68,0.6)',
          marginBottom: '16px',
        }}
      >
        {gameStatus === 'victory' ? 'VICTORY' : 'GAME OVER'}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px'}}>
        <button
          type="button"
          onClick={() => setAppPhase('loading')}
          style={{
            background: '#B71C1C',
            border: '2px solid #FF1744',
            borderRadius: '12px',
            padding: '14px 24px',
            color: '#FFFFFF',
            fontSize: '20px',
            fontWeight: '900',
            fontFamily: 'Bangers, sans-serif',
            letterSpacing: '1px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          NEW GAME
        </button>
        <button
          type="button"
          onClick={returnToMenu}
          style={{
            background: '#333',
            border: '2px solid #555',
            borderRadius: '12px',
            padding: '12px 24px',
            color: '#AAA',
            fontSize: '18px',
            fontWeight: '900',
            fontFamily: 'Bangers, sans-serif',
            letterSpacing: '1px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          MENU
        </button>
      </div>
    </VRPanel>
  );
}

// ---------------------------------------------------------------------------
// VRHUDLayer — top-level component for all VR HUD panels
// ---------------------------------------------------------------------------

/**
 * Renders all HUD elements as world-space VR panels when an immersive-vr
 * session is active. Returns null in flat-screen mode.
 *
 * Must be placed inside the R3F Canvas tree (inside `<XR>`).
 */
export function VRHUDLayer() {
  const {isVR} = useXRMode();
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);

  if (!isVR) return null;

  const showChallenge = gameStatus === 'playing' && challengeTriggered;

  return (
    <>
      {/* Active challenge HUDs */}
      {showChallenge && currentChallenge === IDX_INGREDIENTS && null /* bridge pattern */}
      {showChallenge && currentChallenge === IDX_CHOPPING && <VRChoppingHUD />}
      {showChallenge && currentChallenge === IDX_GRINDING && <VRGrindingHUD />}
      {showChallenge && currentChallenge === IDX_STUFFING && <VRStuffingHUD />}
      {showChallenge && currentChallenge === IDX_COOKING && <VRCookingHUD />}
      {showChallenge && currentChallenge === IDX_BLOWOUT && <VRBlowoutHUD />}
      {showChallenge && currentChallenge === IDX_TASTING && null /* bridge pattern */}

      {/* Game over / victory */}
      <VRGameOverPanel />
    </>
  );
}
