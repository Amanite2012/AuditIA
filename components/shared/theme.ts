/**
 * Design tokens — CDC section 7.
 * [DESIGN-01] invisible-first : thème sombre discret par défaut.
 * Section 7.4 : aucune taille de police < 16sp, contrastes WCAG AA.
 */
export const colors = {
  background: '#0F1115',
  surface: '#1A1D23',
  surfaceRaised: '#232730',
  border: '#333947',
  text: '#F2F4F8', // contraste ~15:1 sur background
  textMuted: '#A9B1C0', // contraste ~7.5:1 sur background
  accent: '#6EA8FE',
  success: '#4ECB8D',
  warning: '#F5B759',
  danger: '#F2705F',
  recording: '#F2705F',
} as const;

/** Section 7.4 : minimum absolu 16sp. */
export const fontSizes = {
  body: 16,
  emphasis: 18,
  large: 20,
  title: 24,
} as const;

/** Tailles en mode haute visibilité (texte 20sp+). */
export const fontSizesHighVisibility = {
  body: 20,
  emphasis: 22,
  large: 24,
  title: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** [UX-CRIT-01] Hauteur minimale des cibles tactiles en zone de pouce. */
export const touchTargetMinHeight = 48;
