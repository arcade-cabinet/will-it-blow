import type {Ingredient} from './Ingredients';

export function calculateBlowRuffalos(holdDurationSec: number, ingredients: Ingredient[]): number {
  const avgBlow = ingredients.reduce((a, i) => a + i.blowPower, 0) / ingredients.length;
  const dur = Math.min(holdDurationSec, 3);
  const pow = Math.min((dur / 3) * avgBlow + Math.random() * 1.5, 5);
  return Math.round(Math.max(0, Math.min(5, pow)));
}

export function checkBurst(ingredients: Ingredient[]): boolean {
  const avgRisk = ingredients.reduce((a, i) => a + i.burstRisk, 0) / ingredients.length;
  return Math.random() < avgRisk;
}

export function calculateTasteRating(ingredients: Ingredient[], hasBurst: boolean): number {
  const avgTaste = ingredients.reduce((a, i) => a + i.tasteMod, 0) / ingredients.length;
  const avgTexture = ingredients.reduce((a, i) => a + i.textureMod, 0) / ingredients.length;
  let base = avgTaste * 0.6 + avgTexture * 0.4;
  if (hasBurst) base -= 0.5;
  base += (Math.random() - 0.5) * 1.5;
  return Math.round(Math.max(0, Math.min(5, base)));
}

export function calculateFinalScore(
  sausageRating: number,
  ruffalos: number,
  hasBurst: boolean,
  bonusPoints: number,
): number {
  const tasteScore = (sausageRating / 5) * 60;
  const blowScore = (ruffalos / 5) * 20;
  const burstBonus = hasBurst ? 0 : 20;
  return Math.min(Math.round(tasteScore + blowScore + burstBonus + bonusPoints), 100);
}

export function getTitleTier(score: number): string {
  const tiers = [
    'Sausage Disaster',
    'Sausage Apprentice',
    'Sausage Maker',
    'Sausage Chef',
    'Sausage Master',
    'THE SAUSAGE KING',
  ];
  return tiers[Math.min(Math.floor(score / 20), 5)];
}
