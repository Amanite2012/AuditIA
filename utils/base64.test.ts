/** Tests utilitaire base64 (support de l'export DOCX [EXP-01]). */
import { base64ToBytes } from './base64';

describe('base64ToBytes', () => {
  it('décode un contenu encodé par Buffer (round-trip)', () => {
    const samples = ['', 'a', 'ab', 'abc', 'Compte Rendu — éàü 世界', 'PK\x03\x04binaire\x00\xff'];
    for (const sample of samples) {
      const encoded = Buffer.from(sample, 'binary').toString('base64');
      const decoded = base64ToBytes(encoded);
      expect(Buffer.from(decoded).toString('binary')).toBe(sample);
    }
  });

  it('tolère les sauts de ligne et le padding', () => {
    const encoded = 'UEsD\nBA==\n';
    const decoded = base64ToBytes(encoded);
    expect(Array.from(decoded)).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('rejette un caractère hors alphabet', () => {
    expect(() => base64ToBytes('AB$D')).toThrow('base64');
  });
});
