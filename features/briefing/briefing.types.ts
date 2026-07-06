import type { KnowledgeBaseQuestion, SessionConfig } from '../../types';

/** Saisie brute du formulaire de briefing, avant validation [BRIEF-01..05]. */
export type SessionConfigInput = Partial<
  Pick<SessionConfig, 'mission_type' | 'app_name' | 'app_type' | 'interlocutor' | 'domains' | 'duration_min'>
>;

/** Champs contrôlés par la validation de briefing. */
export type BriefingField = 'mission_type' | 'domains' | 'app_name' | 'app_type' | 'interlocutor' | 'duration_min';

/** Erreur de validation d'un champ de briefing. */
export interface BriefingValidationError {
  field: BriefingField;
  spec: 'BRIEF-01' | 'BRIEF-02' | 'BRIEF-03' | 'BRIEF-04' | 'BRIEF-05';
  message: string;
}

/** Résultat de la validation du référentiel de questions [BRIEF-06] / ACC-08. */
export interface KnowledgeBaseValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Arbre décisionnel initialisé : liste ordonnée (parcours en profondeur,
 * enfants après leur parent) des questions applicables à la session.
 */
export interface QuestionTree {
  questions: TreeQuestion[];
}

/** Question de l'arbre, enrichie de sa relation parent éventuelle. */
export interface TreeQuestion extends KnowledgeBaseQuestion {
  /** Renseigné si la question est issue d'un lien `children` (condition parente). */
  parent?: {
    question_id: string;
    condition: string;
  };
}
