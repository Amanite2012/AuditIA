/**
 * Design tokens « Ledger » — CDC section 7.
 * [DESIGN-01] invisible-first : encre chaude sombre, ivoire, filets fins.
 * Identité : cabinet d'audit premium — accent bordeaux/claret, titres serif —
 * sans reprendre les couleurs des Big4 (ni vert, ni orange, ni jaune, ni bleu).
 *
 * Statuts validés (scripts dataviz, surface #15161A) : bande de luminance,
 * plancher de chroma, séparation CVD toutes paires ≥ 12, contraste ≥ 3:1.
 * Les teintes `*Text` (≥ 4,5:1) sont réservées aux libellés ; les teintes de
 * base servent de marques (bordures, jauges). Un statut n'est jamais porté par
 * la couleur seule : toujours accompagné d'un libellé.
 */
export const colors = {
  background: '#15161A', // encre
  surface: '#1C1E23',
  surfaceRaised: '#25272E',
  border: '#363943',
  hairline: '#2A2C33',
  text: '#ECE9E1', // ivoire — 14,9:1 sur fond
  textMuted: '#A5A198', // 7:1 sur fond
  accent: '#7E3348', // claret — remplissages (ivoire dessus : 7:1)
  onAccent: '#F4EFE7',
  accentText: '#D56C97', // rose — texte actif, liens, jauge (5,5:1)
  success: '#0C8870', // marques uniquement
  successText: '#20A388', // libellés (5,7:1)
  warning: '#C08428',
  warningText: '#D89A55', // 7,5:1
  danger: '#CE4F36',
  dangerText: '#DE7A62', // 6:1
  recording: '#DE7A62',
} as const;

/** Familles typographiques (Android : Noto Serif / Roboto). */
export const fonts = {
  display: 'serif', // titres — registre rapport annuel
  text: 'sans-serif',
  medium: 'sans-serif-medium',
} as const;

/** Section 7.4 : minimum absolu 16sp. */
export const fontSizes = {
  body: 16,
  emphasis: 18,
  large: 22,
  title: 26,
} as const;

/** Tailles en mode haute visibilité (texte 20sp+). */
export const fontSizesHighVisibility = {
  body: 20,
  emphasis: 22,
  large: 26,
  title: 30,
} as const;

/** Interlettrage des libellés « eyebrow » (majuscules). */
export const eyebrowLetterSpacing = 1.4;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

/** [UX-CRIT-01] Hauteur minimale des cibles tactiles en zone de pouce. */
export const touchTargetMinHeight = 52;
