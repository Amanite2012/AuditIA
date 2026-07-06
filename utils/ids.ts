/**
 * Génération d'identifiants — utilitaire pur (aucun side-effect).
 * Les UUID servent d'identifiants de lignes (schéma 4.4), pas de secrets.
 */

function randomBytes16(): Uint8Array {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/** Génère un UUID v4 (RFC 4122). */
export function generateUuidV4(): string {
  const bytes = randomBytes16();
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
