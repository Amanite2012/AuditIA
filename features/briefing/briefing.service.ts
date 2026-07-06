/**
 * Module 1 — Briefing pré-session (CDC section 2.2).
 *
 * Valide la configuration [BRIEF-01..05], valide le référentiel de questions
 * contre le schéma 11.1 (ACC-08), construit l'arbre décisionnel filtré et
 * crée la session en base de manière transactionnelle [REL-03].
 */
import type { DbClient } from '../../db/db.client';
import {
  APP_TYPES,
  DOMAINS,
  DURATIONS,
  INTERLOCUTORS,
  MISSION_TYPES,
  type AppType,
  type Domain,
  type DurationMin,
  type InterlocutorType,
  type KnowledgeBaseQuestion,
  type MissionType,
  type SessionConfig,
} from '../../types';
import { generateUuidV4 } from '../../utils/ids';
import type {
  BriefingValidationError,
  KnowledgeBaseValidationResult,
  QuestionTree,
  SessionConfigInput,
  TreeQuestion,
} from './briefing.types';

import accesQuestions from '../../knowledge-base/domains/acces.json';
import changementsQuestions from '../../knowledge-base/domains/changements.json';
import continuiteQuestions from '../../knowledge-base/domains/continuite.json';
import operationsQuestions from '../../knowledge-base/domains/operations.json';

/**
 * Valide les champs obligatoires du briefing [BRIEF-01..05].
 * ACC-01 : la session ne peut pas démarrer si au moins une erreur est retournée.
 */
export function validateSessionConfigInput(input: SessionConfigInput): BriefingValidationError[] {
  const errors: BriefingValidationError[] = [];

  if (!input.mission_type || !MISSION_TYPES.includes(input.mission_type)) {
    errors.push({ field: 'mission_type', spec: 'BRIEF-01', message: 'Le type de mission est obligatoire.' });
  }
  if (!input.domains || input.domains.length === 0 || input.domains.some((d) => !DOMAINS.includes(d))) {
    errors.push({ field: 'domains', spec: 'BRIEF-02', message: 'Au moins un domaine ITGC doit être sélectionné.' });
  }
  if (!input.app_name || input.app_name.trim().length === 0) {
    errors.push({ field: 'app_name', spec: 'BRIEF-03', message: "Le nom de l'application auditée est obligatoire." });
  }
  if (!input.app_type || !APP_TYPES.includes(input.app_type)) {
    errors.push({ field: 'app_type', spec: 'BRIEF-03', message: "Le type d'environnement est obligatoire." });
  }
  if (!input.interlocutor || !INTERLOCUTORS.includes(input.interlocutor)) {
    errors.push({ field: 'interlocutor', spec: 'BRIEF-04', message: "Le profil de l'interlocuteur est obligatoire." });
  }
  if (!input.duration_min || !DURATIONS.includes(input.duration_min)) {
    errors.push({ field: 'duration_min', spec: 'BRIEF-05', message: 'La durée estimée est obligatoire.' });
  }
  return errors;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isEnumArray<T extends string | number>(value: unknown, allowed: readonly T[]): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => (allowed as readonly unknown[]).includes(v));
}

/**
 * Valide un référentiel de questions contre le schéma de la section 11.1
 * (miroir exécutable de /knowledge-base/schema.json).
 * ACC-08 / [BRIEF-06] : un JSON malformé retourne des erreurs explicites,
 * sans jamais lever d'exception.
 */
