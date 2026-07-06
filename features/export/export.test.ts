/**
 * Tests Module 4 — Export CR : [EXP-01] [EXP-02] [EXP-03],
 * ACC-02 (verrou), ACC-03 (intégrité du hash) et [INVARIANT-02].
 */
import { createHash } from 'node:crypto';

import { addAssertion, modifyAssertion, validateAssertion } from '../analysis/analysis.service';
import { createSession } from '../briefing/briefing.service';
import type { SessionConfigInput } from '../briefing/briefing.types';
import { getItems, setItemStatus } from '../session/session.service';
import { createTestDb, type TestDb } from '../testing/test-db';
import { assembleCrData, computeCrHash, exportSession, renderMarkdown, verifyCrHash } from './export.service';
import type { Sha256Hasher } from './export.types';

const hasher: Sha256Hasher = async (content) => createHash('sha256').update(content, 'utf8').digest('hex');

const INPUT: SessionConfigInput = {
  mission_type: 'audit_annuel',
  app_name: 'SAP ECC',
  app_type: 'erp',
  interlocutor: 'rssi',
  domains: ['acces', 'changements'],
  duration_min: 45,
};

const APP_VERSION = '1.0.0-test';

describe('Export CR', () => {
  let db: TestDb;
  let sessionId: string;

  beforeEach(async () => {
    db = createTestDb();
    sessionId = (await createSession(db, INPUT)).config.id;
    const items = await getItems(db, sessionId);
    await setItemStatus(db, items[0].id, 'couvert');
    await setItemStatus(db, items[1].id, 'a_approfondir');
  });
  afterEach(() => db.close());

  async function addValidatedAssertion(text: string, domain: 'acces' | 'changements' | 'general' = 'acces') {
    const assertion = await addAssertion(db, sessionId, { domain, text });
    await validateAssertion(db, assertion.id);
    return assertion;
  }

  it('ACC-02 / [INVARIANT-02] : refuse l’export si une assertion n’est pas validée', async () => {
    await addAssertion(db, sessionId, { domain: 'acces', text: 'Non validée.' });
    await expect(exportSession(db, sessionId, 'markdown', hasher, APP_VERSION)).rejects.toThrow('INVARIANT-02');
    const session = await db.getFirstAsync<{ status: string; hash_sha256: string | null }>(
      'SELECT status, hash_sha256 FROM sessions WHERE id = ?',
      [sessionId]
    );
    expect(session?.status).not.toBe('exported');
    expect(session?.hash_sha256).toBeNull();
  });

  it('[EXP-02] : le Markdown respecte la structure imposée du template 11.3, dans l’ordre', async () => {
    await addValidatedAssertion('La revue des habilitations est annuelle.');
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);
    const md = result.content;

    const expectedOrder = [
      "# Compte Rendu d'Entretien IT",
      '## Informations de session',
      '- **Date :**',
      '- **Durée :** 45 minutes',
      '- **Type de mission :**',
      '- **Application auditée :** SAP ECC (erp)',
      '- **Profil interlocuteur :** rssi',
      '- **Domaines couverts :**',
      '- **Hash SHA-256 :**',
      '## Synthèse de couverture',
      '| Domaine | Thèmes couverts | Thèmes manquants | Taux |',
      '## Détail par domaine',
      '### Gestion des accès',
      'La revue des habilitations est annuelle.',
      '**Gaps identifiés :**',
      '### Gestion des changements',
      '## Points de suivi',
      '*Document généré par IT Audit Interview Assistant v1.0.0-test*',
      "*Toutes les assertions ont été validées par l'auditeur avant inclusion.*",
    ];
    let cursor = -1;
    for (const fragment of expectedOrder) {
      const index = md.indexOf(fragment, cursor + 1);
      if (index <= cursor) {
        throw new Error(`Fragment absent ou hors ordre dans le CR : "${fragment}"`);
      }
      cursor = index;
    }
  });

  it('[EXP-03] : horodatage ISO 8601, hash SHA-256 embarqué, stocké en base, statut exported', async () => {
    await addValidatedAssertion('Assertion validée.');
    const now = Date.now();
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION, now);

    expect(result.content).toContain(new Date(now).toISOString());
    expect(result.hash_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.content).toContain(result.hash_sha256);

    const session = await db.getFirstAsync<{ status: string; hash_sha256: string }>(
      'SELECT status, hash_sha256 FROM sessions WHERE id = ?',
      [sessionId]
    );
    expect(session?.hash_sha256).toBe(result.hash_sha256);
    expect(session?.status).toBe('exported');
  });

  it('ACC-03 : le hash du fichier exporté correspond au hash recalculé et au hash stocké', async () => {
    await addValidatedAssertion('Assertion validée.');
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);

    expect(await verifyCrHash(result.content, hasher)).toBe(true);

    const stored = await db.getFirstAsync<{ hash_sha256: string }>('SELECT hash_sha256 FROM sessions WHERE id = ?', [
      sessionId,
    ]);
    expect(stored?.hash_sha256).toBe(result.hash_sha256);

    const tampered = result.content.replace('SAP ECC', 'Autre Application');
    expect(await verifyCrHash(tampered, hasher)).toBe(false);
  });

  it('[ANAL-04] : une assertion modifiée est exportée dans sa version corrigée', async () => {
    const assertion = await addAssertion(db, sessionId, { domain: 'acces', text: 'Texte initial erroné.' });
    await modifyAssertion(db, assertion.id, 'Texte corrigé et validé.');
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);
    expect(result.content).toContain('Texte corrigé et validé.');
    expect(result.content).not.toContain('Texte initial erroné.');
  });

  it('[ANAL-02] : les gaps apparaissent dans la section de leur domaine avec leur motif', async () => {
    await addValidatedAssertion('Assertion.');
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);
    expect(result.content).toMatch(/\(à approfondir\)/);
    expect(result.content).toMatch(/\(non abordé\)/);
  });

  it('les assertions du domaine general sont exportées dans une section dédiée', async () => {
    await addValidatedAssertion('Contexte général de la DSI.', 'general');
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);
    expect(result.content).toContain('### Général');
    expect(result.content).toContain('Contexte général de la DSI.');
  });

  it('[EXP-01] : exporte un DOCX valide (zip) portant le même hash de contenu', async () => {
    await addValidatedAssertion('Assertion validée.');
    const result = await exportSession(db, sessionId, 'docx', hasher, APP_VERSION);
    expect(result.encoding).toBe('base64');
    expect(result.filename).toMatch(/\.docx$/);
    const bytes = Buffer.from(result.content, 'base64');
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K' — signature ZIP/OOXML
    const stored = await db.getFirstAsync<{ hash_sha256: string }>('SELECT hash_sha256 FROM sessions WHERE id = ?', [
      sessionId,
    ]);
    expect(stored?.hash_sha256).toBe(result.hash_sha256);
  });

  it('[EXP-01] : refuse le format pdf en Phase 1 avec un message explicite', async () => {
    await addValidatedAssertion('Assertion validée.');
    await expect(exportSession(db, sessionId, 'pdf', hasher, APP_VERSION)).rejects.toThrow('Phase 3');
  });

  it('refuse d’assembler le CR d’une session inconnue', async () => {
    await expect(assembleCrData(db, 'session-inexistante', APP_VERSION)).rejects.toThrow('introuvable');
  });

  it('rend les sections vides du template quand il n’y a ni gap ni assertion de domaine', async () => {
    // Tout couvrir → zéro gap ; aucune assertion => le verrou reste ouvert (0 en attente)
    const items = await getItems(db, sessionId);
    for (const item of items) {
      await setItemStatus(db, item.id, 'couvert');
    }
    const result = await exportSession(db, sessionId, 'markdown', hasher, APP_VERSION);
    expect(result.content).toContain('_Aucun gap identifié._');
    expect(result.content).toContain('_Aucune assertion validée pour ce domaine._');
    expect(result.content).toContain('_Aucun point de suivi défini._');
    expect(await verifyCrHash(result.content, hasher)).toBe(true);
  });

  it('computeCrHash est stable : deux rendus des mêmes données donnent le même hash', async () => {
    await addValidatedAssertion('Assertion validée.');
    const now = Date.now();
    const data = await assembleCrData(db, sessionId, APP_VERSION, now);
    expect(await computeCrHash(data, hasher)).toBe(await computeCrHash(data, hasher));
    expect(renderMarkdown(data, 'abc')).toContain('abc');
  });
});
