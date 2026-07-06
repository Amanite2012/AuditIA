/**
 * Client STT — interface whisper.cpp [ENT-04], livraison Phase 3.
 *
 * [INVARIANT-01] : la transcription sera intégralement on-device
 * (Whisper Small INT8, streaming par segments de 5 s — section 5.3).
 * Phase 1 : indisponible ; la saisie manuelle [ENT-05] reste le canal de
 * prise de notes.
 */
import type { SttAvailability } from './stt.types';

/** Disponibilité du STT pour ce build. */
export function getSttAvailability(): SttAvailability {
  return { available: false, reason: 'not_implemented_phase3' };
}
