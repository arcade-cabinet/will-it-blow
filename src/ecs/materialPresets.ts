export const PRESETS = {
  'polished-metal': {type: 'standard', roughness: 0.3, metalness: 0.9},
  'dark-metal': {type: 'standard', roughness: 0.7, metalness: 0.8},
  plastic: {type: 'standard', roughness: 0.6, metalness: 0.0},
  ceramic: {type: 'standard', roughness: 0.4, metalness: 0.1},
  translucent: {type: 'basic', transparent: true, opacity: 0.85},
  invisible: {type: 'basic', visible: false},
} as const;

export type MaterialPreset = keyof typeof PRESETS;
