/**
 * Module 2 — Entretien guidé (section 2.3).
 * [ENT-01] question = suggestion · [ENT-02] navigation par swipe
 * [ENT-05] notes manuelles · [ENT-06] couverture temps réel
 * [ENT-08] mode silencieux en un tap · [ENT-09] statuts persistés
 * [REL-01] autosave 30s · FLAG_SECURE actif en session (section 8.1)
 * [UX-CRIT-01] actions dans la zone de pouce.
 */
import { useRouter } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DOMAIN_SHORT_LABELS } from '../../../components/briefing/labels';
import { CoverageBar } from '../../../components/entretien/CoverageBar';
import { QuestionCard } from '../../../components/entretien/QuestionCard';
import { AppButton } from '../../../components/shared/AppButton';
import {
  hapticNextQuestion,
  hapticSessionEnd,
  hapticThemeCompleted,
} from '../../../components/shared/haptics';
import { LlmModeBadge } from '../../../components/shared/LlmModeBadge';
import { colors, fontSizes, spacing } from '../../../components/shared/theme';
import { AUTOSAVE_INTERVAL_MS } from '../../../features/session/session.service';
import { useSessionStore } from '../../../store/session.store';
import { useUiStore } from '../../../store/ui.store';
import type { ItemStatus } from '../../../types';

