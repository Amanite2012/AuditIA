/**
 * Patterns haptiques imposés — CDC section 7.3.
 * [DESIGN-03] Silent by default : le feedback principal est haptique.
 */
import * as Haptics from 'expo-haptics';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Question suivante : tap léger. */
export async function hapticNextQuestion(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Thème complété : double tap (50ms d'intervalle). */
export async function hapticThemeCompleted(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await sleep(50);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Gap détecté : vibration longue. */
export async function hapticGapDetected(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Suggestion LLM disponible : 3 taps légers (30ms d'intervalle) — Phase 2. */
export async function hapticLlmSuggestion(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (i < 2) await sleep(30);
  }
}

/** Fin de session : pattern long. */
export async function hapticSessionEnd(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
