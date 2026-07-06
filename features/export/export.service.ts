/**
 * Module 4 — Export CR (CDC section 2.5).
 *
 * - [EXP-01] formats markdown | docx (pdf : Phase 3)
 * - [EXP-02] structure du CR imposée par le template 11.3, non configurable
 * - [EXP-03] horodatage ISO 8601 + hash SHA-256 de traçabilité
 * - [INVARIANT-02] / ACC-02 : export refusé si une assertion n'est pas validée
 *
 * Traçabilité du hash : le hash SHA-256 est calculé sur le contenu canonique
 * Markdown du CR, champ hash laissé au placeholder `{hash}` (le document ne
 * peut pas contenir sa propre empreinte). Il est ensuite inséré dans le
 * document exporté (tous formats) et stocké dans sessions.hash_sha256.
 * ACC-03 : `verifyCrHash` recalcule l'empreinte après re-normalisation.
 */
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

import type { DbClient } from '../../db/db.client';
import {
  DOMAIN_LABELS,
  DOMAINS,
  type AssertionDomain,
  type CrAssertionRow,
  type Domain,
  type SessionRow,
} from '../../types';
import { getEffectiveAssertionText, getExportGate, getFinalCoverage, listAssertions, listGaps } from '../analysis/analysis.service';
import type { Gap, GapReason } from '../analysis/analysis.types';
import type { CrData, ExportFormat, ExportResult, Sha256Hasher } from './export.types';

const HASH_PLACEHOLDER = '{hash}';

const GAP_REASON_LABELS: Record<GapReason, string> = {
  non_aborde: 'non abordé',
  a_approfondir: 'à approfondir',
  non_obtenu: 'non obtenu',
};

const MISSION_LABELS: Record<SessionRow['mission_type'], string> = {
  audit_annuel: 'Audit annuel',
  controle_interne: 'Contrôle interne',
  revue_ciblee: 'Revue ciblée',
  autre: 'Autre',
};

/**
 * Consolide les données du CR. Seules les assertions validées par
 * l'utilisateur sont incluses [INVARIANT-02].
 * @throws Error si le verrou d'export est fermé (ACC-02).
 */
export async function assembleCrData(
  db: DbClient,
  sessionId: string,
  appVersion: string,
  now: number = Date.now()
): Promise<CrData> {
  const gate = await getExportGate(db, sessionId);
  if (!gate.allowed) {
    throw new Error(
      `[INVARIANT-02] Export refusé : ${gate.pending_count} assertion(s) non validée(s) par l'auditeur (ACC-02).`
    );
  }
  const session = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [sessionId]);
  if (!session) {
    throw new Error(`Session introuvable : ${sessionId}`);
  }
  const domains = JSON.parse(session.domains) as Domain[];
  const coverage = await getFinalCoverage(db, sessionId);
  const assertions = await listAssertions(db, sessionId);
  const gaps = await listGaps(db, sessionId);

  const assertionsByDomain: CrData['assertions_by_domain'] = {};
  for (const assertion of assertions) {
    if (assertion.validated_by_user !== 1) continue;
    (assertionsByDomain[assertion.domain] ??= []).push(assertion);
  }
  const gapsByDomain: CrData['gaps_by_domain'] = {};
  for (const gap of gaps) {
    (gapsByDomain[gap.domain] ??= []).push(gap);
  }

  return {
    session,
    domains,
    coverage,
    assertions_by_domain: assertionsByDomain,
    gaps_by_domain: gapsByDomain,
    follow_ups: [], // Phase 1 : [ANAL-05] est livré en Phase 2
    generated_at_iso: new Date(now).toISOString(),
    app_version: appVersion,
  };
}

/**
 * Domaines de la section « Détail par domaine » : les domaines de la session,
 * complétés de `general` si des assertions validées y sont rattachées (le
 * template 11.3 itère sur les domaines ; les assertions générales validées ne
 * peuvent pas être silencieusement écartées).
 */
function detailDomains(data: CrData): AssertionDomain[] {
  const ordered: AssertionDomain[] = DOMAINS.filter((d) => data.domains.includes(d));
  if ((data.assertions_by_domain.general ?? []).length > 0) {
    ordered.push('general');
  }
  return ordered;
}

