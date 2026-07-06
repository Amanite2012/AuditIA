/**
 * Store Zustand — état UI transverse.
 * [ENT-08] mode silencieux (activable en un geste), section 7.4 mode haute
 * visibilité, [DECISION-05] mode LLM affiché en permanence.
 */
import { create } from 'zustand';

import { getCurrentLlmMode } from '../ai/llm/llm.client';
import type { LlmMode } from '../types';

interface UiState {
  /** [ENT-08] Interface réduite au minimum, feedback haptique uniquement. */
  silentMode: boolean;
  /** Section 7.4 : fond sombre, texte 20sp+. */
  highVisibility: boolean;
  /** Mode IA actif, affiché en permanence [DECISION-05]. */
  llmMode: LlmMode;

  toggleSilentMode: () => void;
  setSilentMode: (enabled: boolean) => void;
  toggleHighVisibility: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  silentMode: false,
  highVisibility: false,
  llmMode: getCurrentLlmMode(),

  toggleSilentMode: () => set((state) => ({ silentMode: !state.silentMode })),
  setSilentMode: (enabled) => set({ silentMode: enabled }),
  toggleHighVisibility: () => set((state) => ({ highVisibility: !state.highVisibility })),
}));
