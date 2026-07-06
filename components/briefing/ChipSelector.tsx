/**
 * Sélecteur à puces pour les champs de briefing [BRIEF-01..05].
 * Composant UI pur : la sélection remonte par callback, aucune logique métier.
 * Puce sélectionnée : remplissage claret + ivoire (contraste 7:1).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionLabel } from '../shared/SectionLabel';
import { colors, fonts, fontSizes, radii, spacing } from '../shared/theme';

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
      <SectionLabel>{required ? `${label} *` : label}</SectionLabel>
      <View style={styles.chips}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={String(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(option)}
              style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.chipPressed]}
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
    gap: spacing.sm + 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg + 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipPressed: {
    opacity: 0.72,
  },
  chipText: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontFamily: fonts.text,
  },
  chipTextSelected: {
    color: colors.onAccent,
    fontFamily: fonts.medium,
  },
});