function assertionLines(assertions: CrAssertionRow[] | undefined): string {
  if (!assertions || assertions.length === 0) {
    return '_Aucune assertion validée pour ce domaine._';
  }
  return assertions.map((a) => `- ${getEffectiveAssertionText(a)}`).join('\n');
}

function gapLines(gaps: Gap[] | undefined): string {
  if (!gaps || gaps.length === 0) {
    return '_Aucun gap identifié._';
  }
  return gaps.map((g) => `- [${g.theme}] ${g.question_text} (${GAP_REASON_LABELS[g.reason]})`).join('\n');
}

/** Rendu Markdown du CR — structure immuable du template 11.3 [EXP-02]. */
export function renderMarkdown(data: CrData, hash: string = HASH_PLACEHOLDER): string {
  const coverageRows = DOMAINS.filter((d) => data.domains.includes(d))
    .map((domain) => {
      const stats = data.coverage.by_domain[domain];
      const covered = stats?.covered_themes ?? 0;
      const total = stats?.total_themes ?? 0;
      return `| ${DOMAIN_LABELS[domain]} | ${covered} | ${total - covered} | ${stats?.percent ?? 0}% |`;
    })
    .join('\n');

  const domainSections = detailDomains(data)
    .map((domain) => {
      const gapsBlock =
        domain === 'general'
          ? ''
          : `\n**Gaps identifiés :**\n${gapLines(data.gaps_by_domain[domain])}\n`;
      return `### ${DOMAIN_LABELS[domain]}\n${assertionLines(data.assertions_by_domain[domain])}\n${gapsBlock}`;
    })
    .join('\n');

  const followUps =
    data.follow_ups.length > 0 ? data.follow_ups.map((f) => `- ${f}`).join('\n') : '_Aucun point de suivi défini._';

  const domainsList = data.domains.map((d) => DOMAIN_LABELS[d]).join(', ');

  return `# Compte Rendu d'Entretien IT
## Informations de session
- **Date :** ${data.generated_at_iso}
- **Durée :** ${data.session.duration_min} minutes
- **Type de mission :** ${MISSION_LABELS[data.session.mission_type]}
- **Application auditée :** ${data.session.app_name} (${data.session.app_type})
- **Profil interlocuteur :** ${data.session.interlocutor}
- **Domaines couverts :** ${domainsList}
- **Hash SHA-256 :** ${hash}

---

## Synthèse de couverture
| Domaine | Thèmes couverts | Thèmes manquants | Taux |
|---|---|---|---|
${coverageRows}

---

## Détail par domaine
${domainSections}
---

## Points de suivi
${followUps}

---

*Document généré par IT Audit Interview Assistant v${data.app_version}*
*Toutes les assertions ont été validées par l'auditeur avant inclusion.*
`;
}

/** [EXP-03] Hash SHA-256 du contenu canonique (hash au placeholder). */
export async function computeCrHash(data: CrData, hasher: Sha256Hasher): Promise<string> {
  return hasher(renderMarkdown(data, HASH_PLACEHOLDER));
}

/**
 * ACC-03 : vérifie qu'un CR Markdown exporté correspond bien à son empreinte
 * embarquée (re-normalisation du champ hash puis recalcul).
 */
export async function verifyCrHash(markdownContent: string, hasher: Sha256Hasher): Promise<boolean> {
  const match = markdownContent.match(/- \*\*Hash SHA-256 :\*\* ([0-9a-f]{64})/);
  if (!match) return false;
  const embedded = match[1];
  const canonical = markdownContent.replace(embedded, HASH_PLACEHOLDER);
  return (await hasher(canonical)) === embedded;
}

