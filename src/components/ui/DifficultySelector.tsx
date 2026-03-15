/**
 * @module DifficultySelector
 * "Choose Your Doneness" screen — 5-tier difficulty picker.
 *
 * Displays a 3x2 grid (3 top row + 2 bottom row) of doneness buttons with
 * a visual "PERMADEATH LINE" separator between the safe tiers (Rare, Medium Rare,
 * Medium) and the brutal ones (Medium Well, Well Done).
 *
 * Styled with Tailwind CSS + DaisyUI components.
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
    <div className="fixed inset-0 bg-[#0a0a0a] flex justify-center items-center px-6">
      <section
        className="bg-[#1a0a00] border-4 border-[#8B4513] p-6 w-full max-w-[420px]"
        aria-label="Difficulty selection"
      >
        <h2 className="font-[Bangers] text-[28px] text-[#FF1744] text-center tracking-[3px] drop-shadow-[0_0_12px_rgba(255,23,68,0.4)] m-0">
          CHOOSE YOUR DONENESS
        </h2>
        <div className="h-0.5 bg-[#D2A24C] my-4 opacity-50" />

        {/* Safe tiers row */}
        <div className="flex flex-row justify-center gap-4 my-2">
          {safeTiers.map(tier => (
            <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
          ))}
        </div>

        {/* Permadeath line separator */}
        <div className="flex flex-row items-center my-3 gap-2">
          <div className="flex-1 h-px bg-[#FF1744] opacity-60" />
          <span className="font-[Bangers] text-xs text-[#FF1744] tracking-[3px] opacity-80">
            PERMADEATH
          </span>
          <div className="flex-1 h-px bg-[#FF1744] opacity-60" />
        </div>

        {/* Brutal tiers row */}
        <div className="flex flex-row justify-center gap-4 my-2">
          {brutalTiers.map(tier => (
            <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
          ))}
        </div>

        <div className="h-0.5 bg-[#D2A24C] my-4 opacity-50" />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to main menu"
            className="btn btn-ghost font-[Bangers] text-[22px] text-[#CCBBAA] tracking-wider hover:opacity-80"
          >
            {'\u25C0'} BACK
          </button>
        </div>
      </section>
    </div>
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
      onClick={onPress}
      aria-label={`${tier.name} difficulty, ${strikeText}${tier.permadeath ? ', permadeath' : ''}`}
      className="group btn btn-ghost flex flex-col items-center w-[100px] py-3 h-auto"
    >
      <div
        className="w-12 h-12 rounded-full border-2 border-[#555] mb-2 shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:border-[#FF1744] group-active:opacity-70 group-active:border-[#FF1744] transition-colors"
        style={{backgroundColor: tier.color}}
      />
      <span
        className="font-[Bangers] text-sm tracking-wide text-center"
        style={{color: tier.color}}
      >
        {tier.name}
      </span>
      <span className="font-[Bangers] text-[11px] text-[#666] tracking-wide mt-0.5">
        {strikeText}
      </span>
    </button>
  );
}
