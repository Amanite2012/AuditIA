/**
 * Store Zustand — session d'entretien active.
 * Orchestration UI uniquement : toute la logique métier vit dans /features
 * [DECISION-03]. Les écritures passent par les services (persistance
 * immédiate [ENT-09], autosave [REL-01]).
 */
import { create } from 'zustand';

import { getCurrentLlmMode } from '../ai/llm/llm.client';
import type { DbClient } from '../db/db.client';
import { buildQuestionTree, createSession, loadKnowledgeBase } from '../features/briefing/briefing.service';
import type { SessionConfigInput, TreeQuestion } from '../features/briefing/briefing.types';
import {
  addManualNote,
  autosaveSession,
  completeSession,
  computeCoverage,
  getItems,
  setItemStatus,
  startSession,
  updateItemAnswer,
} from '../features/session/session.service';
import type { SessionCoverage } from '../features/session/session.types';
import type { Domain, InterviewItemRow, ItemStatus, SessionConfig, SessionRow } from '../types';

interface SessionState {
  db: DbClient | null;
  config: SessionConfig | null;
  /** Items non manuels, dans l'ordre de l'arbre. */
  items: InterviewItemRow[];
  /** Métadonnées de l'arbre par question_id (relances, condition parente). */
  questionMeta: Record<string, TreeQuestion>;
  currentIndex: number;
  coverage: SessionCoverage | null;
  /** Buffer de réponses en cours de saisie, vidé par l'autosave [REL-01]. */
  pendingAnswers: Record<string, string>;
  sessionStartedAt: number | null;

  initDb: (db: DbClient) => void;
  startNewSession: (input: SessionConfigInput) => Promise<void>;
  resumeSession: (session: SessionRow) => Promise<void>;
  goNext: () => void;
  goPrevious: () => void;
  markStatus: (status: ItemStatus) => Promise<void>;
  setPendingAnswer: (itemId: string, text: string) => void;
  flushAutosave: () => Promise<void>;
  addNote: (text: string) => Promise<void>;
  finishSession: () => Promise<void>;
  refreshCoverage: () => Promise<void>;
  clearSession: () => void;
}

function requireDb(db: DbClient | null): DbClient {
  if (!db) throw new Error('Base de données non initialisée.');
  return db;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  db: null,
  config: null,
  items: [],
  questionMeta: {},
  currentIndex: 0,
  coverage: null,
  pendingAnswers: {},
  sessionStartedAt: null,

  initDb: (db) => set({ db }),

  startNewSession: async (input) => {
    const db = requireDb(get().db);
    const { config, tree } = await createSession(db, input);
    await startSession(db, config.id);
    const items = (await getItems(db, config.id)).filter((i) => i.is_manual === 0);
    const coverage = await computeCoverage(db, config.id);
    set({
      config,
      items,
      questionMeta: Object.fromEntries(tree.questions.map((q) => [q.id, q])),
      currentIndex: 0,
      coverage,
      pendingAnswers: {},
      sessionStartedAt: Date.now(),
    });
  },

  resumeSession: async (session) => {
    const db = requireDb(get().db);
    const config: SessionConfig = {
      id: session.id,
      created_at: session.created_at,
      mission_type: session.mission_type,
      app_name: session.app_name,
      app_type: session.app_type,
      interlocutor: session.interlocutor,
      domains: JSON.parse(session.domains) as Domain[],
      duration_min: session.duration_min,
      llm_mode: getCurrentLlmMode(),
    };
    if (session.status === 'draft' || session.status === 'in_progress') {
      await startSession(db, session.id);
    }
    const tree = buildQuestionTree(config, loadKnowledgeBase());
    const items = (await getItems(db, session.id)).filter((i) => i.is_manual === 0);
    const firstPending = items.findIndex((i) => i.status === 'pending');
    const coverage = await computeCoverage(db, session.id);
    set({
      config,
      items,
      questionMeta: Object.fromEntries(tree.questions.map((q) => [q.id, q])),
      currentIndex: firstPending >= 0 ? firstPending : 0,
      coverage,
      pendingAnswers: {},
      sessionStartedAt: Date.now(),
    });
  },

  // [ENT-02] Navigation dans l'arbre. [ENT-01] : passer une question est
  // toujours possible, sans autre action.
  goNext: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) set({ currentIndex: currentIndex + 1 });
  },
  goPrevious: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  // [ENT-09] Statut persisté immédiatement, puis couverture rafraîchie [ENT-06].
  markStatus: async (status) => {
    const { db, items, currentIndex, config, pendingAnswers } = get();
    const client = requireDb(db);
    const item = items[currentIndex];
    if (!item || !config) return;
    const pendingText = pendingAnswers[item.id];
    if (pendingText !== undefined) {
      await updateItemAnswer(client, item.id, pendingText);
    }
    await setItemStatus(client, item.id, status);
    const refreshed = (await getItems(client, config.id)).filter((i) => i.is_manual === 0);
    const coverage = await computeCoverage(client, config.id);
    const nextIndex = currentIndex < refreshed.length - 1 ? currentIndex + 1 : currentIndex;
    set({ items: refreshed, coverage, currentIndex: nextIndex });
  },

  // [ENT-05] Saisie de notes bufferisée, persistée par l'autosave [REL-01].
  setPendingAnswer: (itemId, text) =>
    set((state) => ({ pendingAnswers: { ...state.pendingAnswers, [itemId]: text } })),

  flushAutosave: async () => {
    const { db, config, pendingAnswers } = get();
    if (!db || !config) return;
    const pending = Object.entries(pendingAnswers).map(([item_id, answer_text]) => ({ item_id, answer_text }));
    await autosaveSession(db, config.id, pending);
  },

  addNote: async (text) => {
    const { db, config } = get();
    if (!db || !config || text.trim().length === 0) return;
    await addManualNote(db, config.id, text.trim());
  },

  finishSession: async () => {
    const { db, config } = get();
    if (!db || !config) return;
    await get().flushAutosave();
    await completeSession(db, config.id);
  },

  refreshCoverage: async () => {
    const { db, config } = get();
    if (!db || !config) return;
    set({ coverage: await computeCoverage(db, config.id) });
  },

  clearSession: () =>
    set({
      config: null,
      items: [],
      questionMeta: {},
      currentIndex: 0,
      coverage: null,
      pendingAnswers: {},
      sessionStartedAt: null,
    }),
}));
