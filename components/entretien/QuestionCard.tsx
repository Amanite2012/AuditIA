/**
 * Carte de question — [ENT-01] : la question courante est une SUGGESTION,
 * jamais une obligation. Question en serif (registre rapport d'audit),
 * condition parente et relances séparées par un filet fin.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreeQuestion } from '../../features/briefing/briefing.types';
import type { ItemStatus } from '../../types';
import { colors, eyebrowLetterSpacing, fonts, fontSizes, radii, spacing } from '../shared/theme';

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
  couvert: colors.successText,
  a_approfondir: colors.warningText,
  non_obtenu: colors.dangerText,
  skipped: colors.textMuted,
};

export function QuestionCard({ questionText, meta, status, position }: QuestionCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>QUESTION SUGGÉRÉE · {position}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
      </View>
      {meta?.parent && <Text style={styles.condition}>Si : {meta.parent.condition}</Text>}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.question}>{questionText}</Text>
        {meta?.follow_up_questions && meta.follow_up_questions.length > 0 && (
          <View style={styles.followUps}>
            <View style={styles.rule} />
            <Text style={styles.followUpTitle}>RELANCES</Text>
            {meta.follow_up_questions.map((followUp) => (
              <Text key={followUp} style={styles.followUp}>
                –  {followUp}
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md + 4,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    letterSpacing: eyebrowLetterSpacing,
    flexShrink: 1,
  },
  status: {
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
  },
  condition: {
    color: colors.warningText,
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
    lineHeight: 33,
    fontFamily: fonts.display,
  },
  followUps: {
    gap: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  followUpTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    letterSpacing: eyebrowLetterSpacing,
  },
  followUp: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    lineHeight: 25,
  },
});
