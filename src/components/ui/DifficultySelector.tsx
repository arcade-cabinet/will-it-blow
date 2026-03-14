/**
 * @module DifficultySelector
 * "Choose Your Doneness" screen — 5-tier difficulty picker.
 *
 * Displays a 3x2 grid (3 top row + 2 bottom row) of doneness buttons with
 * a visual "PERMADEATH LINE" separator between the safe tiers (Rare, Medium Rare,
 * Medium) and the brutal ones (Medium Well, Well Done).
 *
 * Each button shows the tier name, tinted by its color. Follows the butcher-shop
 * dark theme and Bangers font from SettingsScreen.
 */

import {DIFFICULTY_TIERS} from '../../engine/DifficultyConfig';

interface DifficultySelectorProps {
  /** Called when the player selects a difficulty tier. */
  onSelect: (tierId: string) => void;
  /** Called when the player presses BACK. */
  onBack: () => void;
}

/** Top row: tiers without permadeath. Bottom row: permadeath tiers. */
const safeTiers = DIFFICULTY_TIERS.filter(t => !t.permadeath);
const brutalTiers = DIFFICULTY_TIERS.filter(t => t.permadeath);

export function DifficultySelector({onSelect, onBack}: DifficultySelectorProps) {
  return (
    <>
      <style>{`
        .tier-btn:hover .tier-circle {
          border-color: #FF1744 !important;
        }
        .tier-btn:active .tier-circle {
          opacity: 0.7;
          border-color: #FF1744 !important;
        }
        .diff-back-btn:hover {
          opacity: 0.8;
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0a0a0a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <section
          style={{
            backgroundColor: '#1a0a00',
            border: '4px solid #8B4513',
            padding: 24,
            width: '100%',
            maxWidth: 420,
          }}
          aria-label="Difficulty selection"
        >
          <h2
            style={{
              fontFamily: 'Bangers',
              fontSize: 28,
              color: '#FF1744',
              textAlign: 'center',
              letterSpacing: 3,
              textShadow: '0 0 12px rgba(255, 23, 68, 0.4)',
              margin: 0,
            }}
          >
            CHOOSE YOUR DONENESS
          </h2>
          <div
            style={{
              height: 2,
              backgroundColor: '#D2A24C',
              marginTop: 16,
              marginBottom: 16,
              opacity: 0.5,
            }}
          />

          {/* Safe tiers row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 16,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            {safeTiers.map(tier => (
              <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
            ))}
          </div>

          {/* Permadeath line separator */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              marginBottom: 12,
              gap: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: '#FF1744',
                opacity: 0.6,
              }}
            />
            <span
              style={{
                fontFamily: 'Bangers',
                fontSize: 12,
                color: '#FF1744',
                letterSpacing: 3,
                opacity: 0.8,
              }}
            >
              PERMADEATH
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                backgroundColor: '#FF1744',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Brutal tiers row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 16,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            {brutalTiers.map(tier => (
              <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
            ))}
          </div>

          <div
            style={{
              height: 2,
              backgroundColor: '#D2A24C',
              marginTop: 16,
              marginBottom: 16,
              opacity: 0.5,
            }}
          />

          <div style={{display: 'flex', justifyContent: 'center'}}>
            <button
              type="button"
              className="diff-back-btn"
              onClick={onBack}
              aria-label="Back to main menu"
              style={{
                background: 'none',
                border: 'none',
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 24,
                paddingRight: 24,
                cursor: 'pointer',
                fontFamily: 'Bangers',
                fontSize: 22,
                color: '#CCBBAA',
                letterSpacing: 2,
              }}
            >
              {'\u25C0'} BACK
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

/** Individual difficulty tier button with color-tinted circle and name. */
function TierButton({
  tier,
  onPress,
}: {
  tier: (typeof DIFFICULTY_TIERS)[number];
  onPress: () => void;
}) {
  const strikeText = `${tier.maxStrikes} strike${tier.maxStrikes !== 1 ? 's' : ''}`;
  return (
    <button
      type="button"
      className="tier-btn"
      onClick={onPress}
      aria-label={`${tier.name} difficulty, ${strikeText}${tier.permadeath ? ', permadeath' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 100,
        paddingTop: 12,
        paddingBottom: 12,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        className="tier-circle"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          border: '2px solid #555',
          marginBottom: 8,
          backgroundColor: tier.color,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.6)',
        }}
      />
      <span
        style={{
          fontFamily: 'Bangers',
          fontSize: 14,
          letterSpacing: 1,
          textAlign: 'center',
          color: tier.color,
        }}
      >
        {tier.name}
      </span>
      <span
        style={{
          fontFamily: 'Bangers',
          fontSize: 11,
          color: '#666',
          letterSpacing: 1,
          marginTop: 2,
        }}
      >
        {strikeText}
      </span>
    </button>
  );
}
