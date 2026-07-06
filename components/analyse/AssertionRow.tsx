/**
 * Ligne d'assertion avec actions Valider / Modifier / Supprimer [ANAL-04].
 * Composant UI pur : les actions remontent par callbacks [DECISION-03].
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { DOMAIN_LABELS, type CrAssertionRow } from '../../types';
import { AppButton } from '../shared/AppButton';
import { colors, fontSizes, spacing } from '../shared/theme';

interface AssertionRowProps {
  assertion: CrAssertionRow;
  onValidate: () => void;
  onModify: (newText: string) => void;
  onDelete: () => void;
}

export function AssertionRow({ assertion, onValidate, onModify, onDelete }: AssertionRowProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const effectiveText = assertion.user_modified_text ?? assertion.assertion_text;
  const [draft, setDraft] = useState(effectiveText);
  const validated = assertion.validated_by_user === 1;

  return (
    <View style={[styles.card, validated ? styles.cardValidated : styles.cardPending]}>
      <View style={styles.headerRow}>
        <Text style={styles.domain}>{DOMAIN_LABELS[assertion.domain]}</Text>
        <Text style={[styles.state, { color: validated ? colors.success : colors.warning }]}>
          {validated ? 'Validée' : 'À valider'}
        </Text>
      </View>
      {editing ? (
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          accessibilityLabel="Modifier l’assertion"
        />
      ) : (
        <Text style={styles.text}>{effectiveText}</Text>
      )}
      <View style={styles.actions}>
        {editing ? (
          <>
            <AppButton
              label="Enregistrer"
              variant="primary"
              style={styles.action}
              onPress={() => {
                setEditing(false);
                if (draft.trim().length > 0 && draft !== effectiveText) onModify(draft.trim());
              }}
            />
            <AppButton label="Annuler" style={styles.action} onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            {!validated && <AppButton label="Valider" variant="success" style={styles.action} onPress={onValidate} />}
            <AppButton label="Modifier" style={styles.action} onPress={() => setEditing(true)} />
            <AppButton label="Supprimer" variant="danger" style={styles.action} onPress={onDelete} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPending: {
    borderColor: colors.warning,
  },
  cardValidated: {
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  domain: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  state: {
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  text: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
  input: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 24,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
