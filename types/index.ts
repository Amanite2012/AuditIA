/**
 * Types globaux partagés — contrats définis par le CDC v0.3.
 * Références : sections 2.2 [BRIEF-*], 4.4 (schéma DB), 11.1, 11.2.
 */

/** [BRIEF-01] Types de mission autorisés. */
export const MISSION_TYPES = ['audit_annuel', 'controle_interne', 'revue_ciblee', 'autre'] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

/** [BRIEF-02] Domaines ITGC. */
export const DOMAINS = ['acces', 'changements', 'operations', 'continuite'] as const;
export type Domain = (typeof DOMAINS)[number];

/** Domaine étendu pour les assertions CR (schéma 4.4, table cr_assertions). */
export type AssertionDomain = Domain | 'general';

/** Libellés d'affichage des domaines (UI et template CR 11.3). */
export const DOMAIN_LABELS: Record<AssertionDomain, string> = {
  acces: 'Gestion des accès',
  changements: 'Gestion des changements',
  operations: 'Opérations informatiques',
  continuite: "Continuité d'activité",
  general: 'Général',
};

/** [BRIEF-03] Types d'environnement applicatif. */
export const APP_TYPES = ['erp', 'middleware', 'batch', 'saas', 'on_premise', 'autre'] as const;
export type AppType = (typeof APP_TYPES)[number];

/** [BRIEF-04] Profils d'interlocuteur. */
export const INTERLOCUTORS = ['dba', 'infra', 'rssi', 'responsable_applicatif', 'dsi', 'autre'] as const;
export type InterlocutorType = (typeof INTERLOCUTORS)[number];

/** [BRIEF-05] Durées d'entretien autorisées (minutes). */
export const DURATIONS = [30, 45, 60, 90] as const;
export type DurationMin = (typeof DURATIONS)[number];

/** [DECISION-05] Modes LLM. Phase 1 : toujours 'none'. */
export type LlmMode = 'full' | 'degraded' | 'none';

/** Statuts de session (schéma 4.4). */
export type SessionStatus = 'draft' | 'in_progress' | 'completed' | 'exported';

/** [ENT-09] Statuts d'un item d'entretien (+ états techniques du schéma 4.4). */
export type ItemStatus = 'pending' | 'couvert' | 'a_approfondir' | 'non_obtenu' | 'skipped';

/** Contrat SessionConfig — section 11.2. */
export interface SessionConfig {
  id: string; // UUID v4
  created_at: number; // Unix timestamp ms
  mission_type: MissionType;
  app_name: string;
  app_type: AppType;
  interlocutor: InterlocutorType;
  domains: Domain[]; // Au moins 1 élément [BRIEF-02]
  duration_min: DurationMin;
  llm_mode: LlmMode; // Déterminé au runtime
}

/** Schéma du référentiel de questions — section 11.1. */
export interface KnowledgeBaseQuestion {
  id: string; // Format: "{domain}_{index}" ex: "acces_001"
  domain: Domain;
  theme: string;
  question_text: string;
  follow_up_questions?: string[];
  applicable_to: {
    app_types: AppType[];
    interlocutors: InterlocutorType[];
    mission_types: MissionType[];
  };
  depth_levels: DurationMin[];
  children?: {
    condition: string;
    question_id: string;
  }[];
}

/** Ligne de la table sessions (schéma 4.4). */
export interface SessionRow {
  id: string;
  created_at: number;
  updated_at: number;
  mission_type: MissionType;
  app_name: string;
  app_type: AppType;
  interlocutor: InterlocutorType;
  domains: string; // JSON array sérialisé
  duration_min: DurationMin;
  status: SessionStatus;
  llm_mode: LlmMode;
  hash_sha256: string | null;
}

/** Ligne de la table interview_items (schéma 4.4). */
export interface InterviewItemRow {
  id: string;
  session_id: string;
  question_id: string;
  question_text: string;
  answer_text: string | null;
  is_manual: 0 | 1;
  status: ItemStatus;
  created_at: number;
  updated_at: number;
}

/** Ligne de la table cr_assertions (schéma 4.4). [INVARIANT-02] */
export interface CrAssertionRow {
  id: string;
  session_id: string;
  domain: AssertionDomain;
  assertion_text: string;
  ai_generated: 0 | 1;
  validated_by_user: 0 | 1;
  user_modified_text: string | null;
  created_at: number;
  validated_at: number | null;
}

/** Ligne de la table consents (schéma 4.4, RGPD). */
export interface ConsentRow {
  id: string;
  session_id: string;
  type: 'audio_recording' | 'data_retention';
  granted: 0 | 1;
  timestamp: number;
  app_version: string;
}
