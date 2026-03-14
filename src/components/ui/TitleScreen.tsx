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
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center px-6 z-50 animate-[fadeInUp_1s_ease-out]">
      {/* Butcher shop sign */}
      <div className="flex flex-col items-center mb-12 animate-[swing_6s_ease-in-out_infinite] origin-top">
        {/* Hanging chains */}
        <div className="flex flex-row justify-between w-[200px] -mb-0.5">
          <div className="w-[3px] h-6 bg-[#555] rounded-sm" />
          <div className="w-[3px] h-6 bg-[#555] rounded-sm" />
        </div>

        <div className="bg-[#1a0a00] border-4 border-[#8B4513] p-1 shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
          {/* Outer border */}
          <div className="border-2 border-[#D2A24C] py-5 px-8 flex flex-col items-center">
            <span className="text-sm text-[#D2A24C] tracking-[4px] mb-1">Est. 1974</span>
            <h1 className="text-5xl font-black text-[#FF1744] text-center leading-[52px] tracking-wider m-0 whitespace-pre-line drop-shadow-[0_0_16px_rgba(255,23,68,0.4)]">
              {'WILL IT\nBLOW?'}
            </h1>
            <div className="w-[120px] h-0.5 bg-[#D2A24C] my-3" />
            <span className="text-base text-[#D2A24C] tracking-[3px]">
              Fine Meats &amp; Sausages
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleStart}
          className="btn btn-lg bg-[#D2A24C] border-4 border-[#8B4513] text-[#1a0a00] text-2xl font-black tracking-wider hover:bg-[#c4943e] active:opacity-70"
        >
          START COOKING
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-[#3a3a3a] tracking-[3px] mt-12 text-center">
        Mr. Sausage's Fine Meats &amp; Sausages
      </p>
    </div>
  );
}
