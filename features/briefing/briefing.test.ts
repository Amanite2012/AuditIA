/**
 * Tests Module 1 — Briefing [BRIEF-01..05], ACC-01, ACC-08,
 * chargement de l'arbre décisionnel (< 500ms) et création de session.
 */
import type { SessionConfig } from '../../types';
import { createTestDb, type TestDb } from '../testing/test-db';
import {
  buildQuestionTree,
  createSession,
  loadKnowledgeBase,
  validateKnowledgeBase,
  validateSessionConfigInput,
} from './briefing.service';
import type { SessionConfigInput } from './briefing.types';

const VALID_INPUT: SessionConfigInput = {
  mission_type: 'audit_annuel',
  app_name: 'SAP ECC',
  app_type: 'erp',
  interlocutor: 'responsable_applicatif',
  domains: ['acces', 'changements'],
  duration_min: 60,
};

function makeConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    created_at: Date.now(),
    mission_type: 'audit_annuel',
    app_name: 'SAP ECC',
    app_type: 'erp',
    interlocutor: 'responsable_applicatif',
    domains: ['acces'],
    duration_min: 60,
    llm_mode: 'none',
    ...overrides,
  };
}

describe('[BRIEF-01..05] validateSessionConfigInput', () => {
  it('accepte une saisie complète et valide', () => {
    expect(validateSessionConfigInput(VALID_INPUT)).toHaveLength(0);
  });

  it.each([
    ['mission_type', 'BRIEF-01'],
    ['domains', 'BRIEF-02'],
    ['app_name', 'BRIEF-03'],
    ['app_type', 'BRIEF-03'],
    ['interlocutor', 'BRIEF-04'],
    ['duration_min', 'BRIEF-05'],
  ] as const)('ACC-01 : refuse une saisie sans "%s" (%s)', (field, spec) => {
    const input = { ...VALID_INPUT, [field]: undefined };
    const errors = validateSessionConfigInput(input);
    expect(errors.some((e) => e.field === field && e.spec === spec)).toBe(true);
  });

  it('[BRIEF-02] refuse une liste de domaines vide', () => {
    const errors = validateSessionConfigInput({ ...VALID_INPUT, domains: [] });
    expect(errors.some((e) => e.spec === 'BRIEF-02')).toBe(true);
  });

  it('[BRIEF-03] refuse un nom d’application composé d’espaces', () => {
    const errors = validateSessionConfigInput({ ...VALID_INPUT, app_name: '   ' });
    expect(errors.some((e) => e.spec === 'BRIEF-03' && e.field === 'app_name')).toBe(true);
  });

  it('refuse des valeurs hors énumération', () => {
    const input = {
      ...VALID_INPUT,
      mission_type: 'inconnu',
      duration_min: 42,
    } as unknown as SessionConfigInput;
    const errors = validateSessionConfigInput(input);
    expect(errors.some((e) => e.spec === 'BRIEF-01')).toBe(true);
    expect(errors.some((e) => e.spec === 'BRIEF-05')).toBe(true);
  });
});

