/**
 * Tests [DECISION-07] — filtrage de confiance interne (préfigure ACC-10).
 */
import { DEFAULT_CONFIDENCE_THRESHOLD, filterByConfidence } from './confidence.filter';

describe('[DECISION-07] filterByConfidence', () => {
  const suggestions = [
    { value: 'sous le seuil', confidence: 0.59 },
    { value: 'au seuil', confidence: 0.6 },
    { value: 'au-dessus du seuil', confidence: 0.95 },
  ];

  it('le seuil par défaut est 0.6', () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.6);
  });

  it('masque les suggestions sous le seuil (soit visible, soit invisible)', () => {
    expect(filterByConfidence(suggestions)).toEqual(['au seuil', 'au-dessus du seuil']);
  });

  it('la métrique de confiance ne fuit pas dans le résultat (MUST NOT être exposée)', () => {
    const visible = filterByConfidence(suggestions);
    expect(visible.every((v) => typeof v === 'string')).toBe(true);
  });

  it('accepte un seuil explicite', () => {
    expect(filterByConfidence(suggestions, 0.9)).toEqual(['au-dessus du seuil']);
  });
});
