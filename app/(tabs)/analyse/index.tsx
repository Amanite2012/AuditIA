/**
 * Module 3 + 4 — Analyse post-session et export CR (sections 2.4, 2.5).
 * [ANAL-01] couverture finale · [ANAL-02] gaps · [ANAL-04] validation HITL
 * ACC-02 : export désactivé tant qu'une assertion n'est pas validée.
 * [EXP-01/02/03] export Markdown/DOCX horodaté + hashé.
 * [EXP-05] partage via canaux natifs uniquement.
 */
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssertionRow } from '../../../components/analyse/AssertionRow';
import { ChipSelector } from '../../../components/briefing/ChipSelector';
import { DOMAIN_SHORT_LABELS } from '../../../components/briefing/labels';
import { CoverageBar } from '../../../components/entretien/CoverageBar';
import { AppButton } from '../../../components/shared/AppButton';
import { useDb } from '../../../components/shared/DbProvider';
import { ScreenHeader } from '../../../components/shared/ScreenHeader';
import { SectionLabel } from '../../../components/shared/SectionLabel';
import { colors, fonts, fontSizes, radii, spacing } from '../../../components/shared/theme';
import {
  addAssertion,
  deleteAssertion,
  getExportGate,
  getFinalCoverage,
  listAssertions,
  listGaps,
  modifyAssertion,
  validateAssertion,
} from '../../../features/analysis/analysis.service';
import type { ExportGate, Gap } from '../../../features/analysis/analysis.types';
import { exportSession } from '../../../features/export/export.service';
import type { ExportFormat, Sha256Hasher } from '../../../features/export/export.types';
import type { SessionCoverage } from '../../../features/session/session.types';
import { useSessionStore } from '../../../store/session.store';
import { base64ToBytes } from '../../../utils/base64';
import { DOMAIN_LABELS, DOMAINS, type AssertionDomain, type CrAssertionRow, type Domain } from '../../../types';

const GAP_REASON_LABELS = {
  non_aborde: 'non abordé',
  a_approfondir: 'à approfondir',
  non_obtenu: 'non obtenu',
} as const;

/** Hash SHA-256 on-device via expo-crypto [EXP-03]. */
const hasher: Sha256Hasher = (content) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);

