import type { AssertionDomain, CrAssertionRow, Domain, SessionRow } from '../../types';
import type { Gap } from '../analysis/analysis.types';
import type { SessionCoverage } from '../session/session.types';

/** [EXP-01] Formats d'export. `pdf` est prévu en Phase 3 (refusé en Phase 1). */
export type ExportFormat = 'markdown' | 'docx' | 'pdf';

/**
 * Fonction de hachage SHA-256 injectée (expo-crypto côté app, node:crypto en
 * test). Entrée : contenu texte ; sortie : empreinte hexadécimale minuscule.
 */
export type Sha256Hasher = (content: string) => Promise<string>;

/** Données consolidées du CR, prêtes au rendu (template 11.3). */
export interface CrData {
  session: SessionRow;
  domains: Domain[];
  coverage: SessionCoverage;
  /** Assertions validées uniquement [INVARIANT-02], groupées par domaine. */
  assertions_by_domain: Partial<Record<AssertionDomain, CrAssertionRow[]>>;
  gaps_by_domain: Partial<Record<Domain, Gap[]>>;
  /** [ANAL-05] Points de suivi — vide en Phase 1 (génération LLM en Phase 2). */
  follow_ups: string[];
  /** Horodatage ISO 8601 de génération [EXP-03]. */
  generated_at_iso: string;
  app_version: string;
}

/** Résultat d'un export [EXP-03]. */
export interface ExportResult {
  format: ExportFormat;
  filename: string;
  /** Markdown : contenu texte. DOCX : contenu base64. */
  content: string;
  encoding: 'utf8' | 'base64';
  hash_sha256: string;
}