function formatElapsed(startedAt: number | null, nowMs: number): string {
  if (!startedAt) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function EntretienScreen(): React.ReactElement {
  // FLAG_SECURE : capture d'écran bloquée pendant la session (section 8.1)
  usePreventScreenCapture();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const config = useSessionStore((s) => s.config);
  const items = useSessionStore((s) => s.items);
  const questionMeta = useSessionStore((s) => s.questionMeta);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const coverage = useSessionStore((s) => s.coverage);
  const pendingAnswers = useSessionStore((s) => s.pendingAnswers);
  const sessionStartedAt = useSessionStore((s) => s.sessionStartedAt);
  const goNext = useSessionStore((s) => s.goNext);
  const goPrevious = useSessionStore((s) => s.goPrevious);
  const markStatus = useSessionStore((s) => s.markStatus);
  const setPendingAnswer = useSessionStore((s) => s.setPendingAnswer);
  const flushAutosave = useSessionStore((s) => s.flushAutosave);
  const finishSession = useSessionStore((s) => s.finishSession);

  const silentMode = useUiStore((s) => s.silentMode);
  const toggleSilentMode = useUiStore((s) => s.toggleSilentMode);
  const llmMode = useUiStore((s) => s.llmMode);

  const [now, setNow] = useState(Date.now());

  // Minuteur d'entretien (header 7.2), suspendu en mode silencieux
  useEffect(() => {
    if (!config || silentMode) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [config, silentMode]);

  // [REL-01] Autosave atomique toutes les 30 secondes en session active
  useEffect(() => {
    if (!config) return;
    const timer = setInterval(() => {
      void flushAutosave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      void flushAutosave();
    };
  }, [config, flushAutosave]);

  const currentItem = items[currentIndex];
  const meta = currentItem ? questionMeta[currentItem.question_id] : undefined;
  const currentDomain = meta?.domain;

  // [ENT-02] Swipe horizontal → question suivante ; swipe vertical → revenir
  const gesture = useMemo(() => {
    const flingNext = Gesture.Fling()
      .direction(Directions.LEFT + Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => {
        goNext();
        void hapticNextQuestion();
      });
    const flingBack = Gesture.Fling()
      .direction(Directions.UP + Directions.DOWN)
      .runOnJS(true)
      .onEnd(() => {
        goPrevious();
        void hapticNextQuestion();
      });
    return Gesture.Race(flingNext, flingBack);
  }, [goNext, goPrevious]);

  const mark = async (status: ItemStatus) => {
    await markStatus(status);
    if (status === 'couvert') {
      void hapticThemeCompleted();
    } else {
      void hapticNextQuestion();
    }
  };

  const endSession = async () => {
    await finishSession();
    void hapticSessionEnd();
    router.push('/analyse');
  };

  if (!config || !currentItem) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Aucune session en cours.</Text>
        <AppButton label="Aller au briefing" variant="primary" onPress={() => router.push('/briefing')} />
      </View>
    );
  }

  // [ENT-08] Mode silencieux : interface réduite au strict minimum,
  // navigation par swipe conservée, feedback haptique uniquement.
  if (silentMode) {
    return (
      <GestureDetector gesture={gesture}>
        <View style={styles.silentContainer}>
          <Text style={styles.silentQuestion}>{currentItem.question_text}</Text>
          <View style={styles.silentActions}>
            <AppButton label="Couvert" style={styles.actionFlex} onPress={() => void mark('couvert')} />
            <AppButton label="Suivant" style={styles.actionFlex} onPress={() => { goNext(); void hapticNextQuestion(); }} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={toggleSilentMode}
            style={styles.silentExit}
          >
            <Text style={styles.silentExitText}>Quitter le mode silencieux</Text>
          </Pressable>
        </View>
      </GestureDetector>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        {/* Header minimal (7.2) */}
        <View style={styles.header}>
          <Text style={styles.timer}>{formatElapsed(sessionStartedAt, now)} / {config.duration_min} min</Text>
          <LlmModeBadge mode={llmMode} />
        </View>

        <Text style={styles.domainLabel}>
          Domaine : {currentDomain ? DOMAIN_SHORT_LABELS[currentDomain] : '—'}
        </Text>
        {/* [ENT-06] Couverture temps réel */}
        <CoverageBar percent={coverage?.percent ?? 0} />

        {/* [ENT-01] + [ENT-02] Zone question, swipe actif */}
        <GestureDetector gesture={gesture}>
          <View style={styles.questionZone}>
            <QuestionCard
              questionText={currentItem.question_text}
              meta={meta}
              status={currentItem.status}
              position={`${currentIndex + 1}/${items.length}`}
            />
          </View>
        </GestureDetector>

        {/* [ENT-05] Notes en parallèle */}
        <TextInput
          style={styles.notes}
          multiline
          placeholder="Notes (autosauvegardées)"
          placeholderTextColor={colors.textMuted}
          value={pendingAnswers[currentItem.id] ?? currentItem.answer_text ?? ''}
          onChangeText={(text) => setPendingAnswer(currentItem.id, text)}
          accessibilityLabel="Notes sur la question courante"
        />

        {/* [ENT-09] + [UX-CRIT-01] Actions en zone de pouce */}
        <View style={styles.actionsRow}>
          <AppButton label="✓ Couvert" variant="success" style={styles.actionFlex} onPress={() => void mark('couvert')} testID="mark-couvert" />
          <AppButton label="→ Suivant" style={styles.actionFlex} onPress={() => { goNext(); void hapticNextQuestion(); }} testID="go-next" />
        </View>
        <View style={styles.actionsRow}>
          <AppButton label="À approfondir" variant="warning" style={styles.actionFlex} onPress={() => void mark('a_approfondir')} />
          <AppButton label="Non obtenu" variant="danger" style={styles.actionFlex} onPress={() => void mark('non_obtenu')} />
        </View>
        <View style={styles.actionsRow}>
          {/* [ENT-08] activable en un tap depuis l'écran principal */}
          <AppButton label="Mode silencieux" style={styles.actionFlex} onPress={toggleSilentMode} testID="silent-toggle" />
          <AppButton label="Terminer" variant="primary" style={styles.actionFlex} onPress={() => void endSession()} testID="end-session" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timer: {
    color: colors.text,
    fontSize: fontSizes.emphasis,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  domainLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  questionZone: {
    flex: 1,
    minHeight: 160,
  },
  notes: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontSize: fontSizes.body,
    padding: spacing.sm,
    minHeight: 64,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.emphasis,
  },
  silentContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  silentQuestion: {
    color: '#6B7280',
    fontSize: fontSizes.emphasis,
    lineHeight: 28,
  },
  silentActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  silentExit: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  silentExitText: {
    color: '#4B5563',
    fontSize: fontSizes.body,
  },
});