describe('[BRIEF-06]/ACC-08 validateKnowledgeBase', () => {
  const validQuestion = {
    id: 'acces_001',
    domain: 'acces',
    theme: 'test',
    question_text: 'Question ?',
    applicable_to: {
      app_types: ['erp'],
      interlocutors: ['dba'],
      mission_types: ['audit_annuel'],
    },
    depth_levels: [30],
  };

  it('accepte un référentiel minimal valide', () => {
    expect(validateKnowledgeBase([validQuestion])).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['non-tableau', { foo: 'bar' }],
    ['chaîne', 'pas un référentiel'],
    ['null', null],
  ])('ACC-08 : rejette sans crash un JSON malformé (%s)', (_label, data) => {
    const result = validateKnowledgeBase(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejette une entrée sans champ obligatoire, avec message explicite', () => {
    const { question_text: _omitted, ...incomplete } = validQuestion;
    const result = validateKnowledgeBase([incomplete]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('question_text');
  });

  it('rejette un id ne respectant pas le format "{domaine}_{index}"', () => {
    const result = validateKnowledgeBase([{ ...validQuestion, id: 'ACCES-1' }]);
    expect(result.valid).toBe(false);
  });

  it('rejette un id dont le préfixe ne correspond pas au domaine', () => {
    const result = validateKnowledgeBase([{ ...validQuestion, id: 'changements_001' }]);
    expect(result.valid).toBe(false);
  });

  it('rejette les ids dupliqués', () => {
    const result = validateKnowledgeBase([validQuestion, validQuestion]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('dupliqué');
  });

  it('rejette une référence enfant non résolue', () => {
    const withChild = {
      ...validQuestion,
      children: [{ condition: 'Si oui', question_id: 'acces_999' }],
    };
    const result = validateKnowledgeBase([withChild]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('acces_999');
  });

  it('rejette des depth_levels hors énumération', () => {
    const result = validateKnowledgeBase([{ ...validQuestion, depth_levels: [15] }]);
    expect(result.valid).toBe(false);
  });
});

describe('Référentiel embarqué (4 domaines ITGC)', () => {
  it('est valide contre le schéma 11.1 et couvre les 4 domaines', () => {
    const kb = loadKnowledgeBase();
    const domains = new Set(kb.map((q) => q.domain));
    expect(domains).toEqual(new Set(['acces', 'changements', 'operations', 'continuite']));
    expect(kb.length).toBeGreaterThanOrEqual(40);
  });
});

describe('buildQuestionTree — arbre décisionnel', () => {
  const kb = loadKnowledgeBase();

  it('ne retient que les domaines sélectionnés [BRIEF-02]', () => {
    const tree = buildQuestionTree(makeConfig({ domains: ['continuite'] }), kb);
    expect(tree.questions.length).toBeGreaterThan(0);
    expect(tree.questions.every((q) => q.domain === 'continuite')).toBe(true);
  });

  it('[BRIEF-05] la durée conditionne la profondeur : arbre 30 min ⊂ arbre 90 min', () => {
    const config90 = makeConfig({ domains: ['acces', 'changements', 'operations', 'continuite'], duration_min: 90 });
    const config30 = makeConfig({ domains: ['acces', 'changements', 'operations', 'continuite'], duration_min: 30 });
    const tree90 = buildQuestionTree(config90, kb);
    const tree30 = buildQuestionTree(config30, kb);
    const ids90 = new Set(tree90.questions.map((q) => q.id));
    expect(tree30.questions.length).toBeLessThan(tree90.questions.length);
    expect(tree30.questions.every((q) => ids90.has(q.id))).toBe(true);
    expect(tree30.questions.every((q) => q.depth_levels.includes(30))).toBe(true);
  });

  it('filtre selon le profil interlocuteur [BRIEF-04]', () => {
    const treeDba = buildQuestionTree(makeConfig({ interlocutor: 'dba', duration_min: 90 }), kb);
    // acces_004 (mobilité interne) ne cible pas le profil dba
    expect(treeDba.questions.some((q) => q.id === 'acces_004')).toBe(false);
    expect(treeDba.questions.some((q) => q.id === 'acces_011')).toBe(true);
  });

  it('filtre selon le type d’environnement [BRIEF-03]', () => {
    const treeSaas = buildQuestionTree(
      makeConfig({ app_type: 'saas', domains: ['changements'], duration_min: 90 }),
      kb
    );
    // changements_005 (séparation des environnements) ne s'applique pas au SaaS
    expect(treeSaas.questions.some((q) => q.id === 'changements_005')).toBe(false);
  });

  it('insère les questions enfants immédiatement après leur parent, avec la condition', () => {
    const tree = buildQuestionTree(makeConfig({ duration_min: 60 }), kb);
    const ids = tree.questions.map((q) => q.id);
    const parentIndex = ids.indexOf('acces_005');
    expect(parentIndex).toBeGreaterThanOrEqual(0);
    expect(ids[parentIndex + 1]).toBe('acces_010');
    const child = tree.questions[parentIndex + 1];
    expect(child.parent).toEqual({
      question_id: 'acces_005',
      condition: 'Une revue périodique des habilitations existe',
    });
  });

  it('exclut un enfant qui ne satisfait pas la profondeur, sans exclure le parent', () => {
    const tree = buildQuestionTree(makeConfig({ duration_min: 30 }), kb);
    const ids = tree.questions.map((q) => q.id);
    expect(ids).toContain('acces_005');
    expect(ids).not.toContain('acces_010'); // depth_levels: [45,60,90]
  });

  it('charge l’arbre en moins de 500ms (critère section 2.2)', () => {
    const config = makeConfig({ domains: ['acces', 'changements', 'operations', 'continuite'], duration_min: 90 });
    const start = performance.now();
    buildQuestionTree(config, kb);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe('createSession — persistance transactionnelle [REL-03]', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('crée la session et un item par question de l’arbre', async () => {
    const { config, tree } = await createSession(db, VALID_INPUT);
    const session = await db.getFirstAsync<{ id: string; status: string; llm_mode: string; domains: string }>(
      'SELECT id, status, llm_mode, domains FROM sessions WHERE id = ?',
      [config.id]
    );
    expect(session).not.toBeNull();
    expect(session?.status).toBe('draft');
    expect(session?.llm_mode).toBe('none'); // Phase 1 [DECISION-05]
    expect(JSON.parse(session?.domains ?? '[]')).toEqual(['acces', 'changements']);

    const items = await db.getAllAsync<{ question_id: string; status: string; is_manual: number }>(
      'SELECT question_id, status, is_manual FROM interview_items WHERE session_id = ?',
      [config.id]
    );
    expect(items).toHaveLength(tree.questions.length);
    expect(tree.questions.length).toBeGreaterThan(0);
    expect(items.every((i) => i.status === 'pending' && i.is_manual === 0)).toBe(true);
  });

  it('ACC-01 : refuse de créer une session avec un briefing incomplet, sans écrire en base', async () => {
    await expect(createSession(db, { ...VALID_INPUT, app_name: undefined })).rejects.toThrow('BRIEF-03');
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM sessions');
    expect(count?.n).toBe(0);
  });

  it('le schéma SQL rejette une valeur hors CHECK (défense en profondeur)', async () => {
    await expect(
      db.runAsync(
        `INSERT INTO sessions (id, created_at, updated_at, mission_type, app_name, app_type, interlocutor, domains, duration_min)
         VALUES ('x', 0, 0, 'invalide', 'App', 'erp', 'dba', '[]', 60)`
      )
    ).rejects.toThrow();
  });
});
