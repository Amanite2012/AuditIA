/**
 * Module 2 — Entretien guidé (CDC section 2.3), hors UI.
 *
 * - [ENT-09] statut d'item persisté immédiatement
 * - [ENT-05] notes manuelles en parallèle
 * - [ENT-06] couverture temps réel (thèmes couverts / objectif)
 * - [REL-01] autosave atomique 30s, [REL-02] reprise après crash,
 *   [REL-03] écritures transactionnelles
 */
import type { DbClient } from '../../db/db.client';
import type { Domain, InterviewItemRow, ItemStatus, KnowledgeBaseQuestion, SessionRow } from '../../types';
import { generateUuidV4 } from '../../utils/ids';
import { loadKnowledgeBase } from '../briefing/briefing.service';
import type { PendingAnswer, SessionCoverage } from './session.types';

/** [REL-01] Période d'autosave imposée pendant une session active. */
export const AUTOSAVE_INTERVAL_MS = 30_000;

/** Identifiant réservé des notes manuelles libres [ENT-05]. */
export const MANUAL_NOTE_QUESTION_ID = 'manual_note';

/** Passe la session en cours d'entretien. */
export async function startSession(db: DbClient, sessionId: string): Promise<void> {
  await db.runAsync(`UPDATE sessions SET status = 'in_progress', updated_at = ? WHERE id = ?`, [
    Date.now(),
    sessionId,
  ]);
}

/** Clôture l'entretien (avant analyse post-session). */
export async function completeSession(db: DbClient, sessionId: string): Promise<void> {
  await db.runAsync(`UPDATE sessions SET status = 'completed', updated_at = ? WHERE id = ?`, [Date.now(), sessionId]);
}

/** Retourne une session par id. */
export async function getSession(db: DbClient, sessionId: string): Promise<SessionRow | null> {
  return db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [sessionId]);
}

/** Liste les sessions, plus récentes en premier (écran historique). */
export async function listSessions(db: DbClient): Promise<SessionRow[]> {
  return db.getAllAsync<SessionRow>('SELECT * FROM sessions ORDER BY created_at DESC');
}

/**
 * [REL-02] Reprise après crash : retourne la session laissée en `in_progress`
 * la plus récente, à rouvrir au redémarrage.
 */
export async function resumeInterruptedSession(db: DbClient): Promise<SessionRow | null> {
  return db.getFirstAsync<SessionRow>(
    `SELECT * FROM sessions WHERE status = 'in_progress' ORDER BY updated_at DESC LIMIT 1`
  );
}

/** Items de la session dans l'ordre de l'arbre (ordre d'insertion). */
export async function getItems(db: DbClient, sessionId: string): Promise<InterviewItemRow[]> {
  return db.getAllAsync<InterviewItemRow>('SELECT * FROM interview_items WHERE session_id = ? ORDER BY rowid', [
    sessionId,
  ]);
}

/**
 * [ENT-09] Marque un item `couvert` | `a_approfondir` | `non_obtenu` (ou
 * `skipped`/`pending`). Persisté immédiatement, sans étape intermédiaire.
 */
export async function setItemStatus(db: DbClient, itemId: string, status: ItemStatus): Promise<void> {
  await db.runAsync('UPDATE interview_items SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    Date.now(),
    itemId,
  ]);
}

/** [ENT-05] Met à jour la note/réponse attachée à une question. */
export async function updateItemAnswer(db: DbClient, itemId: string, answerText: string): Promise<void> {
  await db.runAsync('UPDATE interview_items SET answer_text = ?, updated_at = ? WHERE id = ?', [
    answerText,
    Date.now(),
    itemId,
  ]);
}

/**
 * [ENT-05] Ajoute une note manuelle libre, hors arbre de questions.
 * Les notes manuelles ne comptent ni dans la couverture ni dans les gaps.
 */
export async function addManualNote(db: DbClient, sessionId: string, text: string): Promise<InterviewItemRow> {
  const now = Date.now();
  const item: InterviewItemRow = {
    id: generateUuidV4(),
    session_id: sessionId,
    question_id: MANUAL_NOTE_QUESTION_ID,
    question_text: 'Note manuelle',
    answer_text: text,
    is_manual: 1,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  await db.runAsync(
    `INSERT INTO interview_items (id, session_id, question_id, question_text, answer_text, is_manual, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 'pending', ?, ?)`,
    [item.id, item.session_id, item.question_id, item.question_text, text, now, now]
  );
  return item;
}

/**
 * [REL-01] Autosave atomique : vide le buffer de réponses en cours de saisie
 * et rafraîchit `updated_at` de la session, en une seule transaction [REL-03].
 */
export async function autosaveSession(db: DbClient, sessionId: string, pending: PendingAnswer[]): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const answer of pending) {
      await db.runAsync('UPDATE interview_items SET answer_text = ?, updated_at = ? WHERE id = ?', [
        answer.answer_text,
        now,
        answer.item_id,
      ]);
    }
    await db.runAsync('UPDATE sessions SET updated_at = ? WHERE id = ?', [now, sessionId]);
  });
}

/**
 * [ENT-06] / [ANAL-01] Couverture par thèmes : un thème est couvert dès
 * qu'au moins un de ses items est marqué `couvert`. Les notes manuelles
 * (is_manual = 1) sont exclues du calcul.
 */
export async function computeCoverage(
  db: DbClient,
  sessionId: string,
  knowledgeBase: KnowledgeBaseQuestion[] = loadKnowledgeBase()
): Promise<SessionCoverage> {
  const items = await db.getAllAsync<Pick<InterviewItemRow, 'question_id' | 'status' | 'is_manual'>>(
    'SELECT question_id, status, is_manual FROM interview_items WHERE session_id = ?',
    [sessionId]
  );
  const questionById = new Map(knowledgeBase.map((q) => [q.id, q]));

  const totalByDomain = new Map<Domain, Set<string>>();
  const coveredByDomain = new Map<Domain, Set<string>>();

  for (const item of items) {
    if (item.is_manual === 1) continue;
    const question = questionById.get(item.question_id);
    if (!question) continue;
    if (!totalByDomain.has(question.domain)) {
      totalByDomain.set(question.domain, new Set());
      coveredByDomain.set(question.domain, new Set());
    }
    totalByDomain.get(question.domain)?.add(question.theme);
    if (item.status === 'couvert') {
      coveredByDomain.get(question.domain)?.add(question.theme);
    }
  }

  const byDomain: SessionCoverage['by_domain'] = {};
  let covered = 0;
  let total = 0;
  for (const [domain, themes] of totalByDomain) {
    const coveredThemes = coveredByDomain.get(domain)?.size ?? 0;
    byDomain[domain] = {
      covered_themes: coveredThemes,
      total_themes: themes.size,
      percent: themes.size === 0 ? 100 : Math.round((coveredThemes / themes.size) * 100),
    };
    covered += coveredThemes;
    total += themes.size;
  }

  return {
    covered_themes: covered,
    total_themes: total,
    percent: total === 0 ? 100 : Math.round((covered / total) * 100),
    by_domain: byDomain,
  };
}

/**
 * Suppression définitive et immédiate (section 6.2 : pas de corbeille).
 * Les consentements sont supprimés explicitement (pas de cascade sur cette FK).
 */
export async function deleteSession(db: DbClient, sessionId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM consents WHERE session_id = ?', [sessionId]);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
  });
}
