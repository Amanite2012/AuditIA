/**
 * Tests couche IA — sélection de modèle (section 5.2, [DECISION-05/06])
 * et mode Phase 1.
 */
import { getCurrentLlmMode, getLlmAvailability, selectModelForRam } from './llm.client';

describe('Section 5.2 — sélection du modèle selon la RAM disponible', () => {
  it.each([
    [8, 'full', 'mistral-7b-instruct-q4_k_m'],
    [6, 'full', 'mistral-7b-instruct-q4_k_m'],
    [4, 'full', 'phi-3-mini-3.8b-q4_k_m'],
    [3.5, 'full', 'phi-3-mini-3.8b-q4_k_m'],
    [3, 'degraded', 'gemma-2b-instruct-q4_k_m'],
    [2.5, 'degraded', 'gemma-2b-instruct-q4_k_m'],
    [2, 'none', null],
  ] as const)('%s Go de RAM → mode %s, modèle %s', (ram, mode, model) => {
    expect(selectModelForRam(ram)).toEqual({ mode, model });
  });
});

describe('[DECISION-05] Phase 1 — arbre statique sans LLM', () => {
  it('le build Phase 1 déclare le mode none', () => {
    expect(getLlmAvailability()).toEqual({ mode: 'none', model: null });
    expect(getCurrentLlmMode()).toBe('none');
  });
});
