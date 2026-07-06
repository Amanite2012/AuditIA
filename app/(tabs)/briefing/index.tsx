/**
 * Module 1 — Briefing pré-session [BRIEF-01..05].
 * ACC-01 : le bouton de démarrage reste désactivé tant que la saisie est
 * incomplète. Sortie : session créée + arbre initialisé, navigation entretien.
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipSelector } from '../../../components/briefing/ChipSelector';
import {
  APP_TYPE_LABELS,
  DOMAIN_SHORT_LABELS,
  DURATION_LABELS,
  INTERLOCUTOR_LABELS,
  MISSION_TYPE_LABELS,
} from '../../../components/briefing/labels';
import { AppButton } from '../../../components/shared/AppButton';
import { LlmModeBadge } from '../../../components/shared/LlmModeBadge';
import { colors, fontSizes, spacing } from '../../../components/shared/theme';
import { validateSessionConfigInput } from '../../../features/briefing/briefing.service';
import type { SessionConfigInput } from '../../../features/briefing/briefing.types';
import { useSessionStore } from '../../../store/session.store';
import { useUiStore } from '../../../store/ui.store';
import {
  APP_TYPES,
  DOMAINS,
  DURATIONS,
  INTERLOCUTORS,
  MISSION_TYPES,
  type AppType,
  type Domain,
  type DurationMin,
  type InterlocutorType,
  type MissionType,
} from '../../../types';

export default function BriefingScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startNewSession = useSessionStore((s) => s.startNewSession);
  const llmMode = useUiStore((s) => s.llmMode);

  const [missionType, setMissionType] = useState<MissionType | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState<AppType | null>(null);
  const [interlocutor, setInterlocutor] = useState<InterlocutorType | null>(null);
  const [duration, setDuration] = useState<DurationMin | null>(null);
  const [starting, setStarting] = useState(false);

  const input: SessionConfigInput = useMemo(
    () => ({
      mission_type: missionType ?? undefined,
      domains: domains.length > 0 ? domains : undefined,
      app_name: appName || undefined,
      app_type: appType ?? undefined,
      interlocutor: interlocutor ?? undefined,
      duration_min: duration ?? undefined,
    }),
    [missionType, domains, appName, appType, interlocutor, duration]
  );

  // ACC-01 : démarrage impossible tant que [BRIEF-01..05] n'est pas complet
  const isValid = validateSessionConfigInput(input).length === 0;

  const toggleDomain = (domain: Domain) =>
    setDomains((current) =>
      current.includes(domain) ? current.filter((d) => d !== domain) : [...current, domain]
    );

  const start = async () => {
    setStarting(true);
    try {
      await startNewSession(input);
      router.push('/entretien');
    } catch (error) {
      Alert.alert('Démarrage impossible', error instanceof Error ? error.message : String(error));
    } finally {
      setStarting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Briefing pré-session</Text>
          <LlmModeBadge mode={llmMode} />
        </View>

        <ChipSelector
          label="Type de mission"
          options={MISSION_TYPES}
          optionLabels={MISSION_TYPE_LABELS}
          selected={missionType ? [missionType] : []}
          onToggle={setMissionType}
        />
        <ChipSelector
          label="Domaines ITGC (au moins un)"
          options={DOMAINS}
          optionLabels={DOMAIN_SHORT_LABELS}
          selected={domains}
          onToggle={toggleDomain}
        />
        <View style={styles.group}>
          <Text style={styles.label}>Application auditée *</Text>
          <TextInput
            style={styles.input}
            value={appName}
            onChangeText={setAppName}
            placeholder="Nom de l’application"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Nom de l’application auditée"
          />
        </View>
        <ChipSelector
          label="Type d’environnement"
          options={APP_TYPES}
          optionLabels={APP_TYPE_LABELS}
          selected={appType ? [appType] : []}
          onToggle={setAppType}
        />
        <ChipSelector
          label="Profil de l’interlocuteur"
          options={INTERLOCUTORS}
          optionLabels={INTERLOCUTOR_LABELS}
          selected={interlocutor ? [interlocutor] : []}
          onToggle={setInterlocutor}
        />
        <ChipSelector
          label="Durée estimée"
          options={DURATIONS}
          optionLabels={DURATION_LABELS}
          selected={duration ? [duration] : []}
          onToggle={setDuration}
        />

        <AppButton
          label={starting ? 'Préparation…' : 'Démarrer l’entretien'}
          variant="primary"
          disabled={!isValid || starting}
          onPress={() => void start()}
          accessibilityHint="Crée la session et ouvre l’écran d’entretien"
          testID="briefing-start"
        />
        {!isValid && (
          <Text style={styles.hint}>Renseignez tous les champs obligatoires (*) pour démarrer.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.title,
    fontWeight: '700',
  },
  group: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontSize: fontSizes.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
});
