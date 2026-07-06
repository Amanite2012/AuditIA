/**
 * Décodage base64 → octets — utilitaire pur (export DOCX [EXP-01]).
 * Implémentation locale : pas de dépendance à atob/Buffer selon le runtime.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const REVERSE = new Map<string, number>(ALPHABET.split('').map((char, index) => [char, index]));

/** Décode une chaîne base64 (avec ou sans padding) en octets. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[\r\n=]/g, '');
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = REVERSE.get(char);
    if (value === undefined) {
      throw new Error(`Caractère base64 invalide : "${char}"`);
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(output);
}
