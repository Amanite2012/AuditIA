/**
 * Client LLM — couche IA, isolation stricte [DECISION-03] : aucun accès base.
 *
 * Phase 1 : l'intégration llama.cpp n'est pas livrée ; le client déclare le
 * mode `none` et l'application fonctionne en arbre statique [DECISION-05].
 * La sélection de modèle selon la RAM (section 5.2) est implémentée en pur
 * pour la Phase 2.
 */
import type { LlmMode } from '../../types';
import type { LlmAvailability } from './llm.types';

/**
 * Table de sélection du modèle selon la RAM disponible (Go) — section 5.2.
 * [DECISION-06] Modèle cible par défaut : Phi-3 Mini 3.8B Q4_K_M.
 */
export function selectModelForRam(availableRamGb: number): LlmAvailability {
  if (availableRamGb >= 6) return { mode: 'full', model: 'mistral-7b-instruct-q4_k_m' };
  if (availableRamGb >= 3.5) return { mode: 'full', model: 'phi-3-mini-3.8b-q4_k_m' };
  if (availableRamGb >= 2.5) return { mode: 'degraded', model: 'gemma-2b-instruct-q4_k_m' };
  return { mode: 'none', model: null };
}

/**
 * Disponibilité effective du LLM pour ce build.
 * Phase 1 : toujours `none` (pas de runtime llama.cpp embarqué). L'UI MUST
 * afficher le mode actif en permanence [DECISION-05].
 */
export function getLlmAvailability(): LlmAvailability {
  return { mode: 'none', model: null };
}

/** Mode LLM courant, à persister dans sessions.llm_mode. */
export function getCurrentLlmMode(): LlmMode {
  return getLlmAvailability().mode;
}
