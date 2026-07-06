/**
 * Sélecteur à puces pour les champs de briefing [BRIEF-01..05].
 * Composant UI pur : la sélection remonte par callback, aucune logique métier.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing, touchTargetMinHeight } from '../shared/theme';

interface ChipSelectorProps<T extends string | number> {
  label: string;
  options: readonly T[];
  optionLabels: Record<T, string>;
  selected: readonly T[];
  onToggle: (value: T) => void;
  required?: boolean;
}

export function ChipSelector<T extends string | number>({
  label,
  options,
  optionLabels,
  selected,
  onToggle,
  required = true,
}: ChipSelectorProps<T>): React.ReactElement {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={String(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{optionLabels[option]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: touchTargetMinHeight - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: fontSizes.body,
  },
  chipTextSelected: {
    color: '#0B1220',
    fontWeight: '600',
  },
});
