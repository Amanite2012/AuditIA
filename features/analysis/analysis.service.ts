/**
 * Module 3 — Analyse post-session (CDC section 2.4).
 *
 * - [ANAL-01] couverture finale par domaine ITGC
 * - [ANAL-02] liste des gaps (thèmes non abordés, à approfondir, non obtenus)
 * - [ANAL-04] / [INVARIANT-02] validation Human-in-the-Loop des assertions :
 *   aucune assertion ne peut atteindre l'export sans validated_by_user = 1.
 *   Phase 1 : assertions saisies manuellement (ai_generated = 0).
 */
import type { DbClient } from '../../db/db.client';
import type { CrAssertionRow, InterviewItemRow, KnowledgeBaseQuestion } from '../../types';
import { generateUuidV4 } from '../../utils/ids';
import { loadKnowledgeBase } from '../briefing/briefing.service';
import { computeCoverage } from '../session/session.service';
import type { SessionCoverage } from '../session/session.types';
import type { AssertionInput, ExportGate, Gap, GapReason } from './analysis.types';

/** [ANAL-01] Couverture finale : thèmes couverts / total prévu, par domaine. */
export async function getFinalCoverage(
  db: DbClient,
  sessionId: string,
  knowledgeBase: KnowledgeBaseQuestion[] = loadKnowledgeBase()
): Promise<SessionCoverage> {
  return computeCoverage(db, sessionId, knowledgeBase);
}

const GAP_REASON_BY_STATUS: Partial<Record<InterviewItemRow['status'], GapReason>> = {
  pending: 'non_aborde',
  skipped: 'non_aborde',
  a_approfondir: 'a_approfondir',
  non_obtenu: 'non_obtenu',
};

/**
 * [ANAL-02] Gaps : thèmes non abordés (items `pending`/`skipped`) + items
 * marqués `a_approfondir` ou `non_obtenu` [ENT-09]. Les notes manuelles sont
 * exclues. Résultat ordonné par domaine puis par question.
 */
export async function listGaps(
  db: DbClient,
  sessionId: string,
  knowledgeBase: KnowledgeBaseQuestion[] = loadKnowledgeBase()
): Promise<Gap[]> {
  const items = await db.getAllAsync<InterviewItemRow>(
    `SELECT * FROM interview_items WHERE session_id = ? AND is_manual = 0 AND status != 'couvert' ORDER BY rowid`,
    [sessionId]
  );
  const questionById = new Map(knowledgeBase.map((q) => [q.id, q]));
  const gaps: Gap[] = [];
  for (const item of items) {
    const reason = GAP_REASON_BY_STATUS[item.status];
    const question = questionById.get(item.question_id);
    if (!reason || !question) continue;
    gaps.push({
      domain: question.domain,
      theme: question.theme,
      question_id: item.question_id,
      question_text: item.question_text,
      reason,
    });
  }
  return gaps;
}

/**
 * [ANAL-04] Ajoute une assertion de CR. Elle naît TOUJOURS non validée
 * (validated_by_user = 0), y compris saisie manuellement : la validation est
 * une action explicite et tracée [INVARIANT-02].
 */
export async function addAssertion(
  db: DbClient,
  sessionId: string,
  input: AssertionInput,
  options: { aiGenerated?: boolean } = {}
): Promise<CrAssertionRow> {
  const now = Date.now();
  const row: CrAssertionRow = {
    id: generateUuidV4(),
    session_id: sessionId,
    domain: input.domain,
    assertion_text: input.text,
    ai_generated: options.aiGenerated ? 1 : 0,
    validated_by_user: 0,
    user_modified_text: null,
    created_at: now,
    validated_at: null,
  };
  await db.runAsync(
    `INSERT INTO cr_assertions (id, session_id, domain, assertion_text, ai_generated, validated_by_user, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [row.id, row.session_id, row.domain, row.assertion_text, row.ai_generated, row.created_at]
  );
  return row;
}

/** Assertions de la session, dans l'ordre de création. */
export async function listAssertions(db: DbClient, sessionId: string): Promise<CrAssertionRow[]> {
  return db.getAllAsync<CrAssertionRow>('SELECT * FROM cr_assertions WHERE session_id = ? ORDER BY rowid', [
    sessionId,
  ]);
}

/** [ANAL-04] Action `Valider` : validation humaine explicite et horodatée. */
export async function validateAssertion(db: DbClient, assertionId: string): Promise<void> {
  await db.runAsync('UPDATE cr_assertions SET validated_by_user = 1, validated_at = ? WHERE id = ?', [
    Date.now(),
    assertionId,
  ]);
}

/**
 * [ANAL-04] Action `Modifier` : le texte corrigé est enregistré dans
 * user_modified_text. La modification est une action humaine explicite sur le
 * contenu : elle vaut validation (validated_by_user = 1, horodatée), le texte
 * d'origine restant tracé dans assertion_text.
 */
export async function modifyAssertion(db: DbClient, assertionId: string, newText: string): Promise<void> {
  await db.runAsync(
    'UPDATE cr_assertions SET user_modified_text = ?, validated_by_user = 1, validated_at = ? WHERE id = ?',
    [newText, Date.now(), assertionId]
  );
}

/** [ANAL-04] Action `Supprimer` : suppression définitive de l'assertion. */
export async function deleteAssertion(db: DbClient, assertionId: string): Promise<void> {
  await db.runAsync('DELETE FROM cr_assertions WHERE id = ?', [assertionId]);
}

/** Texte à inclure au CR : version modifiée par l'utilisateur si présente. */
export function getEffectiveAssertionText(assertion: CrAssertionRow): string {
  return assertion.user_modified_text ?? assertion.assertion_text;
}

/**
 * ACC-02 / [INVARIANT-02] Verrou d'export : interdit tant qu'au moins une
 * assertion a validated_by_user = 0. Le bouton d'export de l'UI MUST refléter
 * `allowed`.
 */
export async function getExportGate(db: DbClient, sessionId: string): Promise<ExportGate> {
  const counts = await db.getFirstAsync<{ total: number; pending: number }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN validated_by_user = 0 THEN 1 ELSE 0 END) as pending
     FROM cr_assertions WHERE session_id = ?`,
    [sessionId]
  );
  const total = counts?.total ?? 0;
  const pending = counts?.pending ?? 0;
  return { allowed: pending === 0, pending_count: pending, total_count: total };
}
