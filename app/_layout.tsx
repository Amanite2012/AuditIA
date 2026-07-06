/**
 * Layout racine : initialisation de la base chiffrée (SQLCipher), reprise de
 * session interrompue [REL-02], verrou biométrique (section 8) puis navigation.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BiometricGate } from '../components/shared/BiometricGate';
import { DbProvider } from '../components/shared/DbProvider';
import { colors, fontSizes } from '../components/shared/theme';
import { openEncryptedDatabase, type DbClient } from '../db/db.client';
import { resumeInterruptedSession } from '../features/session/session.service';
import { useSessionStore } from '../store/session.store';

export default function RootLayout(): React.ReactElement {
  const [db, setDb] = useState<DbClient | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const database = await openEncryptedDatabase();
        if (cancelled) return;
        useSessionStore.getState().initDb(database);
        // [REL-02] Reprise après crash : recharge la session in_progress
        const interrupted = await resumeInterruptedSession(database);
        if (interrupted) {
          await useSessionStore.getState().resumeSession(interrupted);
        }
        if (!cancelled) setDb(database);
      } catch (error) {
        if (!cancelled) setInitError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (initError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Erreur d’initialisation de la base : {initError}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Ouverture du stockage chiffré…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <BiometricGate>
        <DbProvider db={db}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </DbProvider>
      </BiometricGate>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
});