/** Rendu DOCX du CR (même structure 11.3), retourné en base64 [EXP-01]. */
export async function renderDocx(data: CrData, hash: string): Promise<string> {
  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({ heading: level, children: [new TextRun(text)] });
  const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });
  const info = (label: string, value: string) =>
    new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun(value)] });
  const cell = (text: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun(text)] })] });

  const coverageTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: ['Domaine', 'Thèmes couverts', 'Thèmes manquants', 'Taux'].map(cell) }),
      ...DOMAINS.filter((d) => data.domains.includes(d)).map((domain) => {
        const stats = data.coverage.by_domain[domain];
        const covered = stats?.covered_themes ?? 0;
        const total = stats?.total_themes ?? 0;
        return new TableRow({
          children: [DOMAIN_LABELS[domain], `${covered}`, `${total - covered}`, `${stats?.percent ?? 0}%`].map(cell),
        });
      }),
    ],
  });

  const domainBlocks = detailDomains(data).flatMap((domain) => {
    const assertions = data.assertions_by_domain[domain] ?? [];
    const blocks: (Paragraph | Table)[] = [heading(DOMAIN_LABELS[domain], HeadingLevel.HEADING_2)];
    if (assertions.length === 0) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: 'Aucune assertion validée pour ce domaine.', italics: true })] }));
    } else {
      blocks.push(...assertions.map((a) => bullet(getEffectiveAssertionText(a))));
    }
    if (domain !== 'general') {
      blocks.push(new Paragraph({ children: [new TextRun({ text: 'Gaps identifiés :', bold: true })] }));
      const gaps = data.gaps_by_domain[domain] ?? [];
      if (gaps.length === 0) {
        blocks.push(new Paragraph({ children: [new TextRun({ text: 'Aucun gap identifié.', italics: true })] }));
      } else {
        blocks.push(...gaps.map((g) => bullet(`[${g.theme}] ${g.question_text} (${GAP_REASON_LABELS[g.reason]})`)));
      }
    }
    return blocks;
  });

  const document = new Document({
    sections: [
      {
        children: [
          heading("Compte Rendu d'Entretien IT", HeadingLevel.TITLE),
          heading('Informations de session', HeadingLevel.HEADING_1),
          info('Date', data.generated_at_iso),
          info('Durée', `${data.session.duration_min} minutes`),
          info('Type de mission', MISSION_LABELS[data.session.mission_type]),
          info('Application auditée', `${data.session.app_name} (${data.session.app_type})`),
          info('Profil interlocuteur', data.session.interlocutor),
          info('Domaines couverts', data.domains.map((d) => DOMAIN_LABELS[d]).join(', ')),
          info('Hash SHA-256', hash),
          heading('Synthèse de couverture', HeadingLevel.HEADING_1),
          coverageTable,
          heading('Détail par domaine', HeadingLevel.HEADING_1),
          ...domainBlocks,
          heading('Points de suivi', HeadingLevel.HEADING_1),
          ...(data.follow_ups.length > 0
            ? data.follow_ups.map(bullet)
            : [new Paragraph({ children: [new TextRun({ text: 'Aucun point de suivi défini.', italics: true })] })]),
          new Paragraph({
            children: [new TextRun({ text: `Document généré par IT Audit Interview Assistant v${data.app_version}`, italics: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Toutes les assertions ont été validées par l'auditeur avant inclusion.", italics: true })],
          }),
        ],
      },
    ],
  });

  return Packer.toBase64String(document);
}

function exportFilename(session: SessionRow, format: ExportFormat, now: number): string {
  const slug = session.app_name.normalize('NFD').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const date = new Date(now).toISOString().slice(0, 10);
  const extension = format === 'markdown' ? 'md' : format;
  return `CR_${slug || 'session'}_${date}.${extension}`;
}

/**
 * [EXP-01] Exporte le CR d'une session au format demandé, met à jour
 * sessions.hash_sha256 et passe la session en `exported` (transaction
 * [REL-03]). L'écriture fichier et le partage restent à la charge de l'UI
 * ([EXP-05] : AirDrop / email natif / stockage local uniquement).
 */
export async function exportSession(
  db: DbClient,
  sessionId: string,
  format: ExportFormat,
  hasher: Sha256Hasher,
  appVersion: string,
  now: number = Date.now()
): Promise<ExportResult> {
  if (format === 'pdf') {
    throw new Error("[EXP-01] L'export PDF est livré en Phase 3.");
  }
  const data = await assembleCrData(db, sessionId, appVersion, now);
  const hash = await computeCrHash(data, hasher);
  const content = format === 'markdown' ? renderMarkdown(data, hash) : await renderDocx(data, hash);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE sessions SET hash_sha256 = ?, status = 'exported', updated_at = ? WHERE id = ?`, [
      hash,
      now,
      sessionId,
    ]);
  });

  return {
    format,
    filename: exportFilename(data.session, format, now),
    content,
    encoding: format === 'markdown' ? 'utf8' : 'base64',
    hash_sha256: hash,
  };
}
