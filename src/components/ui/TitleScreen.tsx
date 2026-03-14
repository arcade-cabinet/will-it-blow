import {useState} from 'react';
import {useGameStore} from '../../ecs/hooks';
import {DIFFICULTY_TIERS} from '../../engine/DifficultyConfig';
import {DifficultySelector} from './DifficultySelector';

export function TitleScreen() {
  const setAppPhase = useGameStore(s => s.setAppPhase);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const [showDifficulty, setShowDifficulty] = useState(false);

  const handleStart = () => {
    setShowDifficulty(true);
  };

  const handleDifficultySelect = (tierId: string) => {
    const tier = DIFFICULTY_TIERS.find(t => t.id === tierId) || DIFFICULTY_TIERS[2];
    setDifficulty(
      tierId,
      tier.id === 'rare' || tier.id === 'medium-rare' ? 3 : tier.id === 'well-done' ? 10 : 5,
    );
    setAppPhase('playing');
  };

  if (showDifficulty) {
    return (
      <DifficultySelector
        onSelect={handleDifficultySelect}
        onBack={() => setShowDifficulty(false)}
      />
    );
  }

  return (
    <>
      <style>{`
        @keyframes titleSwing {
          0% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
          100% { transform: rotate(-1deg); }
        }
        @keyframes titleFadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .title-start-btn:hover {
          opacity: 0.8;
        }
        .title-start-btn:active {
          opacity: 0.7;
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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: 24,
          paddingRight: 24,
          zIndex: 100,
          animation: 'titleFadeIn 1s ease-out',
        }}
      >
        {/* Butcher shop sign */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 48,
            animation: 'titleSwing 6s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        >
          {/* Hanging chains */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: 200,
              marginBottom: -2,
            }}
          >
            <div
              style={{
                width: 3,
                height: 24,
                backgroundColor: '#555',
                borderRadius: 1,
              }}
            />
            <div
              style={{
                width: 3,
                height: 24,
                backgroundColor: '#555',
                borderRadius: 1,
              }}
            />
          </div>

          <div
            style={{
              backgroundColor: '#1a0a00',
              border: '4px solid #8B4513',
              padding: 4,
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Outer border */}
            <div
              style={{
                border: '2px solid #D2A24C',
                paddingTop: 20,
                paddingBottom: 20,
                paddingLeft: 32,
                paddingRight: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: '#D2A24C',
                  letterSpacing: 4,
                  marginBottom: 4,
                }}
              >
                Est. 1974
              </span>
              <h1
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: '#FF1744',
                  textAlign: 'center',
                  lineHeight: '52px',
                  letterSpacing: 2,
                  textShadow: '0 0 16px rgba(255, 23, 68, 0.4)',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {'WILL IT\nBLOW?'}
              </h1>
              <div
                style={{
                  width: 120,
                  height: 2,
                  backgroundColor: '#D2A24C',
                  marginTop: 12,
                  marginBottom: 12,
                }}
              />
              <span
                style={{
                  fontSize: 16,
                  color: '#D2A24C',
                  letterSpacing: 3,
                }}
              >
                Fine Meats &amp; Sausages
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            className="title-start-btn"
            onClick={handleStart}
            style={{
              backgroundColor: '#D2A24C',
              paddingTop: 16,
              paddingBottom: 16,
              paddingLeft: 32,
              paddingRight: 32,
              borderRadius: 8,
              border: '4px solid #8B4513',
              color: '#1a0a00',
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 2,
              cursor: 'pointer',
            }}
          >
            START COOKING
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            fontSize: 12,
            color: '#3a3a3a',
            letterSpacing: 3,
            marginTop: 48,
            textAlign: 'center',
          }}
        >
          Mr. Sausage's Fine Meats &amp; Sausages
        </p>
      </div>
    </>
  );
}
