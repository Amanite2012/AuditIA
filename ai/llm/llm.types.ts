import type { AssertionDomain, Domain, LlmMode } from '../../types';

/** Sortie structurée de PROMPT_GAP_ANALYSIS (section 5.4). */
export interface LlmGapAnalysisOutput {
  gaps: {
    domain: Domain;
    theme: string;
    suggested_question: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/** Sortie structurée de PROMPT_SUMMARY (section 5.4). */
export interface LlmSummaryOutput {
  assertions: {
    domain: AssertionDomain;
    text: string;
  }[];
}

/** Suggestion accompagnée de sa confiance interne [DECISION-07]. */
export interface ScoredSuggestion<T> {
  value: T;
  /** Confiance interne 0..1 — MUST NOT être exposée à l'utilisateur. */
  confidence: number;
}

/** État de disponibilité du LLM embarqué [DECISION-05], section 5.2. */
export interface LlmAvailability {
  mode: LlmMode;
  /** Modèle sélectionné (null en mode `none`). */
  model: 'mistral-7b-instruct-q4_k_m' | 'phi-3-mini-3.8b-q4_k_m' | 'gemma-2b-instruct-q4_k_m' | null;
}
