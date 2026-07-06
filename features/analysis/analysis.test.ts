/**
 * Tests Module 3 — Analyse post-session : [ANAL-01] [ANAL-02] [ANAL-04],
 * ACC-02 et [INVARIANT-02].
 */
import { createSession } from '../briefing/briefing.service';
import type { SessionConfigInput } from '../briefing/briefing.types';
import { getItems, setItemStatus } from '../session/session.service';
import { createTestDb, type TestDb } from '../testing/test-db';
import {
  addAssertion,
  deleteAssertion,
  getEffectiveAssertionText,
  getExportGate,
  getFinalCoverage,
  listAssertions,
  listGaps,
  modifyAssertion,
  validateAssertion,
} from './analysis.service';

const INPUT: SessionConfigInput = {
  mission_type: 'controle_interne',
  app_name: 'Oracle EBS',
  app_type: 'erp',
  interlocutor: 'dsi',
  domains: ['acces', 'continuite'],
  duration_min: 45,
};

describe('[ANAL-01] Couverture finale par domaine', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('détaille couvert / total pour chaque domaine ITGC de la session', async () => {
    const items = await getItems(db, sessionId);
    const accesItem = items.find((i) => i.question_id.startsWith('acces_'));
    await setItemStatus(db, accesItem?.id ?? '', 'couvert');

    const coverage = await getFinalCoverage(db, sessionId);
    expect(coverage.by_domain.acces?.covered_themes).toBe(1);
    expect(coverage.by_domain.continuite?.covered_themes).toBe(0);
    expect(coverage.total_themes).toBe(
      (coverage.by_domain.acces?.total_themes ?? 0) + (coverage.by_domain.continuite?.total_themes ?? 0)
    );
  });
});

describe('[ANAL-02] Gaps de couverture', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('liste les thèmes non abordés et les items à approfondir / non obtenus', async () => {
    const items = await getItems(db, sessionId);
    await setItemStatus(db, items[0].id, 'couvert');
    await setItemStatus(db, items[1].id, 'a_approfondir');
    await setItemStatus(db, items[2].id, 'non_obtenu');
    await setItemStatus(db, items[3].id, 'skipped');
    // items[4..] restent pending

    const gaps = await listGaps(db, sessionId);
    const byQuestion = new Map(gaps.map((g) => [g.question_id, g]));

    expect(byQuestion.has(items[0].question_id)).toBe(false); // couvert : pas un gap
    expect(byQuestion.get(items[1].question_id)?.reason).toBe('a_approfondir');
    expect(byQuestion.get(items[2].question_id)?.reason).toBe('non_obtenu');
    expect(byQuestion.get(items[3].question_id)?.reason).toBe('non_aborde');
    expect(byQuestion.get(items[4].question_id)?.reason).toBe('non_aborde');
    expect(gaps).toHaveLength(items.length - 1);
    expect(gaps.every((g) => g.theme.length > 0 && g.domain.length > 0)).toBe(true);
  });

  it('ignore un item dont la question n’existe plus dans le référentiel', async () => {
    await db.runAsync(
      `INSERT INTO interview_items (id, session_id, question_id, question_text, is_manual, status, created_at, updated_at)
       VALUES ('orphelin', ?, 'acces_999', 'Question retirée du référentiel ?', 0, 'pending', 0, 0)`,
      [sessionId]
    );
    const gaps = await listGaps(db, sessionId);
    expect(gaps.some((g) => g.question_id === 'acces_999')).toBe(false);
  });
});

describe('[ANAL-04] / [INVARIANT-02] Validation Human-in-the-Loop', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('une assertion naît non validée, même saisie manuellement', async () => {
    const assertion = await addAssertion(db, sessionId, {
      domain: 'acces',
      text: 'La revue des habilitations est réalisée annuellement.',
    });
    expect(assertion.validated_by_user).toBe(0);
    expect(assertion.ai_generated).toBe(0); // Phase 1 : saisie manuelle
    const saved = (await listAssertions(db, sessionId))[0];
    expect(saved.validated_by_user).toBe(0);
    expect(saved.validated_at).toBeNull();
  });

  it('Valider : trace validated_by_user = 1 et l’horodatage', async () => {
    const { id } = await addAssertion(db, sessionId, { domain: 'acces', text: 'Assertion.' });
    await validateAssertion(db, id);
    const saved = (await listAssertions(db, sessionId))[0];
    expect(saved.validated_by_user).toBe(1);
    expect(saved.validated_at).toBeGreaterThan(0);
  });

  it('Modifier : conserve le texte d’origine, enregistre la version corrigée et vaut validation', async () => {
    const { id } = await addAssertion(db, sessionId, { domain: 'general', text: 'Texte initial.' });
    await modifyAssertion(db, id, 'Texte corrigé par l’auditeur.');
    const saved = (await listAssertions(db, sessionId))[0];
    expect(saved.assertion_text).toBe('Texte initial.');
    expect(saved.user_modified_text).toBe('Texte corrigé par l’auditeur.');
    expect(saved.validated_by_user).toBe(1);
    expect(getEffectiveAssertionText(saved)).toBe('Texte corrigé par l’auditeur.');
  });

  it('Supprimer : retire définitivement l’assertion', async () => {
    const { id } = await addAssertion(db, sessionId, { domain: 'general', text: 'À supprimer.' });
    await deleteAssertion(db, id);
    expect(await listAssertions(db, sessionId)).toHaveLength(0);
  });

  it('ACC-02 : l’export est verrouillé tant qu’une assertion n’est pas validée', async () => {
    const a1 = await addAssertion(db, sessionId, { domain: 'acces', text: 'Assertion 1.' });
    const a2 = await addAssertion(db, sessionId, { domain: 'continuite', text: 'Assertion 2.' });

    expect((await getExportGate(db, sessionId)).allowed).toBe(false);

    await validateAssertion(db, a1.id);
    const partial = await getExportGate(db, sessionId);
    expect(partial.allowed).toBe(false);
    expect(partial.pending_count).toBe(1);

    await validateAssertion(db, a2.id);
    const complete = await getExportGate(db, sessionId);
    expect(complete.allowed).toBe(true);
    expect(complete.pending_count).toBe(0);
    expect(complete.total_count).toBe(2);
  });

  it('le schéma impose validated_by_user à 0 par défaut (défense en profondeur)', async () => {
    await db.runAsync(
      `INSERT INTO cr_assertions (id, session_id, domain, assertion_text, created_at) VALUES ('raw', ?, 'general', 'Insérée sans statut.', 0)`,
      [sessionId]
    );
    const saved = (await listAssertions(db, sessionId))[0];
    expect(saved.validated_by_user).toBe(0);
    expect(saved.ai_generated).toBe(1); // défaut du schéma : prudence, réputée IA tant que non qualifiée
  });
});
