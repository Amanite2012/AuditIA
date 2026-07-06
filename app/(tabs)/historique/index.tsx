/**
 * Historique des sessions : reprise [REL-02], consultation et suppression
 * définitive (section 6.2 : pas de corbeille, suppression immédiate).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DOMAIN_SHORT_LABELS } from '../../../components/briefing/labels';
import { AppButton } from '../../../components/shared/AppButton';
import { useDb } from '../../../components/shared/DbProvider';
import { ScreenHeader } from '../../../components/shared/ScreenHeader';
import { colors, fonts, fontSizes, radii, spacing } from '../../../components/shared/theme';
import { deleteSession, listSessions } from '../../../features/session/session.service';
import { useSessionStore } from '../../../store/session.store';
import type { Domain, SessionRow, SessionStatus } from '../../../types';

const STATUS_LABELS: Record<SessionStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  completed: 'Terminée',
  exported: 'Exportée',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  draft: colors.textMuted,
  in_progress: colors.warningText,
  completed: colors.accentText,
  exported: colors.successText,
};

export default function HistoriqueScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDb();
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const activeConfig = useSessionStore((s) => s.config);

  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const refresh = useCallback(async () => {
    setSessions(await listSessions(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const open = async (session: SessionRow) => {
    await resumeSession(session);
    router.push(session.status === 'draft' || session.status === 'in_progress' ? '/entretien' : '/analyse');
  };

  const confirmDelete = (session: SessionRow) => {
    Alert.alert(
      'Suppression définitive',
      `Supprimer la session « ${session.app_name} » ? Cette action est immédiate et irréversible (pas de corbeille).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteSession(db, session.id);
              if (activeConfig?.id === session.id) clearSession();
              await refresh();
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <ScreenHeader eyebrow="Sessions sur l’appareil" title="Historique" />
      <FlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune session enregistrée sur cet appareil.</Text>}
        renderItem={({ item: session }) => {
          const domains = JSON.parse(session.domains) as Domain[];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.appName} numberOfLines={1}>
                  {session.app_name}
                </Text>
                <View style={[styles.statusPill, { borderColor: STATUS_COLORS[session.status] }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[session.status] }]}>
                    {STATUS_LABELS[session.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText}>
                {new Date(session.created_at).toLocaleDateString('fr-FR')} · {session.duration_min} min ·{' '}
                {domains.map((d) => DOMAIN_SHORT_LABELS[d]).join(', ')}
              </Text>
              {session.hash_sha256 && (
                <Text style={styles.hashText} numberOfLines={1}>
                  SHA-256 · {session.hash_sha256}
                </Text>
              )}
              <View style={styles.actions}>
                <AppButton
                  label={session.status === 'draft' || session.status === 'in_progress' ? 'Reprendre' : 'Consulter'}
                  variant="primary"
                  style={styles.actionFlex}
                  onPress={() => void open(session)}
                />
                <AppButton
                  label="Supprimer"
                  variant="danger"
                  style={styles.actionFlex}
                  onPress={() => confirmDelete(session)}
                />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSizes.large,
    fontFamily: fonts.display,
    fontWeight: '600',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  hashText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
});
