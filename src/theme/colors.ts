/**
 * Basic Clean Studio Theme Palette (Non-Neon, Neutral Dark Mode)
 */
export const Colors = {
  // Backgrounds
  black: '#0A0A0A',
  defaultBackground: '#0A0A0A',
  night: '#121212',
  secondaryBackground: '#141414',
  bottomNavBackground: '#181818',
  secondaryButton: '#222222',
  textInputBackground: '#181818',
  codGray: '#1C1C1C',
  mineShaft: '#202020',
  nero: '#222222',
  oil: '#262626',

  // Surfaces & Dividers
  charcoal: '#2E2E2E',
  seekBarTrace: '#333333',
  muteButtonBackground: '#262626',
  accentSecondary: '#333333',
  graphite: '#383838',
  textInputDivider: '#333333',
  tundora: '#444444',
  border: '#282828',
  borderActive: '#FFFFFF',

  // Text & Icons
  white: '#FFFFFF',
  primaryText: '#FFFFFF',
  taskTitleAvailable: '#FFFFFF',
  cloud: '#A1A1AA',
  ternaryText: '#A1A1AA',
  textDescription: '#A1A1AA',
  silverChalice: '#888888',
  smoke: '#666666',
  secondaryText: '#71717A',
  textDisabled: '#52525B',

  // Basic Clean Accent (White & Neutral Studio Silver - No Neon)
  acqua: '#FFFFFF',
  accent: '#FFFFFF',
  primaryButton: '#FFFFFF',
  primaryButtonPressed: '#E4E4E7',
  ocean: '#D4D4D8',
  primaryButtonText: '#000000',
  primaryDarkBlue: '#242424',
  accentTernary: '#2C2C2C',

  // Status & Subtle Accents
  mint: '#E4E4E7',
  positiveRateButton: '#FFFFFF',
  red: '#EF4444',
  redAlert: '#EF4444',
  systemError: '#EF4444',
  warning: '#EAB308',
  starship: '#EAB308',

  // Overlays
  overlayDark: 'rgba(0, 0, 0, 0.85)',
  overlaySheet: 'rgba(0, 0, 0, 0.75)',
  acquaAlpha15: 'rgba(255, 255, 255, 0.12)',
  acquaAlpha25: 'rgba(255, 255, 255, 0.20)',
  mintAlpha15: 'rgba(255, 255, 255, 0.10)',
  redAlpha15: 'rgba(239, 68, 68, 0.15)',
} as const;

export const Fonts = {
  regular: 'Geomanist-Regular',
  book: 'Geomanist-Book',
  medium: 'Geomanist-Medium',
  bold: 'Geomanist-Bold',
} as const;