export function validateKnowledgeBase(data: unknown): KnowledgeBaseValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Le référentiel doit être un tableau de questions.'] };
  }

  const seenIds = new Set<string>();
  const allIds = new Set<string>(
    data.filter(isPlainObject).map((q) => (typeof q.id === 'string' ? q.id : '')).filter(Boolean)
  );

  data.forEach((raw, index) => {
    const at = `questions[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at} : entrée invalide (objet attendu).`);
      return;
    }
    const idPattern = /^(acces|changements|operations|continuite)_[0-9]{3}$/;
    if (!isNonEmptyString(raw.id) || !idPattern.test(raw.id)) {
      errors.push(`${at} : champ "id" absent ou invalide (format attendu : "{domaine}_{index}").`);
    } else if (seenIds.has(raw.id)) {
      errors.push(`${at} : id "${raw.id}" dupliqué.`);
    } else {
      seenIds.add(raw.id);
    }
    if (!isNonEmptyString(raw.domain) || !DOMAINS.includes(raw.domain as Domain)) {
      errors.push(`${at} : champ "domain" absent ou invalide.`);
    } else if (isNonEmptyString(raw.id) && !raw.id.startsWith(`${raw.domain}_`)) {
      errors.push(`${at} : le préfixe de "id" ne correspond pas au domaine "${raw.domain}".`);
    }
    if (!isNonEmptyString(raw.theme)) {
      errors.push(`${at} : champ "theme" absent ou vide.`);
    }
    if (!isNonEmptyString(raw.question_text)) {
      errors.push(`${at} : champ "question_text" absent ou vide.`);
    }
    if (raw.follow_up_questions !== undefined) {
      if (!Array.isArray(raw.follow_up_questions) || raw.follow_up_questions.some((f) => !isNonEmptyString(f))) {
        errors.push(`${at} : "follow_up_questions" doit être un tableau de chaînes non vides.`);
      }
    }
    if (!isPlainObject(raw.applicable_to)) {
      errors.push(`${at} : champ "applicable_to" absent ou invalide.`);
    } else {
      if (!isEnumArray(raw.applicable_to.app_types, APP_TYPES)) {
        errors.push(`${at} : "applicable_to.app_types" absent, vide ou contenant une valeur inconnue.`);
      }
      if (!isEnumArray(raw.applicable_to.interlocutors, INTERLOCUTORS)) {
        errors.push(`${at} : "applicable_to.interlocutors" absent, vide ou contenant une valeur inconnue.`);
      }
      if (!isEnumArray(raw.applicable_to.mission_types, MISSION_TYPES)) {
        errors.push(`${at} : "applicable_to.mission_types" absent, vide ou contenant une valeur inconnue.`);
      }
    }
    if (!isEnumArray(raw.depth_levels, DURATIONS)) {
      errors.push(`${at} : "depth_levels" absent, vide ou contenant une durée inconnue.`);
    }
    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children)) {
        errors.push(`${at} : "children" doit être un tableau.`);
      } else {
        raw.children.forEach((child, childIndex) => {
          if (!isPlainObject(child) || !isNonEmptyString(child.condition) || !isNonEmptyString(child.question_id)) {
            errors.push(`${at}.children[${childIndex}] : "condition" et "question_id" sont obligatoires.`);
          } else if (!allIds.has(child.question_id)) {
            errors.push(`${at}.children[${childIndex}] : référence "${child.question_id}" introuvable dans le référentiel.`);
          }
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Charge le référentiel embarqué (4 domaines ITGC, section 11.1) et le valide.
 * @throws Error si le référentiel embarqué est invalide (défaut de build, pas
 * une condition runtime attendue).
 */
export function loadKnowledgeBase(): KnowledgeBaseQuestion[] {
  const all = [
    ...(accesQuestions as unknown[]),
    ...(changementsQuestions as unknown[]),
    ...(operationsQuestions as unknown[]),
    ...(continuiteQuestions as unknown[]),
  ];
  const result = validateKnowledgeBase(all);
  if (!result.valid) {
    throw new Error(`Référentiel embarqué invalide : ${result.errors.join(' | ')}`);
  }
  return all as KnowledgeBaseQuestion[];
}

interface TreeFilter {
  domains: Domain[];
  app_type: AppType;
  interlocutor: InterlocutorType;
  mission_type: MissionType;
  duration_min: DurationMin;
}

function questionMatches(q: KnowledgeBaseQuestion, filter: TreeFilter): boolean {
  return (
    filter.domains.includes(q.domain) &&
    q.applicable_to.app_types.includes(filter.app_type) &&
    q.applicable_to.interlocutors.includes(filter.interlocutor) &&
    q.applicable_to.mission_types.includes(filter.mission_type) &&
    q.depth_levels.includes(filter.duration_min)
  );
}

/**
 * Construit l'arbre décisionnel initialisé à partir de la configuration de
 * session [BRIEF-05 : la durée conditionne la profondeur via depth_levels].
 *
 * Ordre : domaines dans l'ordre canonique, questions racines dans l'ordre du
 * référentiel, enfants insérés immédiatement après leur parent (profondeur).
 *
 * [CLARIFICATION REQUIRED] Le CDC (11.1) définit `children[].condition` comme
 * une chaîne libre ("réponse parente") sans capture de réponse structurée :
 * la condition n'est donc pas évaluable automatiquement en Phase 1. Choix
 * implémenté, conforme à [ENT-01] (tout est suggestion) : la question enfant
 * est insérée après son parent avec sa condition affichée à l'auditeur, qui
 * décide de la poser ou de la passer.
 */
export function buildQuestionTree(config: SessionConfig, knowledgeBase: KnowledgeBaseQuestion[]): QuestionTree {
  const filter: TreeFilter = {
    domains: config.domains,
    app_type: config.app_type,
    interlocutor: config.interlocutor,
    mission_type: config.mission_type,
    duration_min: config.duration_min,
  };
  const byId = new Map(knowledgeBase.map((q) => [q.id, q]));
  const childIds = new Set(knowledgeBase.flatMap((q) => (q.children ?? []).map((c) => c.question_id)));

  const ordered: TreeQuestion[] = [];
  const visited = new Set<string>();

  const pushWithChildren = (q: KnowledgeBaseQuestion, parent?: TreeQuestion['parent']): void => {
    if (visited.has(q.id) || !questionMatches(q, filter)) return;
    visited.add(q.id);
    ordered.push(parent ? { ...q, parent } : { ...q });
    for (const child of q.children ?? []) {
      const childQuestion = byId.get(child.question_id);
      if (childQuestion) {
        pushWithChildren(childQuestion, { question_id: q.id, condition: child.condition });
      }
    }
  };

  for (const domain of DOMAINS) {
    if (!config.domains.includes(domain)) continue;
    for (const q of knowledgeBase) {
      if (q.domain !== domain || childIds.has(q.id)) continue;
      pushWithChildren(q);
    }
  }
  return { questions: ordered };
}

/**
 * Crée la session en base à partir d'une saisie validée, avec les items
 * d'entretien issus de l'arbre, en une seule transaction [REL-03].
 * ACC-01 : lève une erreur si la validation [BRIEF-01..05] échoue.
 */
export async function createSession(
  db: DbClient,
  input: SessionConfigInput,
  knowledgeBase: KnowledgeBaseQuestion[] = loadKnowledgeBase()
): Promise<{ config: SessionConfig; tree: QuestionTree }> {
  const validationErrors = validateSessionConfigInput(input);
  if (validationErrors.length > 0) {
    throw new Error(`Briefing incomplet : ${validationErrors.map((e) => `[${e.spec}] ${e.message}`).join(' ')}`);
  }
  const now = Date.now();
  const config: SessionConfig = {
    id: generateUuidV4(),
    created_at: now,
    mission_type: input.mission_type as MissionType,
    app_name: (input.app_name as string).trim(),
    app_type: input.app_type as AppType,
    interlocutor: input.interlocutor as InterlocutorType,
    domains: input.domains as Domain[],
    duration_min: input.duration_min as DurationMin,
    llm_mode: 'none', // Phase 1 : arbre statique sans LLM [DECISION-05]
  };
  const tree = buildQuestionTree(config, knowledgeBase);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sessions (id, created_at, updated_at, mission_type, app_name, app_type, interlocutor, domains, duration_min, status, llm_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        config.id,
        config.created_at,
        now,
        config.mission_type,
        config.app_name,
        config.app_type,
        config.interlocutor,
        JSON.stringify(config.domains),
        config.duration_min,
        config.llm_mode,
      ]
    );
    for (const question of tree.questions) {
      await db.runAsync(
        `INSERT INTO interview_items (id, session_id, question_id, question_text, is_manual, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'pending', ?, ?)`,
        [generateUuidV4(), config.id, question.id, question.question_text, now, now]
      );
    }
  });

  return { config, tree };
}
