/** Types STT — [ENT-04], livraison Phase 3 (whisper.cpp on-device). */

export interface SttSegment {
  /** ms depuis le début de session (table transcripts, schéma 4.4). */
  segment_start: number;
  segment_end: number;
  raw_text: string;
  language: 'fr' | 'en';
}

export interface SttAvailability {
  available: boolean;
  /** Phase 1/2 : 'not_implemented_phase3'. */
  reason: string;
}
