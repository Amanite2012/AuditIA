import type { AssertionDomain, Domain } from '../../types';

/** Motif pour lequel un item constitue un gap [ANAL-02]. */
export type GapReason = 'non_aborde' | 'a_approfondir' | 'non_obtenu';

/** Gap de couverture identifié en fin de session [ANAL-02]. */
export interface Gap {
  domain: Domain;
  theme: string;
  question_id: string;
  question_text: string;
  reason: GapReason;
}

/** Saisie d'une assertion de CR (Phase 1 : saisie manuelle) [ANAL-04]. */
export interface AssertionInput {
  domain: AssertionDomain;
  text: string;
}

/** État du verrou d'export [INVARIANT-02] / ACC-02. */
export interface ExportGate {
  /** true uniquement si aucune assertion n'a validated_by_user = 0. */
  allowed: boolean;
  pending_count: number;
  total_count: number;
}
