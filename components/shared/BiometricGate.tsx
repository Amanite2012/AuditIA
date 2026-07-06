/**
 * Verrou biométrique obligatoire au démarrage — CDC section 8.1/8.2
 * (mitigation vol d'appareil, permission USE_BIOMETRIC).
 * Le repli sur le code de l'appareil (Keystore-backed) est autorisé ;
 * sans authentification réussie, l'application reste verrouillée.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';
import { colors, fontSizes, spacing } from './theme';

type GateState = 'checking' | 'locked' | 'unlocked' | 'unavailable';

export function BiometricGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<GateState>('checking');

  const authenticate = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    if (!hasHardware || (!enrolled && securityLevel === LocalAuthentication.SecurityLevel.NONE)) {
      setState('unavailable');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouiller Audit Interview Assistant',
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
    });
    setState(result.success ? 'unlocked' : 'locked');
  }, []);

  useEffect(() => {
    // L'authentification DOIT se déclencher à l'affichage du verrou (section
    // 8.1) ; les setState n'interviennent qu'après les réponses async de l'OS.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void authenticate();
  }, [authenticate]);

  if (state === 'unlocked') return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit Interview Assistant</Text>
      {state === 'checking' && <Text style={styles.message}>Authentification en cours…</Text>}
      {state === 'locked' && (
        <>
          <Text style={styles.message}>Authentification requise pour accéder aux données d’entretien.</Text>
          <AppButton
            label="Réessayer"
            variant="primary"
            onPress={() => {
              setState('checking');
              void authenticate();
            }}
          />
        </>
      )}
      {state === 'unavailable' && (
        <>
          <Text style={styles.message}>
            Aucun verrouillage d’appareil configuré. La biométrie ou un code de verrouillage est obligatoire pour
            protéger les données d’entretien (exigence de sécurité). Configurez-le dans les réglages Android puis
            relancez l’application.
          </Text>
          <AppButton
            label="Vérifier à nouveau"
            variant="primary"
            onPress={() => {
              setState('checking');
              void authenticate();
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.title,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
