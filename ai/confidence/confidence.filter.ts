/**
 * Filtrage de confiance interne [DECISION-07] (intégré au flux LLM en Phase 2).
 *
 * La métrique de confiance est utilisée EN INTERNE UNIQUEMENT : une suggestion
 * est soit visible, soit invisible. Elle MUST NOT être exposée à l'utilisateur
 * (pas de jauge, pas de pourcentage, pas d'icône) — c'est pourquoi ce filtre
 * retire la métrique des objets retournés.
 */
import type { ScoredSuggestion } from '../llm/llm.types';

/** Seuil par défaut imposé par [DECISION-07] (ACC-10). */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Ne conserve que les suggestions dont la confiance atteint le seuil, et
 * retourne les valeurs SANS leur métrique de confiance.
 */
export function filterByConfidence<T>(
  suggestions: ScoredSuggestion<T>[],
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): T[] {
  return suggestions.filter((s) => s.confidence >= threshold).map((s) => s.value);
}
