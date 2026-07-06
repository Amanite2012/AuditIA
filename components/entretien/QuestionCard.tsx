/**
 * Carte de question — [ENT-01] : la question courante est une SUGGESTION,
 * jamais une obligation. Affiche la condition parente (arbre décisionnel) et
 * les relances du référentiel.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreeQuestion } from '../../features/briefing/briefing.types';
import type { ItemStatus } from '../../types';
import { colors, fontSizes, spacing } from '../shared/theme';

interface QuestionCardProps {
  questionText: string;
  meta?: TreeQuestion;
  status: ItemStatus;
  position: string;
}

const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: 'À poser',
  couvert: 'Couvert',
  a_approfondir: 'À approfondir',
  non_obtenu: 'Non obtenu',
  skipped: 'Passée',
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: colors.textMuted,
  couvert: colors.success,
  a_approfondir: colors.warning,
  non_obtenu: colors.danger,
  skipped: colors.textMuted,
};

export function QuestionCard({ questionText, meta, status, position }: QuestionCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.suggestionLabel}>Question suggérée · {position}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
      </View>
      {meta?.parent && (
        <Text style={styles.condition}>Si : {meta.parent.condition}</Text>
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.question}>{questionText}</Text>
        {meta?.follow_up_questions && meta.follow_up_questions.length > 0 && (
          <View style={styles.followUps}>
            <Text style={styles.followUpTitle}>Relances possibles</Text>
            {meta.follow_up_questions.map((followUp) => (
              <Text key={followUp} style={styles.followUp}>
                – {followUp}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  status: {
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  condition: {
    color: colors.warning,
    fontSize: fontSizes.body,
    fontStyle: 'italic',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
  },
  question: {
    color: colors.text,
    fontSize: fontSizes.large,
    lineHeight: 30,
    fontWeight: '600',
  },
  followUps: {
    gap: spacing.xs,
  },
  followUpTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  followUp: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
});
