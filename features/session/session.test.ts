/**
 * Tests Module 2 — Entretien guidé : [ENT-05] [ENT-06] [ENT-09],
 * [REL-01] [REL-02] [REL-03], migrations et suppression définitive (6.2).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MIGRATIONS, runMigrations } from '../../db/db.client';
import type { SessionConfig } from '../../types';
import { createSession } from '../briefing/briefing.service';
import type { SessionConfigInput } from '../briefing/briefing.types';
import { createTestDb, type TestDb } from '../testing/test-db';
import {
  addManualNote,
  autosaveSession,
  completeSession,
  computeCoverage,
  deleteSession,
  getItems,
  getSession,
  listSessions,
  resumeInterruptedSession,
  setItemStatus,
  startSession,
  updateItemAnswer,
} from './session.service';

const INPUT: SessionConfigInput = {
  mission_type: 'audit_annuel',
  app_name: 'SAP ECC',
  app_type: 'erp',
  interlocutor: 'responsable_applicatif',
  domains: ['acces'],
  duration_min: 60,
};

describe('Migrations — cohérence du schéma', () => {
  function normalizeSql(sql: string): string {
    return sql
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  it('la migration 0001 est strictement identique à /db/schema.sql', () => {
    const schema = readFileSync(join(__dirname, '../../db/schema.sql'), 'utf-8');
    expect(normalizeSql(MIGRATIONS[0].sql)).toBe(normalizeSql(schema));
  });

  it('runMigrations crée le schéma complet sur une base vierge', async () => {
    const db = createTestDb({ applySchema: false });
    await runMigrations(db);
    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    );
    const names = tables.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['sessions', 'interview_items', 'transcripts', 'cr_assertions', 'consents']));
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(1);
    // Idempotence : une seconde exécution ne doit rien casser
    await runMigrations(db);
    db.close();
  });
});

describe('Cycle de vie de session', () => {
  let db: TestDb;
  let config: SessionConfig;

  beforeEach(async () => {
    db = createTestDb();
    config = (await createSession(db, INPUT)).config;
  });
  afterEach(() => db.close());

  it('startSession passe la session en in_progress', async () => {
    await startSession(db, config.id);
    expect((await getSession(db, config.id))?.status).toBe('in_progress');
  });

  it('[REL-02] resumeInterruptedSession retrouve la session interrompue la plus récente', async () => {
    expect(await resumeInterruptedSession(db)).toBeNull();
    await startSession(db, config.id);
    const resumed = await resumeInterruptedSession(db);
    expect(resumed?.id).toBe(config.id);
    expect(resumed?.status).toBe('in_progress');
    await completeSession(db, config.id);
    expect(await resumeInterruptedSession(db)).toBeNull();
  });

  it('listSessions retourne les sessions les plus récentes en premier', async () => {
    const second = (await createSession(db, { ...INPUT, app_name: 'Oracle EBS' })).config;
    await db.runAsync('UPDATE sessions SET created_at = created_at + 1000 WHERE id = ?', [second.id]);
    const sessions = await listSessions(db);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].app_name).toBe('Oracle EBS');
  });

  it('suppression définitive (6.2) : la session et toutes ses données disparaissent', async () => {
    const items = await getItems(db, config.id);
    await db.runAsync(
      `INSERT INTO cr_assertions (id, session_id, domain, assertion_text, ai_generated, created_at) VALUES ('a1', ?, 'acces', 'Texte', 0, 0)`,
      [config.id]
    );
    await db.runAsync(
      `INSERT INTO consents (id, session_id, type, granted, timestamp, app_version) VALUES ('c1', ?, 'data_retention', 1, 0, '1.0.0')`,
      [config.id]
    );
    expect(items.length).toBeGreaterThan(0);

    await deleteSession(db, config.id);

    expect(await getSession(db, config.id)).toBeNull();
    expect(await getItems(db, config.id)).toHaveLength(0);
    const orphans = await db.getFirstAsync<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM cr_assertions) + (SELECT COUNT(*) FROM consents) as n`
    );
    expect(orphans?.n).toBe(0);
  });
});

describe('[ENT-09] Statuts d’items — persistance immédiate', () => {
  let db: TestDb;
  let itemId: string;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    const { config } = await createSession(db, INPUT);
    sessionId = config.id;
    itemId = (await getItems(db, sessionId))[0].id;
  });
  afterEach(() => db.close());

  it.each(['couvert', 'a_approfondir', 'non_obtenu', 'skipped'] as const)(
    'persiste immédiatement le statut "%s"',
    async (status) => {
      await setItemStatus(db, itemId, status);
      const items = await getItems(db, sessionId);
      expect(items.find((i) => i.id === itemId)?.status).toBe(status);
    }
  );

  it('le schéma rejette un statut hors énumération', async () => {
    await expect(
      db.runAsync(`UPDATE interview_items SET status = 'invalide' WHERE id = ?`, [itemId])
    ).rejects.toThrow();
  });
});

describe('[ENT-05] Notes manuelles', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('ajoute une note manuelle sans interrompre la session', async () => {
    const before = (await getItems(db, sessionId)).length;
    const note = await addManualNote(db, sessionId, 'Prévoir extraction des comptes AD');
    const items = await getItems(db, sessionId);
    expect(items).toHaveLength(before + 1);
    const saved = items.find((i) => i.id === note.id);
    expect(saved?.is_manual).toBe(1);
    expect(saved?.answer_text).toBe('Prévoir extraction des comptes AD');
  });

  it('met à jour la réponse attachée à une question', async () => {
    const itemId = (await getItems(db, sessionId))[0].id;
    await updateItemAnswer(db, itemId, 'Revue annuelle par le responsable applicatif');
    const item = (await getItems(db, sessionId)).find((i) => i.id === itemId);
    expect(item?.answer_text).toBe('Revue annuelle par le responsable applicatif');
  });
});

describe('[ENT-06] Couverture temps réel', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('démarre à 0% et se met à jour après chaque changement de statut [ENT-09]', async () => {
    const initial = await computeCoverage(db, sessionId);
    expect(initial.percent).toBe(0);
    expect(initial.total_themes).toBeGreaterThan(0);

    const items = await getItems(db, sessionId);
    await setItemStatus(db, items[0].id, 'couvert');
    const afterOne = await computeCoverage(db, sessionId);
    expect(afterOne.covered_themes).toBe(1);
    expect(afterOne.percent).toBeGreaterThan(0);

    // a_approfondir / non_obtenu ne comptent pas comme couverts
    await setItemStatus(db, items[1].id, 'a_approfondir');
    expect((await computeCoverage(db, sessionId)).covered_themes).toBe(1);
  });

  it('un thème à deux questions est couvert dès la première question couverte', async () => {
    // acces_005 et acces_010 partagent le thème revue_habilitations (durée 60)
    const items = await getItems(db, sessionId);
    const parent = items.find((i) => i.question_id === 'acces_005');
    const child = items.find((i) => i.question_id === 'acces_010');
    expect(parent && child).toBeTruthy();
    const before = await computeCoverage(db, sessionId);
    await setItemStatus(db, parent?.id ?? '', 'couvert');
    const after = await computeCoverage(db, sessionId);
    expect(after.covered_themes).toBe(before.covered_themes + 1);
    await setItemStatus(db, child?.id ?? '', 'couvert');
    expect((await computeCoverage(db, sessionId)).covered_themes).toBe(after.covered_themes);
  });

  it('les notes manuelles sont exclues du calcul', async () => {
    const before = await computeCoverage(db, sessionId);
    await addManualNote(db, sessionId, 'Note hors arbre');
    const after = await computeCoverage(db, sessionId);
    expect(after.total_themes).toBe(before.total_themes);
  });

  it('détaille la couverture par domaine', async () => {
    const coverage = await computeCoverage(db, sessionId);
    expect(coverage.by_domain.acces).toBeDefined();
    expect(coverage.by_domain.acces?.total_themes).toBe(coverage.total_themes);
  });

  it('une session sans item retourne 100% (aucun objectif à couvrir)', async () => {
    await db.runAsync(
      `INSERT INTO sessions (id, created_at, updated_at, mission_type, app_name, app_type, interlocutor, domains, duration_min)
       VALUES ('vide', 0, 0, 'autre', 'App', 'autre', 'autre', '[]', 30)`
    );
    const coverage = await computeCoverage(db, 'vide');
    expect(coverage.total_themes).toBe(0);
    expect(coverage.percent).toBe(100);
  });
});

describe('[REL-01] [REL-03] Autosave atomique', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
  });
  afterEach(() => db.close());

  it('vide le buffer de réponses et rafraîchit la session en une transaction', async () => {
    const items = await getItems(db, sessionId);
    const before = (await getSession(db, sessionId))?.updated_at ?? 0;
    await autosaveSession(db, sessionId, [
      { item_id: items[0].id, answer_text: 'Réponse 1' },
      { item_id: items[1].id, answer_text: 'Réponse 2' },
    ]);
    const saved = await getItems(db, sessionId);
    expect(saved[0].answer_text).toBe('Réponse 1');
    expect(saved[1].answer_text).toBe('Réponse 2');
    expect((await getSession(db, sessionId))?.updated_at).toBeGreaterThanOrEqual(before);
  });

  it('[REL-03] aucune écriture partielle : une transaction en échec est intégralement annulée', async () => {
    const items = await getItems(db, sessionId);
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE interview_items SET answer_text = ? WHERE id = ?', ['écrit', items[0].id]);
        await db.runAsync(`UPDATE sessions SET status = 'invalide' WHERE id = ?`, [sessionId]); // viole le CHECK
      })
    ).rejects.toThrow();
    const after = await getItems(db, sessionId);
    expect(after[0].answer_text).toBeNull();
  });
});
