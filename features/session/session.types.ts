import type { Domain } from '../../types';

/** Couverture d'un périmètre de thèmes [ENT-06], [ANAL-01]. */
export interface CoverageStats {
  covered_themes: number;
  total_themes: number;
  /** Pourcentage entier 0-100 (100 si aucun thème prévu). */
  percent: number;
}

/** Couverture globale + détail par domaine ITGC. */
export interface SessionCoverage extends CoverageStats {
  by_domain: Partial<Record<Domain, CoverageStats>>;
}

/** Réponse en attente d'écriture, bufferisée par l'UI entre deux autosaves [REL-01]. */
export interface PendingAnswer {
  item_id: string;
  answer_text: string;
}