export default function AnalyseScreen(): React.ReactElement {
  // Section 8.1 : les données de session restent protégées à l'écran
  usePreventScreenCapture();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const config = useSessionStore((s) => s.config);

  const [coverage, setCoverage] = useState<SessionCoverage | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [assertions, setAssertions] = useState<CrAssertionRow[]>([]);
  const [gate, setGate] = useState<ExportGate>({ allowed: false, pending_count: 0, total_count: 0 });
  const [newAssertionText, setNewAssertionText] = useState('');
  const [newAssertionDomain, setNewAssertionDomain] = useState<AssertionDomain>('general');
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    if (!config) return;
    setCoverage(await getFinalCoverage(db, config.id));
    setGaps(await listGaps(db, config.id));
    setAssertions(await listAssertions(db, config.id));
    setGate(await getExportGate(db, config.id));
  }, [db, config]);

  // Recharge les données à chaque retour sur l'onglet (fin d'entretien, etc.)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (!config) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Aucune session à analyser</Text>
        <Text style={styles.emptyText}>Terminez d’abord un entretien pour préparer le compte rendu.</Text>
      </View>
    );
  }

  const addNewAssertion = async () => {
    const text = newAssertionText.trim();
    if (text.length === 0) return;
    await addAssertion(db, config.id, { domain: newAssertionDomain, text });
    setNewAssertionText('');
    await refresh();
  };

  const runExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      const appVersion = Constants.expoConfig?.version ?? '0.0.0';
      const result = await exportSession(db, config.id, format, hasher, appVersion);
      const file = new File(Paths.cache, result.filename);
      if (file.exists) file.delete();
      if (result.encoding === 'base64') {
        file.write(base64ToBytes(result.content));
      } else {
        file.write(result.content);
      }
      // [EXP-05] Partage via le sélecteur natif (email / stockage local).
      // Aucun envoi cloud n'est initié par l'application.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType:
            format === 'markdown'
              ? 'text/markdown'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: 'Partager le compte rendu',
        });
      } else {
        Alert.alert('Export terminé', `Fichier enregistré : ${result.filename}`);
      }
      await refresh();
    } catch (error) {
      Alert.alert('Export impossible', error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  const sessionDomains = DOMAINS.filter((d) => config.domains.includes(d));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader eyebrow="Module 3 · Post-session" title="Analyse" subtitle={config.app_name} />

      {/* [ANAL-01] Couverture finale par domaine */}
      <SectionLabel>Couverture finale</SectionLabel>
      <View style={styles.card}>
        {sessionDomains.map((domain: Domain, index) => {
          const stats = coverage?.by_domain[domain];
          return (
            <View key={domain} style={[styles.coverageRow, index > 0 && styles.coverageRowRule]}>
              <View style={styles.coverageHeader}>
                <Text style={styles.coverageDomain}>{DOMAIN_SHORT_LABELS[domain]}</Text>
                <Text style={styles.coverageValue}>
                  {stats ? `${stats.covered_themes}/${stats.total_themes} thèmes` : '—'}
                </Text>
              </View>
              <CoverageBar percent={stats?.percent ?? 0} label="" />
            </View>
          );
        })}
      </View>

      {/* [ANAL-02] Gaps */}
      <SectionLabel>{`Gaps identifiés (${gaps.length})`}</SectionLabel>
      <View style={styles.card}>
        {gaps.length === 0 && <Text style={styles.mutedText}>Aucun gap : tous les thèmes sont couverts.</Text>}
        {gaps.map((gap, index) => (
          <View key={`${gap.question_id}-${gap.reason}`} style={[styles.gapRow, index > 0 && styles.coverageRowRule]}>
            <Text style={styles.gapMeta}>
              {DOMAIN_SHORT_LABELS[gap.domain].toUpperCase()} ·{' '}
              <Text style={styles.gapReason}>{GAP_REASON_LABELS[gap.reason]}</Text>
            </Text>
            <Text style={styles.gapText}>{gap.question_text}</Text>
          </View>
        ))}
      </View>

      {/* [ANAL-04] Assertions — validation Human-in-the-Loop */}
      <SectionLabel>
        {`Assertions du CR (${gate.total_count - gate.pending_count}/${gate.total_count} validées)`}
      </SectionLabel>
      {assertions.map((assertion) => (
        <AssertionRow
          key={assertion.id}
          assertion={assertion}
          onValidate={() => void validateAssertion(db, assertion.id).then(refresh)}
          onModify={(text) => void modifyAssertion(db, assertion.id, text).then(refresh)}
          onDelete={() => void deleteAssertion(db, assertion.id).then(refresh)}
        />
      ))}

      <View style={styles.card}>
        <Text style={styles.mutedText}>Nouvelle assertion — déclaration factuelle de l’entretien</Text>
        <ChipSelector
          label="Domaine"
          options={[...sessionDomains, 'general'] as readonly AssertionDomain[]}
          optionLabels={DOMAIN_LABELS}
          selected={[newAssertionDomain]}
          onToggle={setNewAssertionDomain}
          required={false}
        />
        <TextInput
          style={styles.input}
          multiline
          value={newAssertionText}
          onChangeText={setNewAssertionText}
          placeholder="Ex. : la revue des habilitations est réalisée annuellement par…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Texte de la nouvelle assertion"
        />
        <AppButton label="Ajouter l’assertion" onPress={() => void addNewAssertion()} />
      </View>

      {/* ACC-02 : export désactivé tant que des assertions restent à valider */}
      <SectionLabel>Export du compte rendu</SectionLabel>
      {!gate.allowed && (
        <Text style={styles.warningText}>
          {gate.total_count === 0
            ? 'Ajoutez et validez au moins le contenu du CR avant export.'
            : `${gate.pending_count} assertion(s) restent à valider avant de pouvoir exporter.`}
        </Text>
      )}
      <View style={styles.exportRow}>
        <AppButton
          label="Exporter Markdown"
          variant="primary"
          style={styles.exportButton}
          disabled={!gate.allowed || exporting}
          onPress={() => void runExport('markdown')}
          testID="export-markdown"
        />
        <AppButton
          label="Exporter DOCX"
          variant="primary"
          style={styles.exportButton}
          disabled={!gate.allowed || exporting}
          onPress={() => void runExport('docx')}
          testID="export-docx"
        />
      </View>
      <Text style={styles.mutedText}>
        Partage limité aux canaux natifs (email, stockage local). Aucune donnée n’est envoyée vers un service cloud.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  coverageRow: {
    gap: spacing.sm,
  },
  coverageRowRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm + 2,
  },
  coverageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  coverageDomain: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
  },
  coverageValue: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontVariant: ['tabular-nums'],
  },
  gapRow: {
    gap: spacing.xs,
  },
  gapMeta: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    letterSpacing: 0.6,
  },
  gapReason: {
    color: colors.warningText,
    letterSpacing: 0,
  },
  gapText: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 25,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
  warningText: {
    color: colors.warningText,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    color: colors.text,
    fontSize: fontSizes.body,
    padding: spacing.sm + 2,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportButton: {
    flex: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSizes.title,
    fontFamily: fonts.display,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
});
